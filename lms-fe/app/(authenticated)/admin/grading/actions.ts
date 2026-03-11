"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { calculateScore, normalizeEvaluationItems } from "@/lib/utils/grading"
import type {
  EvaluationState,
  GradingResultData,
} from "@/lib/types/grading"

// ---- 型定義 ----

interface SaveDraftInput {
  submissionId: string
  evaluations: EvaluationState
  feedbackComment: string
}

interface SaveDraftResult {
  success: boolean
  message: string
}

interface FinalizeGradingInput {
  submissionId: string
  evaluations: EvaluationState
  feedbackComment: string
}

interface FinalizeGradingResult {
  success: boolean
  message: string
  score?: number
}

// ---- 共通ヘルパー ----

async function verifySuperAdmin(): Promise<
  { userId: string } | { error: { success: false; message: string } }
> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      error: {
        success: false,
        message: "認証されていません。再度ログインしてください。",
      },
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return {
      error: {
        success: false,
        message: "ユーザー情報の取得に失敗しました。",
      },
    }
  }

  if (profile.role !== "super_admin") {
    return {
      error: {
        success: false,
        message: "この操作を行う権限がありません。",
      },
    }
  }

  return { userId: user.id }
}

// ---- Server Actions ----

/**
 * 下書き保存 Server Action
 *
 * 現在のチェック状態とフィードバックコメントを project_evaluations / project_evaluation_details に UPSERT する。
 * submission.status は grading のまま維持する。
 */
export async function saveDraft(
  input: SaveDraftInput
): Promise<SaveDraftResult> {
  // 認証・権限チェック
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  const adminClient = createAdminClient()

  // submission の status 確認
  const { data: submission, error: submissionError } = await adminClient
    .from("project_submissions")
    .select("status")
    .eq("id", input.submissionId)
    .single()

  if (submissionError || !submission) {
    return { success: false, message: "提出物が見つかりません。" }
  }

  if (submission.status !== "grading") {
    return {
      success: false,
      message: "この提出物は採点中ではありません。",
    }
  }

  // project_evaluations UPSERT
  const { data: evalData, error: evalError } = await adminClient
    .from("project_evaluations")
    .upsert(
      {
        submission_id: input.submissionId,
        grader_id: authResult.userId,
        status: "draft" as const,
        feedback_comment: input.feedbackComment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "submission_id" }
    )
    .select("id")
    .eq("submission_id", input.submissionId)

  if (evalError || !evalData || evalData.length === 0) {
    console.error("saveDraft: evaluation upsert error", evalError?.message)
    return {
      success: false,
      message: "下書き保存に失敗しました。もう一度お試しください。",
    }
  }

  const evaluationId = evalData[0].id

  // project_evaluation_details UPSERT
  // まず既存の全 details を構築
  const detailRows = Object.entries(input.evaluations).map(
    ([itemId, isOk]) => ({
      evaluation_id: evaluationId,
      item_id: itemId,
      category_large: "",
      category_medium: "",
      item_label: "",
      point: 0,
      is_ok: isOk,
    })
  )

  if (detailRows.length > 0) {
    const { error: detailsError } = await adminClient
      .from("project_evaluation_details")
      .upsert(detailRows, {
        onConflict: "evaluation_id,item_id",
      })

    if (detailsError) {
      console.error(
        "saveDraft: evaluation details upsert error",
        detailsError.message
      )
      return {
        success: false,
        message: "評価詳細の保存に失敗しました。もう一度お試しください。",
      }
    }
  }

  return { success: true, message: "下書きを保存しました。" }
}

/**
 * 採点確定 Server Action
 *
 * サーバーサイドでスコアを再計算し、finalize_grading RPC を呼び出す。
 * 全項目未評価の場合はエラー。
 */
