import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  User,
  FileText,
} from "lucide-react"
import type { EvaluationState } from "@/lib/types/grading"
import { normalizeEvaluationItems } from "@/lib/utils/grading"
import { ChecklistForm } from "./_components/checklist-form"
import { ResubmissionButton } from "./_components/resubmission-button"
import { GradedResultView } from "@/components/grading/graded-result-view"

interface PageProps {
  params: Promise<{
    submissionId: string
  }>
}

export default async function GradingPage({ params }: PageProps) {
  const { submissionId } = await params

  // --- 認証・権限チェック ---
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  // --- データフェッチ ---
  const adminClient = createAdminClient()

  // submission + assignment + project を取得
  const { data: submission, error: submissionError } = await adminClient
    .from("project_submissions")
    .select(
      `
      id,
      github_url,
      status,
      score,
      feedback_comment,
      created_at,
      assignment_id,
      project_assignments!inner (
        id,
        user_id,
        profiles!inner (
          full_name
        ),
        mock_projects!inner (
          title,
          evaluation_items,
          genre
        )
      )
    `
    )
    .eq("id", submissionId)
    .single()

  if (submissionError || !submission) {
    redirect("/admin/grading")
  }

  // 型変換
  type SubmissionData = {
    id: string
    github_url: string
    status: string
    score: number | null
    feedback_comment: string | null
    created_at: string
    assignment_id: string
    project_assignments: {
      id: string
      user_id: string
      profiles: { full_name: string | null }
      mock_projects: {
        title: string
        evaluation_items: unknown[]
        genre: string
      }
    }
  }

  const typedSubmission = submission as unknown as SubmissionData
  const assignment = typedSubmission.project_assignments
  const studentName = assignment.profiles.full_name ?? "名前未設定"
  const projectTitle = assignment.mock_projects.title
  const githubUrl = typedSubmission.github_url
  const categories = normalizeEvaluationItems(
    assignment.mock_projects.evaluation_items as unknown[]
  )

  const isGraded = typedSubmission.status === "graded"

  // --- graded 済み: 採点結果表示 + 再提出依頼ボタン ---
  if (isGraded) {
    // finalized の evaluation_details を取得
    let gradedEvaluations: EvaluationState = {}
    const { data: evaluation } = await adminClient
      .from("project_evaluations")
      .select("id")
      .eq("submission_id", submissionId)
      .eq("status", "finalized")
      .single()

    if (evaluation) {
      const { data: details } = await adminClient
        .from("project_evaluation_details")
        .select("item_id, is_ok")
        .eq("evaluation_id", evaluation.id)

      if (details) {
        for (const d of details) {
          gradedEvaluations[d.item_id] = d.is_ok
        }
      }
    }

    return (
      <div className="flex flex-col gap-6 px-8 py-6">
        <Link
          href="/admin/grading"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          未採点一覧に戻る
        </Link>

        {/* 提出物情報 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">採点結果</CardTitle>
              <Badge variant="default">採点完了</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">受講生:</span>
              <span>{studentName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">案件:</span>
              <span>{projectTitle}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">GitHub:</span>
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                {githubUrl}
              </a>
            </div>
          </CardContent>
        </Card>

        {/* 採点結果詳細 */}
        <GradedResultView
          status="graded"
          score={typedSubmission.score}
          feedbackComment={typedSubmission.feedback_comment}
          categories={categories}
          evaluations={gradedEvaluations}
        />

        {/* 再提出依頼ボタン */}
        <div className="flex justify-end">
          <ResubmissionButton submissionId={submissionId} />
        </div>
      </div>
    )
  }

  // --- submitted / grading: 採点フォーム ---

  // 警告: 既に grading 中の場合
  const wasAlreadyGrading = typedSubmission.status === "grading"

  // ステータスを grading に更新
  if (typedSubmission.status === "submitted") {
    await adminClient
      .from("project_submissions")
      .update({ status: "grading" })
      .eq("id", submissionId)
  }

  // 既存の下書きデータを取得
  const { data: existingEvaluation } = await adminClient
    .from("project_evaluations")
    .select("id, status, feedback_comment, score")
    .eq("submission_id", submissionId)
    .single()

  let initialEvaluations: EvaluationState = {}
  let initialFeedbackComment = ""
  let isDraft = false

  if (existingEvaluation && existingEvaluation.status === "draft") {
    isDraft = true
    initialFeedbackComment = existingEvaluation.feedback_comment ?? ""

    // 下書きの評価詳細を取得
    const { data: details } = await adminClient
      .from("project_evaluation_details")
      .select("item_id, is_ok")
      .eq("evaluation_id", existingEvaluation.id)

    if (details) {
      for (const detail of details) {
        initialEvaluations[detail.item_id] = detail.is_ok
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      {/* 戻るリンク */}
      <Link
        href="/admin/grading"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        未採点一覧に戻る
      </Link>

      {/* 警告: 既に grading 中 */}
      {wasAlreadyGrading && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              この提出物は既に採点中です。他の採点者が作業中の可能性があります。続行する場合は注意してください。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 提出物情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">採点対象</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">受講生:</span>
            <span>{studentName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">案件:</span>
            <span>{projectTitle}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">GitHub:</span>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {githubUrl}
            </a>
          </div>
          {isDraft && (
            <Badge
              variant="outline"
              className="w-fit border-blue-500/50 text-blue-600"
            >
              下書き復元済み
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* チェックリストフォーム */}
      <ChecklistForm
        submissionId={submissionId}
        studentName={studentName}
        projectTitle={projectTitle}
        githubUrl={githubUrl}
        categories={categories}
        initialEvaluations={initialEvaluations}
        initialFeedbackComment={initialFeedbackComment}
        isDraft={isDraft}
      />
    </div>
  )
}
