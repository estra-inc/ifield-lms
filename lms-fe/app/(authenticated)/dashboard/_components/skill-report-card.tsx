"use client"

/**
 * SkillReportCard
 *
 * スキルレポートのレーダーチャートとカテゴリ別達成率を横並びで表示するカード。
 * @nivo/radar を使用するため Client Component。
 *
 * Task 5
 * Requirements: 1.4 (追加要件: スキルレポート統合)
 */

import Link from "next/link"
import { ResponsiveRadar } from "@nivo/radar"
import { BarChart3, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { SkillReportData } from "@/lib/types/dashboard"

interface SkillReportCardProps {
  data: SkillReportData
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function SkillReportCard({ data }: SkillReportCardProps) {
  if (!data.hasData) {
    return (
      <Card className="rounded-none border-border shadow-none">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-primary)] text-base tracking-tight">
            スキルレポート
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8">
            <BarChart3 className="size-8 text-muted-foreground/50" />
            <p className="font-mono text-sm text-muted-foreground">
              採点済みの案件がありません
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const radarData = data.categories.map((c) => ({
    category: c.categoryLarge,
    達成率: c.percentage,
  }))

  return (
    <Card className="rounded-none border-border shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-[family-name:var(--font-primary)] text-base tracking-tight">
            スキルレポート
          </CardTitle>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            採点済み案件のカテゴリ別達成率
          </p>
        </div>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          詳細を見る
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <div className="mx-0 h-px bg-border" />
      <CardContent className="pt-6">
        {/* 横並びレイアウト: レーダーチャート左、カテゴリバー右 */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* レーダーチャート */}
          <div className="h-[280px] w-full">
            <ResponsiveRadar
              data={radarData}
              keys={["達成率"]}
              indexBy="category"
              maxValue={100}
              margin={{ top: 40, right: 60, bottom: 40, left: 60 }}
              borderColor={{ from: "color" }}
              gridLevels={5}
              gridShape="circular"
              dotSize={8}
              dotColor={{ theme: "background" }}
              dotBorderWidth={2}
              colors={["var(--primary)"]}
              fillOpacity={0.25}
              blendMode="multiply"
              motionConfig="gentle"
              theme={{
                text: {
                  fontFamily: "var(--font-secondary, IBM Plex Mono, monospace)",
                  fontSize: 11,
                },
                grid: {
                  line: {
                    stroke: "var(--border)",
                    strokeWidth: 1,
                  },
                },
              }}
            />
          </div>

          {/* カテゴリ別達成率 */}
          <div className="flex flex-col justify-center gap-4">
            <span className="font-[family-name:var(--font-primary)] text-sm font-medium text-foreground">
              カテゴリ別達成率
            </span>
            {data.categories.map((c, i) => (
              <div key={c.categoryLarge} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="font-[family-name:var(--font-primary)] text-sm text-foreground">
                    {c.categoryLarge}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={c.percentage}
                    className="h-2 flex-1"
                    style={
                      {
                        "--progress-color": CHART_COLORS[i % CHART_COLORS.length],
                      } as React.CSSProperties
                    }
                  />
                  <span className="w-10 text-right font-mono text-xs text-muted-foreground">
                    {c.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
