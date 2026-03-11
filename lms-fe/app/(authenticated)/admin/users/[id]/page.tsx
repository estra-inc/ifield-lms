import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatLocalDate } from "@/lib/utils/week-helpers"
import type { UserDetail } from "@/lib/types/user-management"
import type { LearningMetrics } from "@/lib/types/daily-reports"
import type { DailyBar } from "@/app/(authenticated)/reports/_components/learning-hours-chart"
import { getActiveCoaches } from "@/lib/utils/coach-helpers"
import { getActiveVersionId } from "@/lib/supabase/content-version"
import type { TutorialProgressItem, SkillCategoryScore, SkillReportData } from "@/lib/types/dashboard"
import { MetricsRow } from "@/app/(authenticated)/reports/_components/metrics-row"
import { TutorialProgressCard } from "@/app/(authenticated)/dashboard/_components/tutorial-progress-card"
import { ProfileCard } from "./_components/profile-card"
import { ActionsCard } from "./_components/actions-card"
import { LearningOverview } from "./_components/learning-overview"
import { CoachingCreditsCard } from "./_components/coaching-credits-card"
import { ProjectAssignmentsCard, type SubmissionRow } from "@/app/(authenticated)/users/[id]/_components/project-assignments-card"
import { SkillReportCard } from "@/app/(authenticated)/dashboard/_components/skill-report-card"

