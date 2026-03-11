"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Clock, TrendingUp } from "lucide-react"
import { formatLocalDate } from "@/lib/utils/week-helpers"
import { upsertWeeklyGoal } from "@/app/(authenticated)/goals/actions"
import type { ActionResult } from "@/lib/validations/auth"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/ui/submit-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface WeeklyGoalCardProps {
  currentWeekLabel: string
  startDate: string
  endDate: string
  actualHours: number
  currentGoal: {
    targetHours: number
  } | null
  availableWeeks: Array<{
    startDate: string
    endDate: string
    label: string
  }>
  /** 前週の目標時間（未設定時は null） */
  previousWeekTargetHours: number | null
  /** 月次目標から算出した参考週次目標時間（月次目標未設定時は null） */
  suggestedWeeklyHours: number | null
}

/**
 * 週次目標カード (Client Component)
 *
 * 週セレクターで任意の週を選択し、進捗表示 + 目標設定フォームを提供する。
 * 週を切り替えると対応する目標と実績データを再フェッチする。
 */
export function WeeklyGoalCard({
  currentWeekLabel,
  startDate,
  endDate,
  actualHours,
  currentGoal,
  availableWeeks,
  previousWeekTargetHours,
  suggestedWeeklyHours,
}: WeeklyGoalCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [selectedWeek, setSelectedWeek] = useState(startDate)

  // サーバーから渡される startDate が変わったら同期（スーパーリロード時など）
  useEffect(() => {
    setSelectedWeek(startDate)
  }, [startDate])

  const [state, formAction] = useActionState<ActionResult, FormData>(
    upsertWeeklyGoal,
    null
  )

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message)
    } else if (state && !state.success) {
      toast.error(state.message)
    }
  }, [state])

  // 今週の月曜日を算出
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const currentMonday = new Date(now)
  currentMonday.setDate(now.getDate() - mondayOffset)
  const currentWeekStart = formatLocalDate(currentMonday)
  const isCurrentWeek = startDate === currentWeekStart

  // 週の選択変更時にページをリロードして該当週のデータを取得
  const handleWeekChange = (value: string) => {
    setSelectedWeek(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set("week", value)
    startTransition(() => {
      router.push(`/goals?${params.toString()}`)
    })
  }

  const handleGoToToday = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("week")
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `/goals?${qs}` : "/goals")
    })
  }

  const selectedWeekData = availableWeeks.find((w) => w.startDate === selectedWeek)
  const selectedEndDate = selectedWeekData?.endDate ?? endDate

  const targetHours = currentGoal?.targetHours ?? null
  const percentage =
    targetHours !== null && targetHours > 0
      ? Math.round((actualHours / targetHours) * 100)
      : null

  return (
    <Card className="flex-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <CardTitle className="text-base">週次学習目標</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentWeek && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleGoToToday}
              >
                今週
              </Button>
            )}
            {/* 週セレクター */}
            <Select value={selectedWeek} onValueChange={handleWeekChange}>
              <SelectTrigger className="w-40" size="sm">
                <SelectValue placeholder="週を選択" />
              </SelectTrigger>
              <SelectContent>
                {availableWeeks.map((week) => (
                  <SelectItem key={week.startDate} value={week.startDate}>
                    {week.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* 進捗セクション */}
        {currentGoal !== null ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">
                {actualHours}
              </span>
              <span className="text-sm text-muted-foreground">
                / {targetHours} h
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="h-3 w-full overflow-hidden bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(percentage ?? 0, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="size-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  達成率 {percentage}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
            <Clock className="size-8 opacity-40" />
            <p className="text-sm">この週の目標が設定されていません</p>
            <p className="text-xs">下のフォームから目標を設定しましょう</p>
          </div>
        )}

        {/* 月次目標からの参考値 */}
        {suggestedWeeklyHours != null && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2.5">
            <TrendingUp className="size-4 shrink-0 text-primary mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              月次目標を達成するには、週あたり約{" "}
              <span className="font-semibold text-foreground">
                {suggestedWeeklyHours}h
              </span>{" "}
              の学習が目安です
            </p>
          </div>
        )}

        {/* 目標設定フォーム */}
        <form action={formAction} className="flex flex-col gap-3 border-t pt-4">
          <input type="hidden" name="start_date" value={selectedWeek} />
          <input type="hidden" name="end_date" value={selectedEndDate} />
          <Label htmlFor="weekly_target_hours" className="text-sm">
            目標時間
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="weekly_target_hours"
              name="target_hours"
              type="number"
              step="0.5"
              min="0.5"
              defaultValue={currentGoal?.targetHours ?? previousWeekTargetHours ?? ""}
              placeholder="例: 10"
              required
              className="w-28"
            />
            <span className="text-sm text-muted-foreground font-medium">h</span>
            <SubmitButton
              pendingText="保存中..."
              size="sm"
              className="ml-auto"
            >
              {currentGoal ? "更新" : "設定"}
            </SubmitButton>
          </div>

          {state && !state.success && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

