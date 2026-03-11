"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { deleteCalendarEvent } from "@/lib/google-calendar"

type Result = { success: boolean; message: string }

/**
 * Super Admin によるコーチングセッションキャンセル Server Action
 *
 * 1. Super Admin 権限確認
 * 2. status を cancelled_by_admin に更新
 * 3. refund=true の場合、coaching_credits +1 で枠返却
 * 4. Google Calendar イベント削除
 */
export async function adminCancelSession(
  _prevState: Result | null,
  formData: FormData
): Promise<Result> {
  // --- Super Admin 権限確認 ---
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: "認証されていません。" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "super_admin") {
    return { success: false, message: "権限がありません。" }
  }

  const sessionId = formData.get("sessionId") as string
  const refund = formData.get("refund") === "true"

  if (!sessionId) {
    return { success: false, message: "セッションIDが不足しています。" }
  }

  const adminClient = createAdminClient()

  // セッション取得
  const { data: session, error: fetchError } = await adminClient
    .from("coaching_sessions")
    .select("id, user_id, status, google_event_id")
    .eq("id", sessionId)
    .single()

  if (fetchError || !session) {
    return { success: false, message: "セッションが見つかりません。" }
  }

  if (session.status !== "scheduled") {
    return { success: false, message: "このセッションは既にキャンセル済みまたは完了済みです。" }
  }

  // ステータス更新
  const { error: updateError } = await adminClient
    .from("coaching_sessions")
    .update({
      status: "cancelled_by_admin" as const,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  if (updateError) {
    console.error("adminCancelSession: update error:", updateError.message)
    return { success: false, message: "キャンセルに失敗しました。" }
  }

  // 枠返却（オプション）
  if (refund) {
    await adminClient.from("coaching_credits").insert({
      user_id: session.user_id,
      amount: 1,
      reason: "cancellation_refund" as const,
      reference_id: sessionId,
    })
  }

  // Google Calendar イベント削除
  if (session.google_event_id) {
    await deleteCalendarEvent(session.google_event_id)
  }

  revalidatePath("/admin/coaching")
  const refundMsg = refund ? "枠を1回分返却しました。" : "枠の返却はありません。"
  return {
    success: true,
    message: `コーチングセッションをキャンセルしました。${refundMsg}`,
  }
}
