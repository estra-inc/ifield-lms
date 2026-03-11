"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { dailyReportSchema } from "@/lib/validations/daily-reports"
import type { ActionResult } from "@/lib/validations/auth"

/**
 * 日報作成 Server Action
 *
 * 認証済みユーザーの日報を daily_reports テーブルに INSERT する。
 * user_id はサーバーサイドで auth.getUser() から取得し、
 * クライアントからの指定は受け付けない。
 */
export async function createDailyReport(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // バリデーション
  const rawData = {
    report_date: formData.get("report_date") as string,
    actual_hours: Number(formData.get("actual_hours")),
    content: formData.get("content") as string,
  }

  const validated = dailyReportSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // DB INSERT（user_id はサーバーサイドで設定）
  const { error } = await supabase.from("daily_reports").insert({
    user_id: user.id,
    report_date: validated.data.report_date,
    actual_hours: validated.data.actual_hours,
    content: validated.data.content,
  })

  if (error) {
    console.error("createDailyReport error:", error.message)
    return {
      success: false,
      message: "日報の保存に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/reports")
  return {
    success: true,
    message: "日報を保存しました。",
  }
}

/**
 * いいねトグル Server Action（Manager 専用）
 *
 * Manager ロールであることをサーバーサイドで検証し、
 * daily_reports テーブルの liked_by_manager カラムのみを反転 UPDATE する。
 */
export async function toggleLike(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // Manager ロール検証
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return {
      success: false,
      message: "ユーザー情報の取得に失敗しました。",
    }
  }

  if (profile.role !== "manager") {
    return {
      success: false,
      message: "この操作を行う権限がありません。",
    }
  }

  // liked_by_manager のトグル（カラム限定更新）
  const reportId = formData.get("reportId") as string
  const currentLiked = formData.get("liked") === "true"

  const { error } = await supabase
    .from("daily_reports")
    .update({ liked_by_manager: !currentLiked })
    .eq("id", reportId)

  if (error) {
    console.error("toggleLike error:", error.message)
    return {
      success: false,
      message: "いいねの更新に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/reports")
  revalidatePath("/manager/reports")
  revalidatePath("/manager/reports/table")
  return {
    success: true,
    message: currentLiked ? "いいねを取り消しました。" : "いいねしました。",
  }
}

/**
 * 日報更新 Server Action
 *
 * 認証済みユーザーが自分の日報を更新する。
 * user_id の一致をアプリレベルでも検証し、RLS と二重チェックする。
 */
export async function updateDailyReport(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  const reportId = formData.get("reportId") as string
  if (!reportId) {
    return {
      success: false,
      message: "日報IDが指定されていません。",
    }
  }

  const rawData = {
    report_date: formData.get("report_date") as string,
    actual_hours: Number(formData.get("actual_hours")),
    content: formData.get("content") as string,
  }

  const validated = dailyReportSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  const { data, error } = await supabase
    .from("daily_reports")
    .update({
      report_date: validated.data.report_date,
      actual_hours: validated.data.actual_hours,
      content: validated.data.content,
    })
    .eq("id", reportId)
    .eq("user_id", user.id)
    .select()

  if (error) {
    console.error("updateDailyReport error:", error.message)
    return {
      success: false,
      message: "日報の更新に失敗しました。もう一度お試しください。",
    }
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      message: "日報の更新に失敗しました。対象の日報が見つからないか、権限がありません。",
    }
  }

  revalidatePath("/reports")
  revalidatePath("/reports/list")
  return {
    success: true,
    message: "日報を更新しました。",
  }
}

/**
 * 日報削除 Server Action
 *
 * 認証済みユーザーが自分の日報を削除する。
 * user_id の一致をアプリレベルでも検証し、RLS と二重チェックする。
 */
export async function deleteDailyReport(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  const reportId = formData.get("reportId") as string
  if (!reportId) {
    return {
      success: false,
      message: "日報IDが指定されていません。",
    }
  }

  const { data, error } = await supabase
    .from("daily_reports")
    .delete()
    .eq("id", reportId)
    .eq("user_id", user.id)
    .select()

  if (error) {
    console.error("deleteDailyReport error:", error.message)
    return {
      success: false,
      message: "日報の削除に失敗しました。もう一度お試しください。",
    }
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      message: "日報の削除に失敗しました。対象の日報が見つからないか、権限がありません。",
    }
  }

  revalidatePath("/reports")
  revalidatePath("/reports/list")
  return {
    success: true,
    message: "日報を削除しました。",
  }
}
