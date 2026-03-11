import Link from "next/link"
import { FileText, Clock, ArrowRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MetricsRow } from "@/app/(authenticated)/reports/_components/metrics-row"
import { LearningHoursChart, type DailyBar } from "@/app/(authenticated)/reports/_components/learning-hours-chart"
import type { LearningMetrics } from "@/lib/types/daily-reports"

interface RecentReport {
  id: string
  reportDate: string
  actualHours: number
  content: string
}

export interface LearningOverviewProps {
  userId: string
  userName: string
  metrics: LearningMetrics
  /** チャートナビゲーションのベースパス（デフォルト: /admin/users/${userId}） */
  basePath?: string
  /** true の場合、メトリクスカード行を非表示にする */
  hideMetrics?: boolean
  /** チャート用 */
  monthlyChartData: DailyBar[]
  weeklyChartData: DailyBar[]
  monthLabel: string
  weekLabel: string
  currentMonthKey: string
  currentWeekStart: string
  monthlyTargetHours: number | null
  weeklyTargetHours: number | null
  accountCreatedAt: string
  /** 最近の日報（直近5件） */
  recentReports: RecentReport[]
}

/**
 * 学習概況セクション（Server Component）
 *
 * ユーザー詳細画面に配置し、メトリクス・チャート・最近の日報を表示する。
 */
export function LearningOverview({
  userId,
  userName,
  basePath,
  hideMetrics = false,
  metrics,
  monthlyChartData,
  weeklyChartData,
  monthLabel,
  weekLabel,
  currentMonthKey,
  currentWeekStart,
  monthlyTargetHours,
  weeklyTargetHours,
  accountCreatedAt,
  recentReports,
}: LearningOverviewProps) {
  const chartBasePath = basePath ?? `/admin/users/${userId}`
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold tracking-tight">学習状況</h2>

      {/* メトリクスカード（閲覧専用: goalHref=null でバッジ非表示） */}
      {!hideMetrics && <MetricsRow metrics={metrics} goalHref={null} />}

      {/* 学習時間推移チャート */}
      <LearningHoursChart
        monthlyData={monthlyChartData}
        weeklyData={weeklyChartData}
        monthLabel={monthLabel}
        weekLabel={weekLabel}
        currentMonthKey={currentMonthKey}
        currentWeekStart={currentWeekStart}
        monthlyTargetHours={monthlyTargetHours}
        weeklyTargetHours={weeklyTargetHours}
        accountCreatedAt={accountCreatedAt}
        basePath={chartBasePath}
      />

      {/* 最近の日報 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">最近の日報</CardTitle>
            </div>
            <Link
              href={`/manager/reports?search=${encodeURIComponent(userName)}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              すべての日報を見る
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">日報はまだありません</p>
          ) : (
            <div className="flex flex-col divide-y">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{report.reportDate}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {report.actualHours}h
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {report.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
