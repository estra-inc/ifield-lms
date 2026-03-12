import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGoogleCalendarBusySlots } from "@/lib/google-calendar"

/**
 * GET /api/admin/google-calendar-busy?timeMin=...&timeMax=...
 *
 * Google Calendar の予定ありスロットを返す。Super Admin のみ。
 */
export async function GET(request: NextRequest) {
  // 認証 & Super Admin 確認
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // クエリパラメータ
  const { searchParams } = new URL(request.url)
  const timeMin = searchParams.get("timeMin")
  const timeMax = searchParams.get("timeMax")

  if (!timeMin || !timeMax) {
    return NextResponse.json(
      { error: "timeMin and timeMax are required" },
      { status: 400 }
    )
  }

  try {
    const busySlots = await getGoogleCalendarBusySlots(user.id, timeMin, timeMax)

    if (busySlots === null) {
      return NextResponse.json({ busy: [], connected: false })
    }

    return NextResponse.json({ busy: busySlots, connected: true })
  } catch (error) {
    console.error("google-calendar-busy: Error fetching busy slots:", error)
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    )
  }
}