export async function finalizeGrading(
  input: FinalizeGradingInput
): Promise<FinalizeGradingResult> {
  // 認証・権限チェック
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  const adminClient = createAdminClient()

  // submission と evaluation_items を取得
  const { data: submission, error: submissionError } = await adminClient
    .from("project_submissions")
    .select(
      `
      status,
      assignment_id,
      project_assignments!inner (
        mock_projects!inner (
          evaluation_items
        )
      )
    `
    )
    .eq("id", input.submissionId)
    .single()

  if (submissionError || !submission) {
    return { success: false, message: "提出物が見つかりません。" }
  }

  // 型変換
  type SubmissionWithProject = {
    status: string
    assignment_id: string
    project_assignments: {
      mock_projects: {
        evaluation_items: unknown[]
      }
    }
  }

  const typedSubmission = submission as unknown as SubmissionWithProject

  if (typedSubmission.status !== "grading") {
    return {
      success: false,
      message: "この提出物は採点中ではありません。",
    }
  }

  // 全項目未評価チェック
  const hasAnyEvaluation = Object.values(input.evaluations).some(
    (v) => v === true || v === false
  )
  if (!hasAnyEvaluation) {
    return {
      success: false,
      message: "1項目以上の評価が必要です。",
    }
  }

  // サーバーサイドでスコア再計算（旧形式の自動変換に対応）
  const categories = normalizeEvaluationItems(
    typedSubmission.project_assignments.mock_projects.evaluation_items
  )
  const scoreResult = calculateScore(categories, input.evaluations)

  // result_data を構築
  const resultData: GradingResultData = {
    evaluations: input.evaluations,
    categoryScores: scoreResult.categoryScores.map((cs) => ({
      categoryLarge: cs.categoryLarge,
      earnedPoints: cs.earnedPoints,
      totalPoints: cs.totalPoints,
      percentage: cs.percentage,
    })),
  }

  // 評価データを下書きとして保存 (UPSERT project_evaluations)
  // RPC がトランザクション内で draft -> finalized に更新するため、ここでは draft で保存
  const { data: evalData, error: evalError } = await adminClient
    .from("project_evaluations")
    .upsert(
      {
        submission_id: input.submissionId,
        grader_id: authResult.userId,
        status: "draft" as const,
        score: scoreResult.totalScore,
        feedback_comment: input.feedbackComment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "submission_id" }
    )
    .select("id")
    .eq("submission_id", input.submissionId)

  if (evalError || !evalData || evalData.length === 0) {
    console.error(
      "finalizeGrading: evaluation upsert error",
      evalError?.message
    )
    return {
      success: false,
      message: "採点確定に失敗しました。もう一度お試しください。",
    }
  }

  const evaluationId = evalData[0].id

  // evaluation_details を保存
  const allItems: {
    evaluation_id: string
    item_id: string
    category_large: string
    category_medium: string
    item_label: string
    point: number
    is_ok: boolean
  }[] = []

  for (const cat of categories) {
    for (const item of cat.items) {
      allItems.push({
        evaluation_id: evaluationId,
        item_id: item.id,
        category_large: cat.category_large,
        category_medium: cat.category_medium,
        item_label: item.label,
        point: item.point,
        is_ok: input.evaluations[item.id] === true,
      })
    }
  }

  if (allItems.length > 0) {
    const { error: detailsError } = await adminClient
      .from("project_evaluation_details")
      .upsert(allItems, {
        onConflict: "evaluation_id,item_id",
      })

    if (detailsError) {
      console.error(
        "finalizeGrading: details upsert error",
        detailsError.message
      )
    }
  }

  // finalize_grading RPC を呼び出し（RPC 内で draft -> finalized + grading -> graded をトランザクション実行）
  const { data: rpcResult, error: rpcError } = await adminClient.rpc(
    "finalize_grading",
    {
      p_submission_id: input.submissionId,
      p_score: scoreResult.totalScore,
      p_result_data: resultData as unknown as Record<string, unknown>,
      p_feedback_comment: input.feedbackComment,
    }
  )

  if (rpcError) {
    console.error("finalizeGrading: RPC error", rpcError.message)

    // 不正なステータス遷移のエラーハンドリング
    if (rpcError.message.includes("INVALID_STATUS_TRANSITION")) {
      return {
        success: false,
        message: "この提出物は既に採点確定済みです。",
      }
    }

    return {
      success: false,
      message: "採点確定に失敗しました。もう一度お試しください。",
    }
  }

  // 関連ページのキャッシュ更新
  revalidatePath("/admin/grading")
  revalidatePath(`/admin/grading/${input.submissionId}`)
  revalidatePath("/users/skill-report")

  return {
    success: true,
    message: "採点を確定しました。",
    score: scoreResult.totalScore,
  }
}

