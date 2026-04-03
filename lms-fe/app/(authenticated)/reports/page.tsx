import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { MetricsRow } from "./_components/metrics-row"
import { DailyReportForm } from "./_components/daily-report-form"
import { UserReportList, groupReportsByDate } from "./_components/user-report-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LearningMetrics, DailyReportEntry } from "@/lib/types/daily-reports"

/**
 * 進捗率計算ヘルパー
 */
function calculatePercentage(actual: number, target: number | null): number | null {
  if (target === null || target === 0) return null
  return Math.round((actual / target) * 100)
}

/**
 * 当月の日付範囲を取得するヘルパー
 */
function getCurrentMonthRange(): { start: string; end: string; yearMonth: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
    yearMonth: `${year}-${month}`,
  }
}

/**
 * 今週の月曜日〜日曜日の日付範囲を取得するヘルパー
 */
function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  }
}

export default async function ReportsPage() {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // 日付範囲の計算
  const monthRange = getCurrentMonthRange()
  const weekRange = getCurrentWeekRange()
  const today = new Date().toISOString().split("T")[0]

  // 当月の日報を取得（合計学習時間の計算用）
  const { data: monthlyReports } = await supabase
    .from("daily_reports")
    .select("actual_hours, report_date")
    .gte("report_date", monthRange.start)
    .lte("report_date", monthRange.end)

  // 月次目標を取得
  const { data: monthlyGoal } = await supabase
    .from("monthly_goals")
    .select("target_hours")
    .eq("year_month", monthRange.yearMonth)
    .maybeSingle()

  // 週次目標を取得
  const { data: weeklyGoal } = await supabase
    .from("weekly_goals")
    .select("target_hours")
    .eq("start_date", weekRange.start)
    .maybeSingle()

  // 最新の日報を5件取得（日報一覧プレビュー用）
  const { data: recentReports } = await supabase
    .from("daily_reports")
    .select("id, report_date, actual_hours, content, liked_by_manager, created_at")
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(3)

  const recentEntries: DailyReportEntry[] = (recentReports ?? []).map((r) => ({
    id: r.id,
    reportDate: r.report_date,
    actualHours: r.actual_hours,
    content: r.content,
    likedByManager: r.liked_by_manager,
    createdAt: r.created_at,
  }))

  const recentGroups = groupReportsByDate(recentEntries)

  // メトリクス計算
  const monthlyActual = (monthlyReports ?? []).reduce(
    (sum, r) => sum + r.actual_hours,
    0
  )
  const weeklyActual = (monthlyReports ?? [])
    .filter(
      (r) => r.report_date >= weekRange.start && r.report_date <= weekRange.end
    )
    .reduce((sum, r) => sum + r.actual_hours, 0)
  const dailyActual = (monthlyReports ?? [])
    .filter((r) => r.report_date === today)
    .reduce((sum, r) => sum + r.actual_hours, 0)

  const monthlyTarget = monthlyGoal?.target_hours ?? null
  const weeklyTarget = weeklyGoal?.target_hours ?? null

  const metrics: LearningMetrics = {
    monthly: {
      actual: monthlyActual,
      target: monthlyTarget,
      percentage: calculatePercentage(monthlyActual, monthlyTarget),
    },
    weekly: {
      actual: weeklyActual,
      target: weeklyTarget,
      percentage: calculatePercentage(weeklyActual, weeklyTarget),
    },
    daily: {
      actual: dailyActual,
    },
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">日報入力</h1>
        <p className="text-sm text-muted-foreground">
          日々の学習時間と学習内容を記録しましょう
        </p>
      </div>

      {/* メトリクスカード行 */}
      <MetricsRow metrics={metrics} />

      {/* 2カラム: 最近の日報 (左) + 日報入力フォーム (右) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 最近の日報一覧カード */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">最近の日報</CardTitle>
            <Link
              href="/reports/list"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              すべての日報を見る
              <ArrowRight className="size-4" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[400px]">
            <UserReportList groups={recentGroups} nextCursor={null} />
          </CardContent>
        </Card>

        {/* 日報入力フォーム */}
        <DailyReportForm />
      </div>
    </div>
  )
}
