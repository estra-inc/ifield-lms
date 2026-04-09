"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  createCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google-calendar"
import { isCoachActive, getActiveCoaches } from "@/lib/utils/coach-helpers"
import { toJST, formatDateStr } from "@/lib/utils/coaching-slots"
import {
  notifyCoachingBooked,
  notifyCoachingCancelled,
} from "@/lib/notifications/messages/coaching"
import type { ActionResult } from "@/lib/validations/auth"

/**
 * 認証確認を行い、user ロールであることを検証する。
 */
async function verifyUser(): Promise<
  { userId: string } | { error: ActionResult }
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

  return { userId: user.id }
}

/**
 * コーチングセッション予約 Server Action
 *
 * 1. 認証確認
 * 2. 残高チェック
 * 3. コーチ割り当て確認・マッチング
 * 4. coaching_sessions INSERT（coach_id 含む）
 * 5. coaching_credits INSERT (amount: -1)
 * 6. coach_assignments UPSERT（未割り当ての場合）
 * 7. Google Calendar イベント作成
 */
export type BookSessionResult = {
  success: boolean
  message: string
  googleMeetUrl?: string | null
  coachName?: string | null
} | null

export async function bookSession(
  _prevState: BookSessionResult,
  formData: FormData
): Promise<BookSessionResult> {
  const authResult = await verifyUser()
  if ("error" in authResult) {
    return authResult.error
  }

  const date = formData.get("date") as string
  const startTime = formData.get("startTime") as string
  const endTime = formData.get("endTime") as string
  const genreRaw = formData.get("genre") as string | null
  const genre = genreRaw === "design" ? "design" : "engineering"

  if (!date || !startTime || !endTime) {
    return { success: false, message: "予約情報が不足しています。" }
  }

  const adminClient = createAdminClient()
  const userId = authResult.userId

  // 残高チェック
  const { data: credits } = await adminClient
    .from("coaching_credits")
    .select("amount")
    .eq("user_id", userId)

  const balance = (credits ?? []).reduce((sum, r) => sum + r.amount, 0)
  if (balance < 1) {
    return {
      success: false,
      message: "コーチング枠の残高が不足しています。管理者にお問い合わせください。",
    }
  }

  // --- コーチ割り当て確認 ---
  let selectedCoachId: string | null = null
  let selectedCoachName: string | null = null
  let needsUpsert = false

  const { data: assignment } = await adminClient
    .from("coach_assignments")
    .select("id, coach_id")
    .eq("user_id", userId)
    .eq("genre", genre)
    .maybeSingle()

  if (assignment) {
    // 割り当て済み: コーチが有効か確認（role + genre + ban）
    const check = await isCoachActive(adminClient, assignment.coach_id, genre)

    if (check.active) {
      selectedCoachId = assignment.coach_id
      selectedCoachName = check.fullName
    } else {
      // コーチ離脱 → 割り当てを削除して再マッチング
      await adminClient
        .from("coach_assignments")
        .delete()
        .eq("id", assignment.id)
      needsUpsert = true
    }
  } else {
    needsUpsert = true
  }

  // --- マッチングアルゴリズム（未割り当て or 離脱時） ---
  if (!selectedCoachId) {
    // 1. 該当ジャンルの有効な全コーチ取得（ban 除外済み）
    const coaches = await getActiveCoaches(adminClient, genre)

    if (coaches.length === 0) {
      return {
        success: false,
        message: "現在このジャンルを担当するコーチがいません。",
      }
    }

    const coachIds = coaches.map((c) => c.id)

    // 2. 選択スロットに既に予約があるコーチを除外
    const { data: conflicts } = await adminClient
      .from("coaching_sessions")
      .select("coach_id")
      .in("coach_id", coachIds)
      .eq("session_date", date)
      .eq("start_time", startTime)
      .eq("status", "scheduled")

    const conflictSet = new Set((conflicts ?? []).map((s) => s.coach_id))
    const eligible = coaches.filter((c) => !conflictSet.has(c.id)) as { id: string; fullName: string }[]

    if (eligible.length === 0) {
      return {
        success: false,
        message: "この枠は全てのコーチで埋まっています。別の枠をお選びください。",
      }
    }

    // 3. 残りのコーチの中で scheduled セッション数が最少のコーチを選択（負荷分散）
    const today = formatDateStr(toJST(new Date()))
    const { data: loadData } = await adminClient
      .from("coaching_sessions")
      .select("coach_id")
      .in("coach_id", eligible.map((c) => c.id))
      .eq("status", "scheduled")
      .gte("session_date", today)

    const loadMap = new Map<string, number>()
    for (const c of eligible) {
      loadMap.set(c.id, 0)
    }
    for (const row of loadData ?? []) {
      if (row.coach_id) {
        loadMap.set(row.coach_id, (loadMap.get(row.coach_id) ?? 0) + 1)
      }
    }

    eligible.sort((a, b) => (loadMap.get(a.id) ?? 0) - (loadMap.get(b.id) ?? 0))
    selectedCoachId = eligible[0].id
    selectedCoachName = eligible[0].fullName
  }

  // --- セッション作成（coach_id 含む） ---
  const { data: session, error: sessionError } = await adminClient
    .from("coaching_sessions")
    .insert({
      user_id: userId,
      session_date: date,
      start_time: startTime,
      end_time: endTime,
      genre: genre as "engineering" | "design",
      status: "scheduled" as const,
      coach_id: selectedCoachId,
    })
    .select("id")
    .single()

  if (sessionError || !session) {
    // unique partial index 違反（同一コーチ・同一時間枠の重複予約）
    if (sessionError?.code === "23505") {
      return {
        success: false,
        message: "この枠は直前に予約されました。別の枠をお選びください。",
      }
    }
    console.error("bookSession: insert error:", sessionError?.message)
    return {
      success: false,
      message: "予約の作成に失敗しました。もう一度お試しください。",
    }
  }

  // クレジット消費
  const { error: creditError } = await adminClient
    .from("coaching_credits")
    .insert({
      user_id: userId,
      amount: -1,
      reason: "booking_consumed" as const,
      reference_id: session.id,
    })

  if (creditError) {
    console.error("bookSession: credit insert error:", creditError.message)
  }

  // --- coach_assignments UPSERT（未割り当て or 離脱時） ---
  if (needsUpsert && selectedCoachId) {
    const { error: upsertError } = await adminClient
      .from("coach_assignments")
      .upsert(
        {
          user_id: userId,
          genre: genre as "engineering" | "design",
          coach_id: selectedCoachId,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,genre" }
      )

    if (upsertError) {
      console.error("bookSession: coach_assignments upsert error:", upsertError.message)
    }
  }

  // --- Google Calendar イベント作成 ---
  const { data: profile } = await adminClient
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single()

  const studentName = profile?.full_name ?? "受講生"
  const genreLabel = genre === "design" ? "デザイン" : "エンジニアリング"
  const coachLabel = selectedCoachName ? ` - ${selectedCoachName}` : ""
  const calendarResult = await createCalendarEvent(selectedCoachId, {
    summary: `i-field ${studentName}様 コーチング（${genreLabel}）${coachLabel}`,
    description: `受講生: ${studentName}\nジャンル: ${genreLabel}\nコーチ: ${selectedCoachName ?? "未定"}\nセッションID: ${session.id}`,
    startDateTime: `${date}T${startTime}:00+09:00`,
    endDateTime: `${date}T${endTime}:00+09:00`,
    timeZone: "Asia/Tokyo",
  })

  let calendarWarning = ""
  let meetUrl: string | null = null
  if (calendarResult.ok) {
    meetUrl = calendarResult.meetUrl
    await adminClient
      .from("coaching_sessions")
      .update({
        google_event_id: calendarResult.eventId,
        google_meet_url: meetUrl,
      })
      .eq("id", session.id)
  } else {
    console.error("bookSession: Calendar event creation failed:", calendarResult.reason)
    calendarWarning = `（※ Google カレンダーへの登録に失敗しました: ${calendarResult.reason}）`
  }

  // --- Slack 通知（fail-safe） ---
  // 通知失敗は予約成功レスポンスに影響しない
  try {
    await notifyCoachingBooked(adminClient, {
      studentName,
      coachId: selectedCoachId,
      coachName: selectedCoachName,
      genre: genre as "engineering" | "design",
      sessionDate: date,
      startTime,
      endTime,
    })
  } catch (notificationError) {
    console.error("bookSession: Slack notification failed:", notificationError)
  }

  revalidatePath("/coaching")
  return {
    success: true,
    message: `${date} ${startTime}〜${endTime} のコーチングを予約しました。${calendarWarning}`,
    googleMeetUrl: meetUrl,
    coachName: selectedCoachName,
  }
}

/**
 * コーチングセッションキャンセル Server Action
 *
 * 1. 認証確認、セッション所有権確認
 * 2. status を cancelled_by_student に更新
 * 3. coaching_credits INSERT (amount: +1, 返却)
 * 4. Google Calendar イベント削除
 * ※ コーチ割り当ては解除しない（履歴保持）
 */
export async function cancelSession(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const authResult = await verifyUser()
  if ("error" in authResult) {
    return authResult.error
  }

  const sessionId = formData.get("sessionId") as string
  if (!sessionId) {
    return { success: false, message: "セッションIDが不足しています。" }
  }

  const adminClient = createAdminClient()
  const userId = authResult.userId

  // セッション取得 & 所有権確認（通知に必要な日時・ジャンル・受講生名も取得）
  const { data: session, error: fetchError } = await adminClient
    .from("coaching_sessions")
    .select("id, user_id, status, google_event_id, coach_id, session_date, start_time, end_time, genre")
    .eq("id", sessionId)
    .single()

  if (fetchError || !session) {
    return { success: false, message: "セッションが見つかりません。" }
  }

  if (session.user_id !== userId) {
    return { success: false, message: "このセッションをキャンセルする権限がありません。" }
  }

  if (session.status !== "scheduled") {
    return { success: false, message: "このセッションはキャンセルできません。" }
  }

  // ステータス更新
  const { error: updateError } = await adminClient
    .from("coaching_sessions")
    .update({
      status: "cancelled_by_student" as const,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  if (updateError) {
    console.error("cancelSession: update error:", updateError.message)
    return {
      success: false,
      message: "キャンセルに失敗しました。もう一度お試しください。",
    }
  }

  // クレジット返却
  await adminClient.from("coaching_credits").insert({
    user_id: userId,
    amount: 1,
    reason: "cancellation_refund" as const,
    reference_id: sessionId,
  })

  // Google Calendar イベント削除
  if (session.google_event_id && session.coach_id) {
    await deleteCalendarEvent(session.coach_id, session.google_event_id)
  }

  // --- Slack 通知（fail-safe） ---
  try {
    // 受講生氏名・担当コーチ氏名を取得
    const [studentProfile, coachProfile] = await Promise.all([
      adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .single(),
      session.coach_id
        ? adminClient
            .from("profiles")
            .select("full_name")
            .eq("id", session.coach_id)
            .single()
        : Promise.resolve({ data: null }),
    ])

    await notifyCoachingCancelled(adminClient, {
      studentName: studentProfile.data?.full_name ?? "受講生",
      coachId: session.coach_id,
      coachName: coachProfile.data?.full_name ?? null,
      genre: (session.genre ?? "engineering") as "engineering" | "design",
      sessionDate: session.session_date,
      startTime: session.start_time,
      endTime: session.end_time,
    })
  } catch (notificationError) {
    console.error("cancelSession: Slack notification failed:", notificationError)
  }

  revalidatePath("/coaching")
  return {
    success: true,
    message: "コーチングセッションをキャンセルしました。枠が1回分返却されました。",
  }
}
