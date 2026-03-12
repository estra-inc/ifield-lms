import { redirect } from "next/navigation"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import { MonthlyGoalCard } from "./_components/monthly-goal-card"
import { WeeklyGoalCard } from "./_components/weekly-goal-card"
import { LearningHoursChart, type DailyBar } from "@/app/(authenticated)/reports/_components/learning-hours-chart"
import { generateAvailableWeeks, generateAvailableMonths, formatLocalDate } from "@/lib/utils/week-helpers"

/**
 * 指定月の日付範囲を取得
 */
function getMonthRange(yearMonth: string): {
  start: string
  end: string
  yearMonth: string
} {
  const [year, month] = yearMonth.split("-").map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const m = String(month).padStart(2, "0")
  return {
    start: `${year}-${m}-01`,
    end: `${year}-${m}-${String(lastDay).padStart(2, "0")}`,
    yearMonth: `${year}-${m}`,
  }
}

/**
 * 指定された月曜日からの週範囲を取得
 */
function getWeekRangeFrom(mondayStr: string): { start: string; end: string } {
  const monday = new Date(mondayStr + "T00:00:00")
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: formatLocalDate(monday),
    end: formatLocalDate(sunday),
  }
}

/**
 * 今週の月曜日を取得
 */
function getCurrentMonday(): string {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  return formatLocalDate(monday)
}

/**
 * 今月の "YYYY-MM" を取得
 */
function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/**
 * 月ラベル生成 "2026年2月"
 */
function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number)
  return `${y}年${m}月`
}

/**
 * 週ラベル生成 "2/24（月）〜 3/2（日）"
 */
function formatWeekLabel(startStr: string, endStr: string): string {
  const s = new Date(startStr + "T00:00:00")
  const e = new Date(endStr + "T00:00:00")
  return `${s.getMonth() + 1}/${s.getDate()}（月）〜 ${e.getMonth() + 1}/${e.getDate()}（日）`
}

interface PageProps {
  searchParams: Promise<{
    month?: string
    week?: string
    chartMonth?: string
    chartWeek?: string
  }>
}

