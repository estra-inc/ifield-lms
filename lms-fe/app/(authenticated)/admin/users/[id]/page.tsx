import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getAuthUser, getUserProfile, getCachedActiveVersionId } from "@/lib/supabase/cached-queries"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatLocalDate } from "@/lib/utils/week-helpers"
import type { UserDetail } from "@/lib/types/user-management"
import type { LearningMetrics } from "@/lib/types/daily-reports"
import type { DailyBar } from "@/app/(authenticated)/reports/_components/learning-hours-chart"
import { getActiveCoaches } from "@/lib/utils/coach-helpers"
import type { TutorialProgressItem, SkillCategoryScore, SkillReportData } from "@/lib/types/dashboard"
import { MetricsRow } from "@/app/(authenticated)/reports/_components/metrics-row"
import { TutorialProgressCard } from "@/app/(authenticated)/dashboard/_components/tutorial-progress-card"
import { ProfileCard } from "./_components/profile-card"
import { ActionsCard } from "./_components/actions-card"
import { LearningOverview } from "./_components/learning-overview"
import { CoachingCreditsCard } from "./_components/coaching-credits-card"
import { ProjectAssignmentsCard, type SubmissionRow } from "@/app/(authenticated)/users/[id]/_components/project-assignments-card"
import { SkillReportCard } from "@/app/(authenticated)/dashboard/_components/skill-report-card"

/* ─── ヘルパー関数 ─── */

function getMonthRange(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const m = String(month).padStart(2, "0")
  return {
    start: `${year}-${m}-01`,
    end: `${year}-${m}-${String(lastDay).padStart(2, "0")}`,
    yearMonth: `${year}-${m}`,
  }
}

function getWeekRangeFrom(mondayStr: string) {
  const monday = new Date(mondayStr + "T00:00:00")
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: formatLocalDate(monday), end: formatLocalDate(sunday) }
}

function getCurrentMonday(): string {
  const now = new Date()
  const dow = now.getDay()
  const diff = dow === 0 ? 6 : dow - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  return formatLocalDate(monday)
}

function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number)
  return `${y}年${m}月`
}

function formatWeekLabel(startStr: string, endStr: string): string {
  const s = new Date(startStr + "T00:00:00")
  const e = new Date(endStr + "T00:00:00")
  return `${s.getMonth() + 1}/${s.getDate()}（月）〜 ${e.getMonth() + 1}/${e.getDate()}（日）`
}

/* ─── ページコンポーネント ─── */

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    chartMonth?: string
    chartWeek?: string
  }>
}