/**
 * 再提出依頼 Server Action
 *
 * grading / graded の submission を rejected に変更し、受講生に再提出を依頼する。
 * evaluations / feedbackComment が渡された場合（採点フォームからの差し戻し）は
 * 評価データを保存してから rejected にする。
 */

interface RequestResubmissionInput {
  submissionId: string
  evaluations?: EvaluationState
  feedbackComment?: string
}

export async function requestResubmission(
  input: RequestResubmissionInput
): Promise<{ success: boolean; message: string }> {
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  const adminClient = createAdminClient()

  const { data: submission, error: submissionError } = await adminClient
    .from("project_submissions")
    .select(
      `
      status,
      assignment_id,
      project_assignments!inner (
        mock_projects!inner (
          evaluation_items
        )
      )
    `
    )
    .eq("id", input.submissionId)
    .single()

  if (submissionError || !submission) {
    return { success: false, message: "提出物が見つかりません。" }
  }

  type SubmissionWithProject = {
    status: string
    assignment_id: string
    project_assignments: {
      mock_projects: {
        evaluation_items: unknown[]
      }
    }
  }

  const typedSubmission = submission as unknown as SubmissionWithProject

  if (
    typedSubmission.status !== "graded" &&
    typedSubmission.status !== "grading"
  ) {
    return {
      success: false,
      message: "採点中または採点確定済みの提出物のみ再提出を依頼できます。",
    }
  }

  // 採点フォームからの差し戻し: 評価データを保存
  if (input.evaluations) {
    const categories = normalizeEvaluationItems(
      typedSubmission.project_assignments.mock_projects.evaluation_items
    )
    const scoreResult = calculateScore(categories, input.evaluations)

    // project_evaluations UPSERT (finalized として保存)
    const { data: evalData, error: evalError } = await adminClient
      .from("project_evaluations")
      .upsert(
        {
          submission_id: input.submissionId,
          grader_id: authResult.userId,
          status: "finalized" as const,
          score: scoreResult.totalScore,
          feedback_comment: input.feedbackComment ?? "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "submission_id" }
      )
      .select("id")
      .eq("submission_id", input.submissionId)

    if (evalError || !evalData || evalData.length === 0) {
      console.error(
        "requestResubmission: evaluation upsert error",
        evalError?.message
      )
      return {
        success: false,
        message: "評価データの保存に失敗しました。もう一度お試しください。",
      }
    }

    const evaluationId = evalData[0].id

    // evaluation_details を保存
    const allItems: {
      evaluation_id: string
      item_id: string
      category_large: string
      category_medium: string
      item_label: string
      point: number
      is_ok: boolean
    }[] = []

    for (const cat of categories) {
      for (const item of cat.items) {
        allItems.push({
          evaluation_id: evaluationId,
          item_id: item.id,
          category_large: cat.category_large,
          category_medium: cat.category_medium,
          item_label: item.label,
          point: item.point,
          is_ok: input.evaluations[item.id] === true,
        })
      }
    }

    if (allItems.length > 0) {
      const { error: detailsError } = await adminClient
        .from("project_evaluation_details")
        .upsert(allItems, {
          onConflict: "evaluation_id,item_id",
        })

      if (detailsError) {
        console.error(
          "requestResubmission: details upsert error",
          detailsError.message
        )
      }
    }

    // submission にもスコアとフィードバックを反映
    const { error: updateError } = await adminClient
      .from("project_submissions")
      .update({
        status: "rejected",
        score: scoreResult.totalScore,
        feedback_comment: input.feedbackComment ?? "",
      })
      .eq("id", input.submissionId)

    if (updateError) {
      console.error("requestResubmission: update error", updateError.message)
      return {
        success: false,
        message: "再提出依頼に失敗しました。もう一度お試しください。",
      }
    }
  } else {
    // graded からの差し戻し: ステータスのみ変更
    const { error: updateError } = await adminClient
      .from("project_submissions")
      .update({ status: "rejected" })
      .eq("id", input.submissionId)

    if (updateError) {
      console.error("requestResubmission: update error", updateError.message)
      return {
        success: false,
        message: "再提出依頼に失敗しました。もう一度お試しください。",
      }
    }
  }

  revalidatePath("/admin/grading")
  revalidatePath(`/admin/grading/${input.submissionId}`)

  return { success: true, message: "再提出を依頼しました。" }
}
