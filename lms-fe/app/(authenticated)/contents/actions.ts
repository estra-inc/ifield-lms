"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/validations/auth"

/**
 * 読了記録の結果型
 */
export interface MarkAsReadResult {
  success: boolean
  message: string
  alreadyCompleted?: boolean
}

/**
 * markAsRead Server Action
 *
 * 読了記録を content_progress テーブルに INSERT する。
 * 既に読了済みの場合は alreadyCompleted: true を返却し、重複記録を防止する。
 */
export async function markAsRead(
  _prevState: MarkAsReadResult | null,
  formData: FormData
): Promise<MarkAsReadResult> {
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

  const contentId = formData.get("contentId") as string
  if (!contentId) {
    return {
      success: false,
      message: "コンテンツIDが指定されていません。",
    }
  }

  // 既存レコードの確認（重複防止）
  const { data: existing } = await supabase
    .from("content_progress")
    .select("id")
    .eq("user_id", user.id)
    .eq("content_id", contentId)
    .single()

  if (existing) {
    return {
      success: true,
      message: "このセクションは既に読了済みです。",
      alreadyCompleted: true,
    }
  }

  // 読了記録の INSERT
  const { error: insertError } = await supabase
    .from("content_progress")
    .insert({
      user_id: user.id,
      content_id: contentId,
    })

  if (insertError) {
    console.error("markAsRead insert error:", insertError.message)
    return {
      success: false,
      message: "読了記録の保存に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/contents")
  return {
    success: true,
    message: "読了記録を保存しました。",
  }
}

/**
 * updateDefaultGenre Server Action
 *
 * ユーザーのデフォルトジャンル設定を profiles テーブルに UPDATE する。
 * ジャンルプルダウン変更時に非同期で呼び出され、UI をブロックしない。
 */
export async function updateDefaultGenre(
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

  const genre = formData.get("genre") as string
  if (!genre || !["engineering", "design"].includes(genre)) {
    return {
      success: false,
      message: "無効なジャンルが指定されました。",
    }
  }

  // profiles テーブルの default_genre を更新
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ default_genre: genre })
    .eq("id", user.id)

  if (updateError) {
    console.error("updateDefaultGenre error:", updateError.message)
    return {
      success: false,
      message: "デフォルトジャンルの更新に失敗しました。",
    }
  }

  revalidatePath("/contents")
  revalidatePath("/coaching")

  return {
    success: true,
    message: "デフォルトジャンルを更新しました。",
  }
}
