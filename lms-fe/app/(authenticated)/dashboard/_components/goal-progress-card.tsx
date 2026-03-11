/**
 * GoalMetricCard (個別メトリクスカード)
 *
 * 月次・週次の学習目標達成率を個別カードとして表示する。
 * デザインに合わせて大きなパーセンテージ + プログレスバー + 時間情報を表示。
 * Server Component。
 *
 * Task 3.1
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface GoalMetricCardProps {
  label: string
  actual: number
  target: number | null
  percentage: number | null
  goalHref?: string
}

export function GoalMetricCard({
  label,
  actual,
  target,
  percentage,
  goalHref = "/goals",
}: GoalMetricCardProps) {
  if (target === null || percentage === null) {
    return (
      <Card className="rounded-none border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="font-[family-name:var(--font-primary)] text-xs font-semibold tracking-wide text-muted-foreground">
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <span className="font-mono text-sm text-muted-foreground">
            目標未設定
          </span>
          <Link
            href={goalHref}
            className="text-xs text-primary hover:underline"
          >
            目標を設定する
          </Link>
        </CardContent>
      </Card>
    )
  }

  const cappedValue = Math.min(percentage, 100)

  return (
    <Card className="rounded-none border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-[family-name:var(--font-primary)] text-xs font-semibold tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <span className="font-[family-name:var(--font-primary)] text-[32px] font-bold text-foreground">
          {percentage}%
        </span>
        <Progress value={cappedValue} className="h-1.5" />
        <span className="font-mono text-xs text-muted-foreground">
          {actual}h / {target}h（目標）
        </span>
      </CardContent>
    </Card>
  )
}
