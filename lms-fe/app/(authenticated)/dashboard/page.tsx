import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getActiveVersionId } from "@/lib/supabase/content-version"
import { formatLocalDate } from "@/lib/utils/week-helpers"
import { deriveProjectStatus, isProjectActive } from "@/lib/utils/project-status"
import { GoalMetricCard } from "./_components/goal-progress-card"
import { TutorialProgressCard } from "./_components/tutorial-progress-card"
import { DailyReportCard } from "./_components/daily-report-card"
import { CoachingCard } from "./_components/coaching-card"
import { ProjectStatusCard } from "./_components/project-status-card"
import { SkillReportCard } from "./_components/skill-report-card"
import { ProfileInfoCard } from "./_components/profile-info-card"
import type {
  GoalProgressData,
  TutorialProgressItem,
  DailyReportStatus,
  CoachingData,
  ProjectsData,
  ProjectItem,
  SkillReportData,
  SkillCategoryScore,
} from "@/lib/types/dashboard"

/* ─── ヘルパー関数 ─── */

function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getCurrentMonday(): string {
  const now = new Date()
  const dow = now.getDay()
  const diff = dow === 0 ? 6 : dow - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  return formatLocalDate(monday)
}

function getMonthRange(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const m = String(month).padStart(2, "0")
  return {
    start: `${year}-${m}-01`,
    end: `${year}-${m}-${String(lastDay).padStart(2, "0")}`,
  }
}

function getWeekRange(mondayStr: string) {
  const monday = new Date(mondayStr + "T00:00:00")
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: formatLocalDate(monday), end: formatLocalDate(sunday) }
}

/* ─── ページコンポーネント ─── */

