import Link from "next/link"
import { Clock, Target, CalendarDays } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { LearningMetrics } from "@/lib/types/daily-reports"

/**
 * MetricsRow Props
 *
 * 親ページでフェッチした進捗データを受け取る。
 */
export interface MetricsRowProps {
  metrics: LearningMetrics
  /** 目標未設定バッジのリンク先。null の場合はバッジ自体を非表示にする */
  goalHref?: string | null
  /** true の場合、カードを縦並びにする */
  vertical?: boolean
}

/**
 * メトリクスカード行 (Server Component)
 *
 * 今月・今週・本日の学習時間を 3 枚のメトリクスカードで横並び表示する。
 * 目標設定済みの場合はプログレスバーと達成率を表示し、
 * 未設定の場合は「目標未設定」バッジ + /goals へのリンクを提供する。
 */
export function MetricsRow({ metrics, goalHref = "/goals", vertical = false }: MetricsRowProps) {
  return (
    <div className={vertical ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 gap-4 sm:grid-cols-3"}>
      {/* 今月の学習時間 */}
      <MetricCard
        title="今月の学習時間"
        icon={<CalendarDays className="size-4 text-muted-foreground" />}
        actual={metrics.monthly.actual}
        target={metrics.monthly.target}
        percentage={metrics.monthly.percentage}
        goalHref={goalHref}
      />

      {/* 今週の学習時間 */}
      <MetricCard
        title="今週の学習時間"
        icon={<Clock className="size-4 text-muted-foreground" />}
        actual={metrics.weekly.actual}
        target={metrics.weekly.target}
        percentage={metrics.weekly.percentage}
        goalHref={goalHref}
      />

      {/* 本日の学習時間 */}
      <MetricCard
        title="本日の学習時間"
        icon={<Target className="size-4 text-muted-foreground" />}
        actual={metrics.daily.actual}
        target={null}
        percentage={null}
        hideGoal
      />
    </div>
  )
}

interface MetricCardProps {
  title: string
  icon: React.ReactNode
  actual: number
  target: number | null
  percentage: number | null
  hideGoal?: boolean
  goalHref?: string | null
}

function MetricCard({
  title,
  icon,
  actual,
  target,
  percentage,
  hideGoal = false,
  goalHref = "/goals",
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight">
            {actual}
          </span>
          {target !== null && (
            <span className="text-sm text-muted-foreground">
              / {target} h
            </span>
          )}
          {target === null && (
            <span className="text-sm text-muted-foreground">h</span>
          )}
        </div>

        {/* プログレスバー（目標設定済みの場合） */}
        {target !== null && percentage !== null && (
          <div className="flex flex-col gap-1.5">
            <div className="h-2 w-full overflow-hidden bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              達成率 {percentage}%
            </span>
          </div>
        )}

        {/* 目標未設定バッジ（日次カード以外、goalHref が null なら非表示） */}
        {!hideGoal && target === null && goalHref != null && (
          <Link href={goalHref} className="inline-flex">
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
              目標未設定 - 設定する
            </Badge>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