export default async function GoalsPage({ searchParams }: PageProps) {
  const params = await searchParams

  const { user, supabase } = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  // プロフィールから作成日を取得（セレクター範囲の起点に使用）
  const profile = await getUserProfile(user.id)

  const accountCreatedAt = profile?.created_at ?? user.created_at

  const now = new Date()
  const today = formatLocalDate(now)

  // --- 目標カード用データ（選択月・選択週） ---
  const currentYearMonth = getCurrentYearMonth()
  const goalYearMonth = params.month ?? currentYearMonth
  const goalMonthRange = getMonthRange(goalYearMonth)

  const defaultWeekMonday = getCurrentMonday()
  const goalWeekStart = params.week ?? defaultWeekMonday
  const goalWeekEnd = (() => {
    const d = new Date(goalWeekStart + "T00:00:00")
    d.setDate(d.getDate() + 6)
    return formatLocalDate(d)
  })()

  const { data: goalMonthReports } = await supabase
    .from("daily_reports")
    .select("actual_hours, report_date")
    .gte("report_date", goalMonthRange.start)
    .lte("report_date", goalMonthRange.end)

  const monthlyActual = (goalMonthReports ?? []).reduce(
    (sum, r) => sum + r.actual_hours,
    0
  )
  const weeklyActual = (goalMonthReports ?? [])
    .filter(
      (r) => r.report_date >= goalWeekStart && r.report_date <= goalWeekEnd
    )
    .reduce((sum, r) => sum + r.actual_hours, 0)

  const { data: monthlyGoal } = await supabase
    .from("monthly_goals")
    .select("target_hours")
    .eq("year_month", goalMonthRange.yearMonth)
    .maybeSingle()

  const { data: weeklyGoal } = await supabase
    .from("weekly_goals")
    .select("target_hours")
    .eq("start_date", goalWeekStart)
    .maybeSingle()

  // 前週の目標を取得（今週の目標が未設定時のデフォルト値として使用）
  const prevWeekMonday = new Date(goalWeekStart + "T00:00:00")
  prevWeekMonday.setDate(prevWeekMonday.getDate() - 7)
  const prevWeekStart = formatLocalDate(prevWeekMonday)

  const { data: prevWeeklyGoal } = await supabase
    .from("weekly_goals")
    .select("target_hours")
    .eq("start_date", prevWeekStart)
    .maybeSingle()

  // 選択中の週が属する月の月次目標を取得（参考目標時間の算出用）
  const weekBelongsToMonth = (() => {
    const d = new Date(goalWeekStart + "T00:00:00")
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })()

  const weekMonthGoal =
    weekBelongsToMonth === goalMonthRange.yearMonth
      ? monthlyGoal
      : (
          await supabase
            .from("monthly_goals")
            .select("target_hours")
            .eq("year_month", weekBelongsToMonth)
            .maybeSingle()
        ).data

  const availableWeeks = generateAvailableWeeks(accountCreatedAt)
  const availableMonths = generateAvailableMonths(accountCreatedAt)
  const goalMonthLabel = formatMonthLabel(goalYearMonth)

  // --- チャート用データ（chartMonth / chartWeek パラメータで切替可能） ---
  const chartMonthKey = params.chartMonth ?? goalYearMonth
  const chartMonthRange = getMonthRange(chartMonthKey)

  const chartWeekMonday = params.chartWeek ?? defaultWeekMonday
  const chartWeekRange = getWeekRangeFrom(chartWeekMonday)

  // チャート月データの取得（目標カード用と同一月なら再利用）
  let chartMonthReports = goalMonthReports ?? []
  if (chartMonthKey !== goalYearMonth) {
    const { data } = await supabase
      .from("daily_reports")
      .select("actual_hours, report_date")
      .gte("report_date", chartMonthRange.start)
      .lte("report_date", chartMonthRange.end)
    chartMonthReports = data ?? []
  }

  // チャート用目標データ（該当期間の目標がなければ直近の目標にフォールバック）
  let chartMonthlyGoal =
    chartMonthKey === goalYearMonth
      ? monthlyGoal
      : (
          await supabase
            .from("monthly_goals")
            .select("target_hours")
            .eq("year_month", chartMonthKey)
            .maybeSingle()
        ).data

  if (!chartMonthlyGoal) {
    const { data } = await supabase
      .from("monthly_goals")
      .select("target_hours")
      .lte("year_month", chartMonthKey)
      .order("year_month", { ascending: false })
      .limit(1)
      .maybeSingle()
    chartMonthlyGoal = data
  }

  let chartWeeklyGoal =
    chartWeekMonday === goalWeekStart
      ? weeklyGoal
      : (
          await supabase
            .from("weekly_goals")
            .select("target_hours")
            .eq("start_date", chartWeekMonday)
            .maybeSingle()
        ).data

  if (!chartWeeklyGoal) {
    const { data } = await supabase
      .from("weekly_goals")
      .select("target_hours")
      .lte("start_date", chartWeekMonday)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle()
    chartWeeklyGoal = data
  }

  // 月チャートの hoursByDate
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

  // 週チャートデータ（月の日報データから抽出するか、別途取得）
  // チャート週が月の範囲外の場合は別途取得が必要
  const weekNeedsExtraFetch =
    chartWeekRange.start < chartMonthRange.start ||
    chartWeekRange.end > chartMonthRange.end

  let weekHoursByDate = new Map<string, number>()
  if (!weekNeedsExtraFetch) {
    // 月データに含まれるのでそこからフィルタ
    weekHoursByDate = monthHoursByDate
  } else {
    const { data } = await supabase
      .from("daily_reports")
      .select("actual_hours, report_date")
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

  const monthChartLabel = formatMonthLabel(chartMonthKey)
  const weekChartLabel = formatWeekLabel(
    chartWeekRange.start,
    chartWeekRange.end
  )

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">学習目標</h1>
        <p className="text-sm text-muted-foreground">
          月次・週次の学習目標を設定して進捗を管理しましょう
        </p>
      </div>

      {/* 学習時間折れ線グラフ（月/週タブ切替 + 前後ナビゲーション） */}
      <LearningHoursChart
        monthlyData={monthlyChartData}
        weeklyData={weeklyChartData}
        monthLabel={monthChartLabel}
        weekLabel={weekChartLabel}
        currentMonthKey={chartMonthKey}
        currentWeekStart={chartWeekMonday}
        monthlyTargetHours={chartMonthlyGoal?.target_hours ?? null}
        weeklyTargetHours={chartWeeklyGoal?.target_hours ?? null}
        accountCreatedAt={accountCreatedAt}
      />

      {/* 2カラムレイアウト: 月次 (左) + 週次 (右) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonthlyGoalCard
          currentMonth={goalMonthLabel}
          yearMonth={goalMonthRange.yearMonth}
          actualHours={monthlyActual}
          currentGoal={
            monthlyGoal ? { targetHours: monthlyGoal.target_hours } : null
          }
          availableMonths={availableMonths}
        />

        <WeeklyGoalCard
          currentWeekLabel="週次学習目標"
          startDate={goalWeekStart}
          endDate={goalWeekEnd}
          actualHours={weeklyActual}
          currentGoal={
            weeklyGoal ? { targetHours: weeklyGoal.target_hours } : null
          }
          previousWeekTargetHours={prevWeeklyGoal?.target_hours ?? null}
          availableWeeks={availableWeeks}
          suggestedWeeklyHours={
            weekMonthGoal
              ? Math.round(
                  (weekMonthGoal.target_hours * 7 /
                    new Date(
                      Number(weekBelongsToMonth.split("-")[0]),
                      Number(weekBelongsToMonth.split("-")[1]),
                      0
                    ).getDate()) * 10
                ) / 10
              : null
          }
        />
      </div>
    </div>
  )
}