export default async function DashboardPage() {
  // --- Task 1.1: 認証チェックとロール判定 ---
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // profiles からロール・ジャンル・名前・基本情報を1回のクエリで取得
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, default_genre, full_name, avatar_url, email, current_term, created_at")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/auth/login")
  }

  // ロールベースルーティング
  if (profile.role === "manager") {
    redirect("/users")
  }
  if (profile.role === "super_admin") {
    redirect("/admin/grading")
  }

  // --- Task 1.2: アカウント無効化バナー ---
  const adminClient = createAdminClient()
  const { data: authUser } = await adminClient.auth.admin.getUserById(user.id)

  const bannedUntil = authUser?.user?.banned_until ?? null
  const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()

  // --- Task 2.1: 並列データ取得 ---
  const now = new Date()
  const today = formatLocalDate(now)
  const currentYearMonth = getCurrentYearMonth()
  const currentMonday = getCurrentMonday()
  const monthRange = getMonthRange(currentYearMonth)
  const weekRange = getWeekRange(currentMonday)

  // コンテンツバージョン解決
  const activeVersionId = await getActiveVersionId(supabase)

  // 並列クエリ（コンテンツ系以外）
  const [
    monthlyGoalResult,
    weeklyGoalResult,
    monthReportsResult,
    completedSectionsResult,
    coachingCreditsResult,
    coachingSessionResult,
    assignmentsResult,
    skillReportResult,
  ] = await Promise.all([
    // Q2: 月次目標
    supabase
      .from("monthly_goals")
      .select("target_hours")
      .eq("user_id", user.id)
      .eq("year_month", currentYearMonth)
      .maybeSingle(),

    // Q3: 週次目標
    supabase
      .from("weekly_goals")
      .select("target_hours")
      .eq("user_id", user.id)
      .eq("start_date", currentMonday)
      .maybeSingle(),

    // Q4: 当月の日報
    supabase
      .from("daily_reports")
      .select("actual_hours, report_date, content")
      .eq("user_id", user.id)
      .gte("report_date", monthRange.start)
      .lte("report_date", monthRange.end),

    // Q7: 完了済みセクション
    supabase
      .from("content_progress")
      .select("content_id")
      .eq("user_id", user.id),

    // Q8: コーチングクレジット残高
    supabase
      .from("coaching_credits")
      .select("amount")
      .eq("user_id", user.id),

    // Q9: 次回コーチングセッション
    supabase
      .from("coaching_sessions")
      .select("session_date, start_time, end_time, genre")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .gte("session_date", today)
      .order("session_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(1),

    // Q10: 模擬案件
    supabase
      .from("project_assignments")
      .select("id, mock_projects(slug, title), project_submissions(id, status, score, created_at)")
      .eq("user_id", user.id),

    // Q11: スキルレポート（ネストセレクト）— submission の status も取得
    supabase
      .from("project_assignments")
      .select(`
        project_submissions(
          status,
          created_at,
          project_evaluations(
            status,
            project_evaluation_details(
              category_large,
              is_ok
            )
          )
        )
      `)
      .eq("user_id", user.id),
  ])

  // コーチ割り当て取得
  const { data: coachAssignmentData } = await supabase
    .from("coach_assignments")
    .select("genre, coach_id")
    .eq("user_id", user.id)

  let coachLabel: string | null = null
  if (coachAssignmentData && coachAssignmentData.length > 0) {
    const coachIds = [...new Set(coachAssignmentData.map((a) => a.coach_id))]
    const { data: coachProfiles } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .in("id", coachIds)

    const nameMap = new Map<string, string>()
    for (const p of coachProfiles ?? []) {
      nameMap.set(p.id, p.full_name ?? "不明")
    }

    coachLabel = coachAssignmentData
      .map((a) => nameMap.get(a.coach_id) ?? "不明")
      .join("、")
  }

  // Q5 + Q6: 教材クエリ（ジャンルとバージョンが存在する場合のみ）
  let sectionsData: { id: string; tutorial: string; title: string; slug_path: string; genre: string }[] = []
  let tutorialsData: { tutorial: string; title: string; slug_path: string; genre: string }[] = []

  if (profile.default_genre && activeVersionId) {
    const [sectionsResult, tutorialsResult] = await Promise.all([
      // Q5: 教材セクション一覧
      supabase
        .from("contents")
        .select("id, tutorial, title, slug_path, genre")
        .eq("genre", profile.default_genre)
        .eq("content_type", "section")
        .eq("status", "active")
        .eq("version_id", activeVersionId),

      // Q6: チュートリアル一覧
      supabase
        .from("contents")
        .select("tutorial, title, slug_path, genre")
        .eq("genre", profile.default_genre)
        .eq("content_type", "tutorial")
        .eq("status", "active")
        .eq("version_id", activeVersionId)
        .order("order", { ascending: true }),
    ])

    sectionsData = (sectionsResult.data ?? []) as typeof sectionsData
    tutorialsData = (tutorialsResult.data ?? []) as typeof tutorialsData
  }

  // --- Task 2.2: データ整形 ---

  // 目標達成率の算出
  const reports = monthReportsResult.data ?? []
  const monthlyActual = reports.reduce((sum, r) => sum + r.actual_hours, 0)
  const weeklyActual = reports
    .filter((r) => r.report_date >= weekRange.start && r.report_date <= weekRange.end)
    .reduce((sum, r) => sum + r.actual_hours, 0)

  const monthlyTarget = monthlyGoalResult.data?.target_hours ?? null
  const weeklyTarget = weeklyGoalResult.data?.target_hours ?? null

  const goalProgress: GoalProgressData = {
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
  }

  // 教材完了率の算出
  const completedIds = new Set(
    (completedSectionsResult.data ?? []).map((r) => r.content_id)
  )

  const tutorialProgress: TutorialProgressItem[] = tutorialsData.map((t) => {
    const tutorialSections = sectionsData.filter((s) => s.tutorial === t.tutorial)
    const completed = tutorialSections.filter((s) => completedIds.has(s.id)).length
    const total = tutorialSections.length
    return {
      tutorialSlug: t.tutorial,
      tutorialTitle: t.title,
      genre: t.genre,
      completedSections: completed,
      totalSections: total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })

  // 今日の日報状況
  const todayReports = reports.filter((r) => r.report_date === today)
  const dailyReport: DailyReportStatus =
    todayReports.length > 0
      ? {
          type: "entered",
          totalHours: todayReports.reduce((sum, r) => sum + r.actual_hours, 0),
          entries: todayReports.map((r) => ({
            actualHours: r.actual_hours,
            content: r.content,
          })),
        }
      : { type: "not_entered" }

  // コーチングデータ
  const creditBalance = (coachingCreditsResult.data ?? []).reduce(
    (sum, c) => sum + c.amount,
    0
  )
  const sessionData = coachingSessionResult.data?.[0] ?? null
  const coaching: CoachingData = {
    creditBalance,
    nextSession: sessionData
      ? {
          sessionDate: sessionData.session_date,
          startTime: sessionData.start_time,
          endTime: sessionData.end_time,
          genre: sessionData.genre,
        }
      : null,
  }

  // 模擬案件の分類
  type AssignmentRow = {
    id: string
    mock_projects: { slug: string; title: string } | null
    project_submissions: {
      id: string
      status: string
      score: number | null
      created_at: string
    }[]
  }
  const assignments = (assignmentsResult.data ?? []) as unknown as AssignmentRow[]

  const allProjectItems: (ProjectItem & { isActive: boolean })[] = assignments.map(
    (a) => {
      // 最新の submission を取得
      const sorted = [...(a.project_submissions ?? [])].sort(
        (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
      )
      const latest = sorted[0] ?? null
      const status = deriveProjectStatus({
        assignment: { id: a.id, status: "active" },
        latestSubmission: latest
          ? { id: latest.id, status: latest.status }
          : null,
      })
      return {
        projectSlug: a.mock_projects?.slug ?? "",
        projectTitle: a.mock_projects?.title ?? "",
        status,
        latestScore: latest?.score ?? null,
        isActive: isProjectActive(status),
      }
    }
  )

  const projects: ProjectsData = {
    activeProjects: allProjectItems
      .filter((p) => p.isActive)
      .map(({ isActive: _isActive, ...rest }) => rest),
    recentCompleted: allProjectItems
      .filter((p) => !p.isActive && p.status !== "未着手")
      .slice(0, 3)
      .map(({ isActive: _isActive, ...rest }) => rest),
  }

  // スキルレポート集計
  // project_evaluations は submission_id に UNIQUE 制約があるため1対1（オブジェクト）で返る
  // 各 assignment の最新の提出（graded）の evaluation のみを分母にする
  type SkillAssignment = {
    project_submissions: {
      status: string
      created_at: string
      project_evaluations: {
        status: string
        project_evaluation_details: {
          category_large: string
          is_ok: boolean
        }[]
      } | null
    }[]
  }
  const skillAssignments = (skillReportResult.data ?? []) as unknown as SkillAssignment[]

  const categoryMap = new Map<string, { ok: number; total: number }>()
  for (const assignment of skillAssignments) {
    const submissions = assignment.project_submissions ?? []
    // graded（採点済み）の提出のみを対象とし、最新の1件だけを使用
    const gradedSubmissions = submissions
      .filter(
        (s) =>
          s.status === "graded" &&
          s.project_evaluations?.status === "finalized"
      )
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    const latestSubmission = gradedSubmissions[0]
    if (!latestSubmission) continue

    const evaluation = latestSubmission.project_evaluations!
    for (const detail of evaluation.project_evaluation_details ?? []) {
      const existing = categoryMap.get(detail.category_large) ?? {
        ok: 0,
        total: 0,
      }
      categoryMap.set(detail.category_large, {
        ok: existing.ok + (detail.is_ok ? 1 : 0),
        total: existing.total + 1,
      })
    }
  }

  const categories: SkillCategoryScore[] = Array.from(
    categoryMap.entries()
  ).map(([categoryLarge, { ok, total }]) => ({
    categoryLarge,
    okCount: ok,
    totalCount: total,
    percentage: total > 0 ? Math.round((ok / total) * 100) : 0,
  }))

  const skillReport: SkillReportData = {
    categories,
    hasData: categories.length > 0,
  }

  // --- Task 6.1: カードコンポーネントの統合とレスポンシブレイアウト ---
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Task 1.2: 無効化バナー */}
      {isBanned && (
        <div
          className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          アカウントが無効化されています。詳細は管理者にお問い合わせください。
        </div>
      )}

      {/* ヘッダー */}
      <div>
        <h1 className="font-[family-name:var(--font-primary)] text-2xl font-bold tracking-[-1px]">
          ダッシュボード
        </h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {profile.full_name ?? "ユーザー"} さんの学習サマリー
        </p>
      </div>

      {/* メトリクスカード行: 基本情報 + 月次目標 + 週次目標 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ProfileInfoCard
          avatarUrl={profile.avatar_url}
          fullName={profile.full_name}
          email={profile.email}
          role={profile.role}
          currentTerm={profile.current_term}
          createdAt={profile.created_at}
          coachName={coachLabel}
        />
        <GoalMetricCard
          label="今月の目標達成率"
          actual={goalProgress.monthly.actual}
          target={goalProgress.monthly.target}
          percentage={goalProgress.monthly.percentage}
        />
        <GoalMetricCard
          label="今週の目標達成率"
          actual={goalProgress.weekly.actual}
          target={goalProgress.weekly.target}
          percentage={goalProgress.weekly.percentage}
        />
      </div>

      {/* 3カラムレイアウト: 教材進捗(2col) + 日報/コーチング/模擬案件(1col) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* 左カラム: 教材進捗（2カラム分） */}
        <div className="md:col-span-2">
          <TutorialProgressCard
            items={tutorialProgress}
            defaultGenre={profile.default_genre}
          />
        </div>

        {/* 右カラム: 日報 + コーチング + 模擬案件 */}
        <div className="flex flex-col gap-4">
          <DailyReportCard status={dailyReport} />
          <CoachingCard data={coaching} />
          <ProjectStatusCard data={projects} />
        </div>
      </div>

      {/* フル幅: スキルレポート */}
      <SkillReportCard data={skillReport} />
    </div>
  )
}
