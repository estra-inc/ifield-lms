"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { monthlyGoalSchema, weeklyGoalSchema } from "@/lib/validations/goals"
import type { ActionResult } from "@/lib/validations/auth"

/**
 * 月次目標 UPSERT Server Action
 *
 * 認証済みユーザーの月次目標を monthly_goals テーブルに UPSERT する。
 * (user_id, year_month) の複合 UNIQUE 制約を利用した ON CONFLICT 動作。
 * user_id はサーバーサイドで auth.getUser() から取得する。
 */
export async function upsertMonthlyGoal(
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
    year_month: formData.get("year_month") as string,
    target_hours: Number(formData.get("target_hours")),
  }

  const validated = monthlyGoalSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // UPSERT（user_id はサーバーサイドで設定）
  const { error } = await supabase.from("monthly_goals").upsert(
    {
      user_id: user.id,
      year_month: validated.data.year_month,
      target_hours: validated.data.target_hours,
    },
    { onConflict: "user_id,year_month" }
  )

  if (error) {
    console.error("upsertMonthlyGoal error:", error.message)
    return {
      success: false,
      message: "月次目標の保存に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/goals")
  return {
    success: true,
    message: "月次目標を保存しました。",
  }
}

/**
 * 週次目標 UPSERT Server Action
 *
 * 認証済みユーザーの週次目標を weekly_goals テーブルに UPSERT する。
 * (user_id, start_date) の複合 UNIQUE 制約を利用した ON CONFLICT 動作。
 * start_date / end_date は UI の週セレクターにより月曜日/日曜日が保証される。
 * user_id はサーバーサイドで auth.getUser() から取得する。
 */
export async function upsertWeeklyGoal(
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
    start_date: formData.get("start_date") as string,
    end_date: formData.get("end_date") as string,
    target_hours: Number(formData.get("target_hours")),
  }

  const validated = weeklyGoalSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // UPSERT（user_id はサーバーサイドで設定）
  const { error } = await supabase.from("weekly_goals").upsert(
    {
      user_id: user.id,
      start_date: validated.data.start_date,
      end_date: validated.data.end_date,
      target_hours: validated.data.target_hours,
    },
    { onConflict: "user_id,start_date" }
  )

  if (error) {
    console.error("upsertWeeklyGoal error:", error.message)
    return {
      success: false,
      message: "週次目標の保存に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/goals")
  return {
    success: true,
    message: "週次目標を保存しました。",
  }
}