export default async function UserDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams

  // --- 認証・権限チェック（cache() で layout と共有） ---
  const { user } = await getAuthUser()
  if (!user) redirect("/auth/login")

  const currentProfile = await getUserProfile(user.id)
  if (!currentProfile || currentProfile.role !== "super_admin") redirect("/dashboard")

  const adminClient = createAdminClient()

  // --- Phase 1: ユーザーデータ + ban状態を並列取得 ---
  const [profileResult, authUserResult] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id, full_name, email, avatar_url, role, current_term, default_genre, created_at")
      .eq("id", id)
      .single(),
    adminClient.auth.admin.getUserById(id),
  ])

  const profile = profileResult.data
  if (profileResult.error || !profile) notFound()
  if (authUserResult.error || !authUserResult.data) notFound()

  const bannedUntil = authUserResult.data.user?.banned_until ?? null
  const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()
  const isSelf = user.id === id
  const isLearner = profile.role === "user"

  const userDetail: UserDetail = {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    role: profile.role,
    currentTerm: profile.current_term,
    createdAt: profile.created_at,
    isBanned,
  }

  // --- Phase 2: 全データを一括並列取得（learner の場合） ---
  if (!isLearner) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <div className="flex items-center gap-3">
          <Link href="/admin/users" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">ユーザー詳細</h1>
        </div>
        <ProfileCard user={userDetail} coachAssignments={[]} availableCoaches={[]} />
        <ActionsCard user={userDetail} isSelf={isSelf} />
      </div>
    )
  }

  // learner の全データを一括並列取得
  const now = new Date()
  const today = formatLocalDate(now)
  const currentYearMonth = getCurrentYearMonth()
  const currentMonday = getCurrentMonday()
  const monthRange = getMonthRange(currentYearMonth)
  const weekRange = getWeekRangeFrom(currentMonday)
  const chartMonthKey = sp.chartMonth ?? currentYearMonth
  const chartMonthRange = getMonthRange(chartMonthKey)
  const chartWeekMonday = sp.chartWeek ?? currentMonday
  const chartWeekRange = getWeekRangeFrom(chartWeekMonday)

  const [
    activeVersionId,
    coachAssignmentsResult,
    activeCoaches,
    creditsResult,
    sessionsResult,
    assignmentsResult,
    skillResult,
    monthReportsResult,
    monthlyGoalResult,
    weeklyGoalResult,
    recentReportsResult,
    // チャート月が現在月と異なる場合の追加データ
    ..._chartExtraResults
  ] = await Promise.all([
    // Q1: active バージョン ID（キャッシュ済み）
    getCachedActiveVersionId(),
    // Q2: コーチ割り当て
    adminClient.from("coach_assignments").select("genre, coach_id").eq("user_id", id),
    // Q3: 有効コーチ一覧
    getActiveCoaches(adminClient),
    // Q4: コーチングクレジット
    adminClient.from("coaching_credits").select("amount").eq("user_id", id),
    // Q5: コーチングセッション
    adminClient
      .from("coaching_sessions")
      .select("id, session_date, start_time, end_time, genre, status, coach_id, google_meet_url, notes")
      .eq("user_id", id)
      .in("status", ["scheduled", "completed"])
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(20),
    // Q6: 模擬案件 assignments + submissions
    adminClient
      .from("project_assignments")
      .select("id, project_id, mock_projects(slug, title, genre), project_submissions(id, status, score, created_at)")
      .eq("user_id", id),
    // Q7: スキルレポート
    adminClient
      .from("project_assignments")
      .select(`
        project_submissions(
          project_evaluations(
            status,
            project_evaluation_details(category_large, is_ok)
          )
        )
      `)
      .eq("user_id", id),
    // Q8: 当月の日報
    adminClient
      .from("daily_reports")
      .select("actual_hours, report_date")
      .eq("user_id", id)
      .gte("report_date", monthRange.start)
      .lte("report_date", monthRange.end),
    // Q9: 月次目標
    adminClient
      .from("monthly_goals")
      .select("target_hours")
      .eq("user_id", id)
      .eq("year_month", currentYearMonth)
      .maybeSingle(),
    // Q10: 週次目標
    adminClient
      .from("weekly_goals")
      .select("target_hours")
      .eq("user_id", id)
      .eq("start_date", currentMonday)
      .maybeSingle(),
    // Q11: 最近の日報
    adminClient
      .from("daily_reports")
      .select("id, report_date, actual_hours, content")
      .eq("user_id", id)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  // --- コーチデータ整形 ---
  const availableCoaches = activeCoaches.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    genre: c.genre,
  }))

  const coachMap = new Map<string, string>()
  for (const c of availableCoaches) coachMap.set(c.id, c.fullName)

  let coachAssignments: { genre: string; coachId: string; coachName: string }[] = []
  const coachAssignmentsData = coachAssignmentsResult.data
  if (coachAssignmentsData && coachAssignmentsData.length > 0) {
    const missingIds = coachAssignmentsData
      .map((a) => a.coach_id)
      .filter((cid) => !coachMap.has(cid))

    if (missingIds.length > 0) {
      const { data: missingProfiles } = await adminClient
        .from("profiles")
        .select("id, full_name")
        .in("id", missingIds)
      for (const p of missingProfiles ?? []) coachMap.set(p.id, p.full_name ?? "不明")
    }

    coachAssignments = coachAssignmentsData.map((a) => ({
      genre: a.genre,
      coachId: a.coach_id,
      coachName: coachMap.get(a.coach_id) ?? "不明",
    }))
  }

  // --- コーチングセッション整形 ---
  const balance = (creditsResult.data ?? []).reduce((sum, r) => sum + r.amount, 0)
  const sessionsData = sessionsResult.data ?? []
  const sessionCoachIds = [...new Set(sessionsData.map((s) => s.coach_id).filter(Boolean))] as string[]

  // セッションのコーチ名解決（既にcoachMapに入っている可能性あり）
  const missingSessionCoachIds = sessionCoachIds.filter((cid) => !coachMap.has(cid))
  if (missingSessionCoachIds.length > 0) {
    const { data: cp } = await adminClient.from("profiles").select("id, full_name").in("id", missingSessionCoachIds)
    for (const p of cp ?? []) coachMap.set(p.id, p.full_name ?? "不明")
  }

  const coachingData = {
    balance,
    sessions: sessionsData.map((s) => ({
      id: s.id,
      sessionDate: s.session_date,
      startTime: s.start_time,
      endTime: s.end_time,
      genre: s.genre,
      status: s.status,
      googleMeetUrl: s.google_meet_url,
      notes: s.notes,
      coachName: s.coach_id ? (coachMap.get(s.coach_id) ?? null) : null,
    })),
  }

  // --- 模擬案件整形 ---
  type AssignmentRow = {
    id: string
    project_id: string
    mock_projects: { slug: string; title: string; genre: string } | null
    project_submissions: { id: string; status: string; score: number | null; created_at: string }[]
  }
  const assignments = (assignmentsResult.data ?? []) as unknown as AssignmentRow[]

  const submissionRows: SubmissionRow[] = assignments
    .flatMap((a) =>
      (a.project_submissions ?? []).map((sub) => ({
        submissionId: sub.id,
        projectTitle: a.mock_projects?.title ?? "",
        genre: a.mock_projects?.genre ?? "",
        status: sub.status as SubmissionRow["status"],
        score: sub.score,
        createdAt: sub.created_at,
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // --- スキルレポート整形 ---
  type SkillAssignment = {
    project_submissions: {
      project_evaluations: {
        status: string
        project_evaluation_details: { category_large: string; is_ok: boolean }[]
      } | null
    }[]
  }
  const skillAssignments = (skillResult.data ?? []) as unknown as SkillAssignment[]

  const categoryMap = new Map<string, { ok: number; total: number }>()
  for (const assignment of skillAssignments) {
    for (const submission of assignment.project_submissions ?? []) {
      const evaluation = submission.project_evaluations
      if (!evaluation || evaluation.status !== "finalized") continue
      for (const detail of evaluation.project_evaluation_details ?? []) {
        const existing = categoryMap.get(detail.category_large) ?? { ok: 0, total: 0 }
        categoryMap.set(detail.category_large, {
          ok: existing.ok + (detail.is_ok ? 1 : 0),
          total: existing.total + 1,
        })
      }
    }
  }

  const categories: SkillCategoryScore[] = Array.from(categoryMap.entries()).map(
    ([categoryLarge, { ok, total }]) => ({
      categoryLarge,
      okCount: ok,
      totalCount: total,
      percentage: total > 0 ? Math.round((ok / total) * 100) : 0,
    })
  )
  const skillReport: SkillReportData = { categories, hasData: categories.length > 0 }

  // --- 教材進捗（バージョンがある場合のみ） ---
  let tutorialProgress: TutorialProgressItem[] = []
  if (profile.default_genre && activeVersionId) {
    const [sectionsResult, tutorialsResult, completedResult] = await Promise.all([
      adminClient
        .from("contents")
        .select("id, tutorial, title, slug_path, genre")
        .eq("genre", profile.default_genre)
        .eq("content_type", "section")
        .eq("status", "active")
        .eq("version_id", activeVersionId),
      adminClient
        .from("contents")
        .select("tutorial, title, slug_path, genre")
        .eq("genre", profile.default_genre)
        .eq("content_type", "tutorial")
        .eq("status", "active")
        .eq("version_id", activeVersionId)
        .order("order", { ascending: true }),
      adminClient.from("content_progress").select("content_id").eq("user_id", id),
    ])

    const sections = sectionsResult.data ?? []
    const tutorials = tutorialsResult.data ?? []
    const completedIds = new Set((completedResult.data ?? []).map((r) => r.content_id))

    tutorialProgress = tutorials.map((t) => {
      const tutSections = sections.filter((s) => s.tutorial === t.tutorial)
      const completed = tutSections.filter((s) => completedIds.has(s.id)).length
      const total = tutSections.length
      return {
        tutorialSlug: t.tutorial,
        tutorialTitle: t.title,
        genre: t.genre,
        completedSections: completed,
        totalSections: total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    })
  }

  // --- 学習データ整形 ---
  const reports = monthReportsResult.data ?? []
  const monthlyActual = reports.reduce((sum, r) => sum + r.actual_hours, 0)
  const weeklyActual = reports
    .filter((r) => r.report_date >= weekRange.start && r.report_date <= weekRange.end)
    .reduce((sum, r) => sum + r.actual_hours, 0)
  const dailyActual = reports
    .filter((r) => r.report_date === today)
    .reduce((sum, r) => sum + r.actual_hours, 0)

  const monthlyTarget = monthlyGoalResult.data?.target_hours ?? null
  const weeklyTarget = weeklyGoalResult.data?.target_hours ?? null

  const metrics: LearningMetrics = {
    monthly: {
      actual: monthlyActual,
      target: monthlyTarget,
      percentage: monthlyTarget ? Math.round((monthlyActual / monthlyTarget) * 100) : null,
    },
    weekly: {
      actual: weeklyActual,
      target: weeklyTarget,
      percentage: weeklyTarget ? Math.round((weeklyActual / weeklyTarget) * 100) : null,
    },
    daily: { actual: dailyActual },
  }

  // --- チャートデータ ---
  let chartMonthReports = reports
  if (chartMonthKey !== currentYearMonth) {
    const { data } = await adminClient
      .from("daily_reports")
      .select("actual_hours, report_date")
      .eq("user_id", id)
      .gte("report_date", chartMonthRange.start)
      .lte("report_date", chartMonthRange.end)
    chartMonthReports = data ?? []
  }

  // チャート用目標（並列取得）
  const [chartMonthlyGoalResult, chartWeeklyGoalResult] = await Promise.all([
    (async () => {
      if (chartMonthKey === currentYearMonth) return monthlyGoalResult.data
      const { data } = await adminClient
        .from("monthly_goals")
        .select("target_hours")
        .eq("user_id", id)
        .eq("year_month", chartMonthKey)
        .maybeSingle()
      if (data) return data
      const { data: fallback } = await adminClient
        .from("monthly_goals")
        .select("target_hours")
        .eq("user_id", id)
        .lte("year_month", chartMonthKey)
        .order("year_month", { ascending: false })
        .limit(1)
        .maybeSingle()
      return fallback
    })(),
    (async () => {
      if (chartWeekMonday === currentMonday) return weeklyGoalResult.data
      const { data } = await adminClient
        .from("weekly_goals")
        .select("target_hours")
        .eq("user_id", id)
        .eq("start_date", chartWeekMonday)
        .maybeSingle()
      if (data) return data
      const { data: fallback } = await adminClient
        .from("weekly_goals")
        .select("target_hours")
        .eq("user_id", id)
        .lte("start_date", chartWeekMonday)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle()
      return fallback
    })(),
  ])

  // 月チャートデータ
  const monthHoursByDate = new Map<string, number>()
  for (const r of chartMonthReports) {
    monthHoursByDate.set(r.report_date, (monthHoursByDate.get(r.report_date) ?? 0) + r.actual_hours)
  }

  const [chartYear, chartMonth] = chartMonthKey.split("-").map(Number)
  const daysInChartMonth = new Date(chartYear, chartMonth, 0).getDate()
  const monthlyChartData: DailyBar[] = Array.from({ length: daysInChartMonth }, (_, i) => {
    const day = i + 1
    const dateStr = `${chartMonthKey}-${String(day).padStart(2, "0")}`
    return { label: String(day), hours: monthHoursByDate.get(dateStr) ?? 0, isToday: dateStr === today }
  })

  // 週チャートデータ
  const weekNeedsExtraFetch =
    chartWeekRange.start < chartMonthRange.start || chartWeekRange.end > chartMonthRange.end

  let weekHoursByDate = new Map<string, number>()
  if (!weekNeedsExtraFetch) {
    weekHoursByDate = monthHoursByDate
  } else {
    const { data } = await adminClient
      .from("daily_reports")
      .select("actual_hours, report_date")
      .eq("user_id", id)
      .gte("report_date", chartWeekRange.start)
      .lte("report_date", chartWeekRange.end)
    for (const r of data ?? []) {
      weekHoursByDate.set(r.report_date, (weekHoursByDate.get(r.report_date) ?? 0) + r.actual_hours)
    }
  }

  const weekDayLabels = ["月", "火", "水", "木", "金", "土", "日"]
  const chartWeekStart = new Date(chartWeekRange.start + "T00:00:00")
  const weeklyChartData: DailyBar[] = weekDayLabels.map((label, i) => {
    const d = new Date(chartWeekStart)
    d.setDate(chartWeekStart.getDate() + i)
    const dateStr = formatLocalDate(d)
    return { label, hours: weekHoursByDate.get(dateStr) ?? 0, isToday: dateStr === today }
  })

  const learningData = {
    metrics,
    monthlyChartData,
    weeklyChartData,
    monthLabel: formatMonthLabel(chartMonthKey),
    weekLabel: formatWeekLabel(chartWeekRange.start, chartWeekRange.end),
    currentMonthKey: chartMonthKey,
    currentWeekStart: chartWeekMonday,
    monthlyTargetHours: chartMonthlyGoalResult?.target_hours ?? null,
    weeklyTargetHours: chartWeeklyGoalResult?.target_hours ?? null,
    accountCreatedAt: profile.created_at,
    recentReports: (recentReportsResult.data ?? []).map((r) => ({
      id: r.id,
      reportDate: r.report_date,
      actualHours: r.actual_hours,
      content: r.content,
    })),
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">ユーザー詳細</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[400px_1fr_1fr]">
        <ProfileCard user={userDetail} coachAssignments={coachAssignments} availableCoaches={availableCoaches} />
        <MetricsRow metrics={learningData.metrics} goalHref={null} vertical />
        <TutorialProgressCard items={tutorialProgress} defaultGenre={profile.default_genre} progressHref={`/admin/users/${id}/progress`} />
      </div>

      <div className="flex flex-col gap-6">
        <LearningOverview userId={id} userName={profile.full_name ?? ""} hideMetrics {...learningData} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ProjectAssignmentsCard submissions={submissionRows} />
          <CoachingCreditsCard userId={id} balance={coachingData.balance} sessions={coachingData.sessions} />
        </div>

        <SkillReportCard data={skillReport} />
        <ActionsCard user={userDetail} isSelf={isSelf} />
      </div>
    </div>
  )
}