/* ─── ヘルパー関数（goals/page.tsx と同パターン） ─── */

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

  // --- 認証・権限チェック ---
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!currentProfile || currentProfile.role !== "super_admin") {
    redirect("/dashboard")
  }

  // --- ユーザーデータ取得 ---
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, current_term, default_genre, created_at")
    .eq("id", id)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  // --- ban状態の取得 ---
  const adminClient = createAdminClient()
  const { data: authUser, error: authError } =
    await adminClient.auth.admin.getUserById(id)

  if (authError || !authUser) {
    notFound()
  }

  const bannedUntil = authUser.user?.banned_until ?? null
  const isBanned =
    !!bannedUntil && new Date(bannedUntil) > new Date()

  // --- isSelf判定 ---
  const isSelf = user.id === id

  // --- UserDetail構築 ---
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

  // --- 担当コーチ取得 & コーチ一覧（user ロールの場合のみ） ---
  const isLearner = profile.role === "user"
  let coachAssignments: { genre: string; coachId: string; coachName: string }[] = []
  let availableCoaches: { id: string; fullName: string; genre: string }[] = []

  if (isLearner) {
    // 現在の割り当て
    const { data: assignments } = await adminClient
      .from("coach_assignments")
      .select("genre, coach_id")
      .eq("user_id", id)

    // 有効なコーチ一覧（super_admin + default_genre あり + ban 除外）
    const activeCoaches = await getActiveCoaches(adminClient)

    availableCoaches = activeCoaches.map((c) => ({
      id: c.id,
      fullName: c.fullName,
      genre: c.genre,
    }))

    const coachMap = new Map<string, string>()
    for (const c of availableCoaches) {
      coachMap.set(c.id, c.fullName)
    }

    if (assignments && assignments.length > 0) {
      // コーチ一覧に含まれないコーチ名も解決
      const missingIds = assignments
        .map((a) => a.coach_id)
        .filter((cid) => !coachMap.has(cid))

      if (missingIds.length > 0) {
        const { data: missingProfiles } = await adminClient
          .from("profiles")
          .select("id, full_name")
          .in("id", missingIds)

        for (const p of missingProfiles ?? []) {
          coachMap.set(p.id, p.full_name ?? "不明")
        }
      }

      coachAssignments = assignments.map((a) => ({
        genre: a.genre,
        coachId: a.coach_id,
        coachName: coachMap.get(a.coach_id) ?? "不明",
      }))
    }
  }

  // --- コーチング枠データ取得（user ロールの場合のみ） ---
  let coachingData: {
    balance: number
    sessions: { id: string; sessionDate: string; startTime: string; endTime: string; genre: string; status: string; googleMeetUrl?: string | null; notes?: string | null; coachName?: string | null }[]
  } | null = null

  if (isLearner) {
    const { data: credits } = await supabase
      .from("coaching_credits")
      .select("amount")
      .eq("user_id", id)

    const balance = (credits ?? []).reduce((sum, r) => sum + r.amount, 0)

    // コーチングセッション取得（scheduled / completed のみ、時系列降順）
    const { data: sessionsData } = await adminClient
      .from("coaching_sessions")
      .select("id, session_date, start_time, end_time, genre, status, coach_id, google_meet_url, notes")
      .eq("user_id", id)
      .in("status", ["scheduled", "completed"])
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(20)

    // コーチ名を一括解決
    const coachIds = [...new Set((sessionsData ?? []).map((s) => s.coach_id).filter(Boolean))] as string[]
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

    coachingData = {
      balance,
      sessions: (sessionsData ?? []).map((s) => ({
        id: s.id,
        sessionDate: s.session_date,
        startTime: s.start_time,
        endTime: s.end_time,
        genre: s.genre,
        status: s.status,
        googleMeetUrl: s.google_meet_url,
        notes: s.notes,
        coachName: s.coach_id ? (coachNameMap.get(s.coach_id) ?? null) : null,
      })),
    }
  }

  // --- 模擬案件の提出データ取得（user ロールの場合のみ） ---
  let submissionRows: SubmissionRow[] = []

  if (isLearner) {
    const { data: assignmentsRaw } = await adminClient
      .from("project_assignments")
      .select("id, project_id, mock_projects(slug, title, genre), project_submissions(id, status, score, created_at)")
      .eq("user_id", id)

    type AssignmentRow = {
      id: string
      project_id: string
      mock_projects: { slug: string; title: string; genre: string } | null
      project_submissions: { id: string; status: string; score: number | null; created_at: string }[]
    }
    const assignments = (assignmentsRaw ?? []) as unknown as AssignmentRow[]

    submissionRows = assignments
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
  }

  // --- スキルレポートデータ取得（user ロールの場合のみ） ---
  let skillReport: SkillReportData = { categories: [], hasData: false }

  if (isLearner) {
    const { data: skillRaw } = await adminClient
      .from("project_assignments")
      .select(`
        project_submissions(
          project_evaluations(
            status,
            project_evaluation_details(
              category_large,
              is_ok
            )
          )
        )
      `)
      .eq("user_id", id)

    type SkillAssignment = {
      project_submissions: {
        project_evaluations: {
          status: string
          project_evaluation_details: {
            category_large: string
            is_ok: boolean
          }[]
        } | null
      }[]
    }
    const skillAssignments = (skillRaw ?? []) as unknown as SkillAssignment[]

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

    skillReport = { categories, hasData: categories.length > 0 }
  }

  // --- 教材進捗データ取得（user ロールの場合のみ） ---
  let tutorialProgress: TutorialProgressItem[] = []

  if (isLearner && profile.default_genre) {
    const activeVersionId = await getActiveVersionId(adminClient)

    if (activeVersionId) {
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
        adminClient
          .from("content_progress")
          .select("content_id")
          .eq("user_id", id),
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
  }

  // --- 学習データ取得（user ロールの場合のみ） ---
  let learningData = null

  if (isLearner) {
    const now = new Date()
    const today = formatLocalDate(now)
    const currentYearMonth = getCurrentYearMonth()
    const currentMonday = getCurrentMonday()

    // 月次範囲
    const monthRange = getMonthRange(currentYearMonth)

    // 週次範囲
    const weekRange = getWeekRangeFrom(currentMonday)

    // 今月の日報（月次・週次・日次メトリクス算出に使用）
    const { data: monthReports } = await supabase
      .from("daily_reports")
      .select("actual_hours, report_date")
      .eq("user_id", id)
      .gte("report_date", monthRange.start)
      .lte("report_date", monthRange.end)

    const reports = monthReports ?? []

    const monthlyActual = reports.reduce((sum, r) => sum + r.actual_hours, 0)
    const weeklyActual = reports
      .filter((r) => r.report_date >= weekRange.start && r.report_date <= weekRange.end)
      .reduce((sum, r) => sum + r.actual_hours, 0)
    const dailyActual = reports
      .filter((r) => r.report_date === today)
      .reduce((sum, r) => sum + r.actual_hours, 0)

    // 月次・週次目標
    const { data: monthlyGoal } = await supabase
      .from("monthly_goals")
      .select("target_hours")
      .eq("user_id", id)
      .eq("year_month", currentYearMonth)
      .maybeSingle()

    const { data: weeklyGoal } = await supabase
      .from("weekly_goals")
      .select("target_hours")
      .eq("user_id", id)
      .eq("start_date", currentMonday)
      .maybeSingle()

    const monthlyTarget = monthlyGoal?.target_hours ?? null
    const weeklyTarget = weeklyGoal?.target_hours ?? null

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
      daily: {
        actual: dailyActual,
      },
    }

    // --- チャート用データ ---
    const chartMonthKey = sp.chartMonth ?? currentYearMonth
    const chartMonthRange = getMonthRange(chartMonthKey)
    const chartWeekMonday = sp.chartWeek ?? currentMonday
    const chartWeekRange = getWeekRangeFrom(chartWeekMonday)

    // チャート月の日報データ
    let chartMonthReports = reports
    if (chartMonthKey !== currentYearMonth) {
      const { data } = await supabase
        .from("daily_reports")
        .select("actual_hours, report_date")
        .eq("user_id", id)
        .gte("report_date", chartMonthRange.start)
        .lte("report_date", chartMonthRange.end)
      chartMonthReports = data ?? []
    }

    // チャート用目標（フォールバック付き）
    let chartMonthlyGoal =
      chartMonthKey === currentYearMonth
        ? monthlyGoal
        : (
            await supabase
              .from("monthly_goals")
              .select("target_hours")
              .eq("user_id", id)
              .eq("year_month", chartMonthKey)
              .maybeSingle()
          ).data

    if (!chartMonthlyGoal) {
      const { data } = await supabase
        .from("monthly_goals")
        .select("target_hours")
        .eq("user_id", id)
        .lte("year_month", chartMonthKey)
        .order("year_month", { ascending: false })
        .limit(1)
        .maybeSingle()
      chartMonthlyGoal = data
    }

    let chartWeeklyGoal =
      chartWeekMonday === currentMonday
        ? weeklyGoal
        : (
            await supabase
              .from("weekly_goals")
              .select("target_hours")
              .eq("user_id", id)
              .eq("start_date", chartWeekMonday)
              .maybeSingle()
          ).data

    if (!chartWeeklyGoal) {
      const { data } = await supabase
        .from("weekly_goals")
        .select("target_hours")
        .eq("user_id", id)
        .lte("start_date", chartWeekMonday)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle()
      chartWeeklyGoal = data
    }

    // 月チャートデータ
    const monthHoursByDate = new Map<string, number>()
    for (const r of chartMonthReports) {
      monthHoursByDate.set(
        r.report_date,
        (monthHoursByDate.get(r.report_date) ?? 0) + r.actual_hours
      )
    }

    const [chartYear, chartMonth] = chartMonthKey.split("-").map(Number)
    const daysInChartMonth = new Date(chartYear, chartMonth, 0).getDate()
    const monthlyChartData: DailyBar[] = Array.from(
      { length: daysInChartMonth },
      (_, i) => {
        const day = i + 1
        const dateStr = `${chartMonthKey}-${String(day).padStart(2, "0")}`
        return {
          label: String(day),
          hours: monthHoursByDate.get(dateStr) ?? 0,
          isToday: dateStr === today,
        }
      }
    )

    // 週チャートデータ
    const weekNeedsExtraFetch =
      chartWeekRange.start < chartMonthRange.start ||
      chartWeekRange.end > chartMonthRange.end

    let weekHoursByDate = new Map<string, number>()
    if (!weekNeedsExtraFetch) {
      weekHoursByDate = monthHoursByDate
    } else {
      const { data } = await supabase
        .from("daily_reports")
        .select("actual_hours, report_date")
        .eq("user_id", id)
        .gte("report_date", chartWeekRange.start)
        .lte("report_date", chartWeekRange.end)
      for (const r of data ?? []) {
        weekHoursByDate.set(
          r.report_date,
          (weekHoursByDate.get(r.report_date) ?? 0) + r.actual_hours
        )
      }
    }

    const weekDayLabels = ["月", "火", "水", "木", "金", "土", "日"]
    const chartWeekStart = new Date(chartWeekRange.start + "T00:00:00")
    const weeklyChartData: DailyBar[] = weekDayLabels.map((label, i) => {
      const d = new Date(chartWeekStart)
      d.setDate(chartWeekStart.getDate() + i)
      const dateStr = formatLocalDate(d)
      return {
        label,
        hours: weekHoursByDate.get(dateStr) ?? 0,
        isToday: dateStr === today,
      }
    })

    // 最近の日報（直近5件）
    const { data: recentReportsData } = await supabase
      .from("daily_reports")
      .select("id, report_date, actual_hours, content")
      .eq("user_id", id)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5)

    learningData = {
      metrics,
      monthlyChartData,
      weeklyChartData,
      monthLabel: formatMonthLabel(chartMonthKey),
      weekLabel: formatWeekLabel(chartWeekRange.start, chartWeekRange.end),
      currentMonthKey: chartMonthKey,
      currentWeekStart: chartWeekMonday,
      monthlyTargetHours: chartMonthlyGoal?.target_hours ?? null,
      weeklyTargetHours: chartWeeklyGoal?.target_hours ?? null,
      accountCreatedAt: profile.created_at,
      recentReports: (recentReportsData ?? []).map((r) => ({
        id: r.id,
        reportDate: r.report_date,
        actualHours: r.actual_hours,
        content: r.content,
      })),
    }
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          ユーザー詳細
        </h1>
      </div>

      {/* プロフィール + 学習メトリクス + 教材進捗 横並び */}
      {learningData ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[400px_1fr_1fr]">
          <ProfileCard user={userDetail} coachAssignments={coachAssignments} availableCoaches={availableCoaches} />
          <MetricsRow metrics={learningData.metrics} goalHref={null} vertical />
          <TutorialProgressCard items={tutorialProgress} defaultGenre={profile.default_genre} progressHref={`/admin/users/${id}/progress`} />
        </div>
      ) : (
        <ProfileCard user={userDetail} coachAssignments={coachAssignments} availableCoaches={availableCoaches} />
      )}

      <div className="flex flex-col gap-6">
        {/* 学習状況セクション（メトリクスは上に移動済み） */}
        {learningData && (
          <LearningOverview userId={id} userName={profile.full_name ?? ""} hideMetrics {...learningData} />
        )}

        {/* 模擬案件 + コーチング枠（user ロールのみ表示） */}
        {isLearner && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ProjectAssignmentsCard submissions={submissionRows} />
            {coachingData && (
              <CoachingCreditsCard
                userId={id}
                balance={coachingData.balance}
                sessions={coachingData.sessions}
              />
            )}
          </div>
        )}

        {/* スキルレポート（user ロールのみ表示） */}
        {isLearner && (
          <SkillReportCard data={skillReport} />
        )}

        <ActionsCard user={userDetail} isSelf={isSelf} />
      </div>
    </div>
  )
}
