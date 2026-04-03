import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isCoachActive } from "@/lib/utils/coach-helpers"
import { CoachingPageClient } from "./_components/coaching-page-client"
import { GenreSelectDynamic as GenreSelect } from "./_components/genre-select-dynamic"
import type { CoachingGenre, CoachAssignmentStatus } from "@/lib/types/database"

interface PageProps {
  searchParams: Promise<{ genre?: string }>
}

export default async function CoachingPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // ユーザーのデフォルトジャンルを取得
  const { data: profile } = await supabase
    .from("profiles")
    .select("default_genre")
    .eq("id", user.id)
    .single()

  const defaultGenre = profile?.default_genre ?? "engineering"
  const params = await searchParams
  const selectedGenre = (params.genre === "design" ? "design" : params.genre === "engineering" ? "engineering" : defaultGenre) as CoachingGenre

  // 残高取得
  const { data: credits } = await supabase
    .from("coaching_credits")
    .select("amount")
    .eq("user_id", user.id)

  const balance = (credits ?? []).reduce((sum, r) => sum + r.amount, 0)

  // --- コーチ割り当て情報取得 ---
  const adminClient = createAdminClient()
  let coachAssignment: CoachAssignmentStatus = { type: "unassigned" }

  const { data: assignment } = await adminClient
    .from("coach_assignments")
    .select("coach_id")
    .eq("user_id", user.id)
    .eq("genre", selectedGenre)
    .maybeSingle()

  if (assignment) {
    const check = await isCoachActive(adminClient, assignment.coach_id, selectedGenre)

    if (check.active) {
      coachAssignment = {
        type: "assigned",
        coach: {
          coachId: assignment.coach_id,
          coachName: check.fullName ?? "不明",
        },
      }
    } else {
      coachAssignment = {
        type: "departed",
        previousCoachName: check.fullName ?? "不明",
      }
    }
  }

  // 予約済み・過去のセッション取得（coach_id 含む）
  const { data: sessions } = await adminClient
    .from("coaching_sessions")
    .select("id, session_date, start_time, end_time, genre, status, coach_id, google_meet_url, created_at")
    .eq("user_id", user.id)
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(50)

  // コーチ名を一括解決
  const coachIds = [...new Set((sessions ?? []).map((s) => s.coach_id).filter(Boolean))] as string[]
  const coachNameMap = new Map<string, string>()

  if (coachIds.length > 0) {
    const { data: coachProfiles } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .in("id", coachIds)

    for (const cp of coachProfiles ?? []) {
      coachNameMap.set(cp.id, cp.full_name ?? "不明")
    }
  }

  const sessionItems = (sessions ?? []).map((s) => ({
    id: s.id,
    sessionDate: s.session_date,
    startTime: s.start_time,
    endTime: s.end_time,
    genre: s.genre,
    status: s.status,
    googleMeetUrl: s.google_meet_url,
    createdAt: s.created_at,
    coachName: s.coach_id ? (coachNameMap.get(s.coach_id) ?? null) : null,
  }))

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">コーチング予約</h1>
        <GenreSelect currentGenre={selectedGenre} defaultGenre={defaultGenre} />
      </div>
      <CoachingPageClient
        initialBalance={balance}
        initialSessions={sessionItems}
        genre={selectedGenre}
        coachAssignment={coachAssignment}
      />
    </div>
  )
}
