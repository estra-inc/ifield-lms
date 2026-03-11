import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getGoogleCalendarBusySlots } from "@/lib/google-calendar"
import { computeAvailableSlots, formatDateStr, getBusinessHoursForGenre } from "@/lib/utils/coaching-slots"
import { isCoachActive, getActiveCoaches } from "@/lib/utils/coach-helpers"
import type { BusinessHours, CoachingGenre, GenreBusinessHours } from "@/lib/types/database"

/**
 * GET /api/coaching/available-slots?genre=engineering|design
 *
 * 認証済みユーザー向け。business_hours 設定と Google Calendar の空き状況、
 * 既存予約を考慮して予約可能なスロットを返す。
 * genre パラメータで指定されたジャンルの稼働時間枠を使用する。
 *
 * コーチマッチング対応:
 * - 割り当て済み: 担当コーチの予約済みスロットのみで空き算出
 * - 未割り当て: 全コーチの空き枠を集約（1人でも空いていればOK）
 * - 離脱/無効化: 空スロット + departed ステータス
 */
export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
    }

    // business_hours 設定を取得
    const adminClient = createAdminClient()
    const { data: integration, error: integrationError } = await adminClient
      .from("system_integrations")
      .select("business_hours")
      .eq("service_name", "google_calendar")
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: "コーチング設定が見つかりません", detail: integrationError?.message },
        { status: 404 }
      )
    }

    // genre パラメータ取得（デフォルト: engineering）
    const genreParam = request.nextUrl.searchParams.get("genre") ?? "engineering"
    const genre: CoachingGenre = genreParam === "design" ? "design" : "engineering"

    // ジャンル別 business_hours を取得（後方互換対応）
    const rawBusinessHours = integration.business_hours as BusinessHours | GenreBusinessHours
    const businessHours = getBusinessHoursForGenre(rawBusinessHours, genre)

    // デフォルト値の補完
    const leadDays = businessHours.bookingLeadDays ?? 1
    const windowWeeks = businessHours.bookingWindowWeeks ?? 2
    const slotDuration = businessHours.slotDurationMinutes ?? 60
    const buffer = businessHours.bufferMinutes ?? 0

    // 期間計算
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() + leadDays)
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + windowWeeks * 7)

    const timeMin = startDate.toISOString()
    const timeMax = endDate.toISOString()

    // Google Calendar busy スロットを取得
    let busySlots: { start: string; end: string }[] = []
    try {
      const result = await getGoogleCalendarBusySlots(timeMin, timeMax)
      if (result) {
        busySlots = result
      }
    } catch (error) {
      console.error("available-slots: Failed to get busy slots:", error)
    }

    const normalizedHours: BusinessHours = {
      ...businessHours,
      bookingLeadDays: leadDays,
      bookingWindowWeeks: windowWeeks,
      slotDurationMinutes: slotDuration,
      bufferMinutes: buffer,
    }

    // --- コーチ割り当て情報を取得 ---
    const { data: assignment } = await adminClient
      .from("coach_assignments")
      .select("coach_id")
      .eq("user_id", user.id)
      .eq("genre", genre)
      .maybeSingle()

    if (assignment) {
      // 割り当て済み: コーチが有効か確認（role + genre + ban）
      const check = await isCoachActive(adminClient, assignment.coach_id, genre)

      if (!check.active) {
        // コーチ離脱/無効化
        return NextResponse.json({
          slots: [],
          slotDurationMinutes: slotDuration,
          assignmentStatus: "departed" as const,
          previousCoachName: check.fullName ?? "不明",
        })
      }

      // 有効なコーチ → そのコーチの予約済みセッションで空き枠算出
      const { data: coachBookings } = await adminClient
        .from("coaching_sessions")
        .select("session_date, start_time")
        .eq("coach_id", assignment.coach_id)
        .eq("status", "scheduled")
        .gte("session_date", formatDateStr(startDate))
        .lte("session_date", formatDateStr(endDate))

      const availableSlots = computeAvailableSlots(
        normalizedHours,
        busySlots,
        coachBookings ?? []
      )

      return NextResponse.json({
        slots: availableSlots,
        slotDurationMinutes: slotDuration,
        assignmentStatus: "assigned" as const,
        coachName: check.fullName,
      })
    }

    // --- 未割り当て（初回）: 有効な全コーチの空き枠を集約 ---
    const activeCoaches = await getActiveCoaches(adminClient, genre)

    if (activeCoaches.length === 0) {
      return NextResponse.json({
        slots: [],
        slotDurationMinutes: slotDuration,
        assignmentStatus: "unassigned" as const,
      })
    }

    const coachIds = activeCoaches.map((c) => c.id)

    // 全コーチの予約済みセッションを取得
    const { data: allBookings } = await adminClient
      .from("coaching_sessions")
      .select("coach_id, session_date, start_time")
      .in("coach_id", coachIds)
      .eq("status", "scheduled")
      .gte("session_date", formatDateStr(startDate))
      .lte("session_date", formatDateStr(endDate))

    // コーチごとの予約セットを構築
    const coachBookedMap = new Map<string, Set<string>>()
    for (const id of coachIds) {
      coachBookedMap.set(id, new Set())
    }
    for (const b of allBookings ?? []) {
      if (b.coach_id) {
        coachBookedMap.get(b.coach_id)?.add(`${b.session_date}_${b.start_time.slice(0, 5)}`)
      }
    }

    // 全候補スロットを取得
    const candidateSlots = computeAvailableSlots(normalizedHours, busySlots, [])

    // 各スロットについて、少なくとも1人のコーチが空いているかチェック
    const availableSlots = candidateSlots.filter((slot) => {
      const slotKey = `${slot.date}_${slot.startTime}`
      return coachIds.some((coachId) => !coachBookedMap.get(coachId)?.has(slotKey))
    })

    return NextResponse.json({
      slots: availableSlots,
      slotDurationMinutes: slotDuration,
      assignmentStatus: "unassigned" as const,
    })
  } catch (error) {
    console.error("available-slots: Unhandled error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
