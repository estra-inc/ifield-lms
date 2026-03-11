"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { formatLocalDate } from "@/lib/utils/week-helpers"
import { TrendingUp, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export interface DailyBar {
  label: string
  hours: number
  isToday?: boolean
}

export interface LearningHoursChartProps {
  monthlyData: DailyBar[]
  weeklyData: DailyBar[]
  monthLabel: string
  weekLabel: string
  /** 現在表示中の月 "YYYY-MM" */
  currentMonthKey: string
  /** 現在表示中の週の月曜日 "YYYY-MM-DD" */
  currentWeekStart: string
  /** 月次目標時間（未設定の場合 null） */
  monthlyTargetHours: number | null
  /** 週次目標時間（未設定の場合 null） */
  weeklyTargetHours: number | null
  /** アカウント作成日（ナビゲーション範囲制限用） */
  accountCreatedAt: string
  /** ナビゲーション先のベースパス（デフォルト: "/goals"） */
  basePath?: string
}

/**
 * 学習時間折れ線グラフ（月/週タブ切替 + 前後ナビゲーション）
 */
export function LearningHoursChart({
  monthlyData,
  weeklyData,
  monthLabel,
  weekLabel,
  currentMonthKey,
  currentWeekStart,
  monthlyTargetHours,
  weeklyTargetHours,
  accountCreatedAt,
  basePath = "/goals",
}: LearningHoursChartProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const navigate = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        params.set(key, value)
      }
      router.push(`${basePath}?${params.toString()}`)
    },
    [router, searchParams, basePath]
  )

  const handleMonthPrev = () => {
    const [y, m] = currentMonthKey.split("-").map(Number)
    const d = new Date(y, m - 2, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    navigate({ chartMonth: key })
  }

  const handleMonthNext = () => {
    const [y, m] = currentMonthKey.split("-").map(Number)
    const d = new Date(y, m, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    navigate({ chartMonth: key })
  }

  const handleWeekPrev = () => {
    const d = new Date(currentWeekStart + "T00:00:00")
    d.setDate(d.getDate() - 7)
    navigate({ chartWeek: formatLocalDate(d) })
  }

  const handleWeekNext = () => {
    const d = new Date(currentWeekStart + "T00:00:00")
    d.setDate(d.getDate() + 7)
    navigate({ chartWeek: formatLocalDate(d) })
  }

  // 月次: 日次目標 = 月次目標 / 月の日数
  const monthlyDailyTarget =
    monthlyTargetHours != null
      ? Math.round((monthlyTargetHours / monthlyData.length) * 10) / 10
      : null

  // 週次: 日次目標 = 週次目標 / 7
  const weeklyDailyTarget =
    weeklyTargetHours != null
      ? Math.round((weeklyTargetHours / 7) * 10) / 10
      : null

  // 今日の月/週を算出して、表示中の期間と比較
  const now = new Date()
  const todayMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const todayDayOfWeek = now.getDay()
  const mondayOffset = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1
  const todayMonday = new Date(now)
  todayMonday.setDate(now.getDate() - mondayOffset)
  const todayWeekStart = formatLocalDate(todayMonday)

  const isCurrentMonth = currentMonthKey === todayMonthKey
  const isCurrentWeek = currentWeekStart === todayWeekStart

  // アカウント作成日に基づくナビゲーション範囲制限
  const created = new Date(accountCreatedAt)
  const createdMonthKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`
  const createdDow = created.getDay()
  const createdMondayOffset = createdDow === 0 ? 6 : createdDow - 1
  const createdMonday = new Date(created)
  createdMonday.setDate(created.getDate() - createdMondayOffset)
  const createdWeekStart = formatLocalDate(createdMonday)

  const canMonthPrev = currentMonthKey > createdMonthKey
  const canWeekPrev = currentWeekStart > createdWeekStart

  const handleMonthToday = () => {
    navigate({ chartMonth: todayMonthKey })
  }

  const handleWeekToday = () => {
    navigate({ chartWeek: todayWeekStart })
  }

  return (
    <Card>
      <Tabs defaultValue="month">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <CardTitle className="text-base">学習時間の推移</CardTitle>
          </div>
          <TabsList>
            <TabsTrigger value="month">月</TabsTrigger>
            <TabsTrigger value="week">週</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          <TabsContent value="month" className="mt-0">
            <LineChartView
              data={monthlyData}
              caption={monthLabel}
              onPrev={handleMonthPrev}
              onNext={handleMonthNext}
              canPrev={canMonthPrev}
              onToday={handleMonthToday}
              isCurrentPeriod={isCurrentMonth}
              dailyTarget={monthlyDailyTarget}
            />
          </TabsContent>
          <TabsContent value="week" className="mt-0">
            <LineChartView
              data={weeklyData}
              caption={weekLabel}
              onPrev={handleWeekPrev}
              onNext={handleWeekNext}
              canPrev={canWeekPrev}
              onToday={handleWeekToday}
              isCurrentPeriod={isCurrentWeek}
              dailyTarget={weeklyDailyTarget}
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}

/**
 * Y 軸の目盛りを算出（0 から maxValue まで、きりのいい間隔で）
 */
function computeYTicks(maxValue: number): { ticks: number[]; yMax: number } {
  if (maxValue <= 0) {
    return { ticks: [0, 1, 2], yMax: 2 }
  }

  // きりのいいステップを決定
  const rawStep = maxValue / 4
  const candidates = [0.5, 1, 2, 3, 4, 5, 10, 20]
  const step = candidates.find((c) => c >= rawStep) ?? Math.ceil(rawStep)

  const yMax = Math.ceil(maxValue / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= yMax; v += step) {
    ticks.push(Math.round(v * 10) / 10)
  }

  return { ticks, yMax }
}

function LineChartView({
  data,
  caption,
  onPrev,
  onNext,
  canPrev,
  onToday,
  isCurrentPeriod,
  dailyTarget,
}: {
  data: DailyBar[]
  caption: string
  onPrev: () => void
  onNext: () => void
  canPrev: boolean
  onToday: () => void
  isCurrentPeriod: boolean
  dailyTarget: number | null
}) {
  const totalHours = data.reduce((sum, d) => sum + d.hours, 0)
  const maxHours = Math.max(...data.map((d) => d.hours), dailyTarget ?? 0, 1)

  const { ticks, yMax } = computeYTicks(maxHours)

  // viewBox ベースのレイアウト定数（SVG は width="100%" でカード幅に追従）
  const PADDING_LEFT = 44
  const PADDING_RIGHT = dailyTarget != null ? 92 : 36
  const PADDING_TOP = 20
  const PADDING_BOTTOM = 28
  const CHART_HEIGHT = 180
  const VIEWBOX_WIDTH = 720
  const CHART_WIDTH = VIEWBOX_WIDTH - PADDING_LEFT - PADDING_RIGHT
  const VIEWBOX_HEIGHT = PADDING_TOP + CHART_HEIGHT + PADDING_BOTTOM

  const isCompact = data.length > 10

  // 座標変換ヘルパー
  const xPos = (i: number) =>
    PADDING_LEFT +
    (data.length > 1
      ? (i / (data.length - 1)) * CHART_WIDTH
      : CHART_WIDTH / 2)

  const yPos = (hours: number) =>
    PADDING_TOP + CHART_HEIGHT - (hours / yMax) * CHART_HEIGHT

  // 折れ線パスを構築
  const linePath = data
    .map((d, i) => {
      const x = xPos(i)
      const y = yPos(d.hours)
      return `${i === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")

  // 塗りつぶし領域パス（折れ線の下を薄く塗る）
  const areaPath = `${linePath} L ${xPos(data.length - 1)} ${yPos(0)} L ${xPos(0)} ${yPos(0)} Z`

  return (
    <div className="flex flex-col gap-3">
      {/* ナビゲーション + サマリー行 */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="前の期間"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">{caption}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onNext}
          aria-label="次の期間"
        >
          <ChevronRight className="size-4" />
        </Button>
        {!isCurrentPeriod && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={onToday}
          >
            今日
          </Button>
        )}
        <span className="ml-auto text-sm font-semibold">
          合計 {totalHours}h
        </span>
      </div>

      {/* 折れ線グラフ（width="100%" でカード幅いっぱいに描画） */}
      <svg
        width="100%"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="select-none"
      >
        {/* Y 軸グリッド線 + ラベル */}
        {ticks.map((tick) => {
          const y = yPos(tick)
          return (
            <g key={tick}>
              <line
                x1={PADDING_LEFT}
                y1={y}
                x2={PADDING_LEFT + CHART_WIDTH}
                y2={y}
                className="stroke-border"
                strokeWidth={0.5}
              />
              <text
                x={PADDING_LEFT - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={11}
              >
                {tick}h
              </text>
            </g>
          )
        })}

        {/* 目標線（横の破線）+ グラフ右外にラベル */}
        {dailyTarget != null && dailyTarget > 0 && (
          <g>
            <line
              x1={PADDING_LEFT}
              y1={yPos(dailyTarget)}
              x2={PADDING_LEFT + CHART_WIDTH}
              y2={yPos(dailyTarget)}
              className="stroke-amber-500"
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
            <text
              x={PADDING_LEFT + CHART_WIDTH + 8}
              y={yPos(dailyTarget) + 3}
              textAnchor="start"
              className="fill-amber-600"
              fontSize={10}
              fontWeight={600}
            >
              目標
            </text>
            <text
              x={PADDING_LEFT + CHART_WIDTH + 8}
              y={yPos(dailyTarget) + 15}
              textAnchor="start"
              className="fill-amber-600"
              fontSize={10}
              fontWeight={600}
            >
              {dailyTarget}h/日
            </text>
          </g>
        )}

        {/* 塗りつぶし領域 */}
        <path d={areaPath} className="fill-primary/10" />

        {/* 折れ線 */}
        <path
          d={linePath}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* データポイント */}
        {data.map((d, i) => {
          const cx = xPos(i)
          const cy = yPos(d.hours)
          return (
            <g key={i}>
              {d.hours > 0 && (
                <text
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  className={
                    d.isToday
                      ? "fill-primary font-semibold"
                      : "fill-muted-foreground"
                  }
                  fontSize={10}
                >
                  {d.hours}
                </text>
              )}
              <circle
                cx={cx}
                cy={cy}
                r={d.isToday ? 4 : 3}
                className={
                  d.isToday
                    ? "fill-primary"
                    : d.hours > 0
                      ? "fill-primary/70"
                      : "fill-muted-foreground/40"
                }
              />
            </g>
          )
        })}

        {/* X 軸ラベル */}
        {data.map((d, i) => {
          // コンパクトモードではラベルを間引く
          if (isCompact && i % Math.ceil(data.length / 15) !== 0 && !d.isToday) {
            return null
          }
          return (
            <text
              key={i}
              x={xPos(i)}
              y={PADDING_TOP + CHART_HEIGHT + 18}
              textAnchor="middle"
              className={
                d.isToday
                  ? "fill-primary font-bold"
                  : "fill-muted-foreground"
              }
              fontSize={isCompact ? 9 : 11}
            >
              {d.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
