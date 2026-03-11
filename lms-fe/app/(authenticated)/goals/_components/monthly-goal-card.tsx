"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { CalendarDays, TrendingUp } from "lucide-react"
import { upsertMonthlyGoal } from "@/app/(authenticated)/goals/actions"
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

export interface MonthlyGoalCardProps {
  currentMonth: string
  yearMonth: string
  actualHours: number
  currentGoal: {
    targetHours: number
  } | null
  availableMonths: Array<{
    yearMonth: string
    label: string
  }>
}

/**
 * 月次目標カード (Client Component)
 *
 * 月次目標の進捗セクション（実績/目標、プログレスバー、達成率）を表示し、
 * 目標時間の入力フォームで upsertMonthlyGoal Server Action と連携する。
 * 目標未設定時は目標設定を促すメッセージを表示する。
 */
export function MonthlyGoalCard({
  currentMonth,
  yearMonth,
  actualHours,
  currentGoal,
  availableMonths,
}: MonthlyGoalCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [selectedMonth, setSelectedMonth] = useState(yearMonth)

  // サーバーから渡される yearMonth が変わったら同期（スーパーリロード時など）
  useEffect(() => {
    setSelectedMonth(yearMonth)
  }, [yearMonth])

  const [state, formAction] = useActionState<ActionResult, FormData>(
    upsertMonthlyGoal,
    null
  )

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message)
    } else if (state && !state.success) {
      toast.error(state.message)
    }
  }, [state])

  // 今月の YYYY-MM
  const now = new Date()
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const isCurrentMonth = yearMonth === currentYearMonth

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", value)
    startTransition(() => {
      router.push(`/goals?${params.toString()}`)
    })
  }

  const handleGoToToday = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("month")
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `/goals?${qs}` : "/goals")
    })
  }

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
            <CalendarDays className="size-5 text-primary" />
            <CardTitle className="text-base">月次学習目標</CardTitle>
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentMonth && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={handleGoToToday}
              >
                今月
              </Button>
            )}
            {/* 月セレクター */}
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-40" size="sm">
                <SelectValue placeholder="月を選択" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((month) => (
                  <SelectItem key={month.yearMonth} value={month.yearMonth}>
                    {month.label}
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
            {/* 実績 / 目標 */}
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">
                {actualHours}
              </span>
              <span className="text-sm text-muted-foreground">
                / {targetHours} h
              </span>
            </div>

            {/* プログレスバー */}
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
            <CalendarDays className="size-8 opacity-40" />
            <p className="text-sm">月次目標が設定されていません</p>
            <p className="text-xs">下のフォームから目標を設定しましょう</p>
          </div>
        )}

        {/* 目標設定フォーム */}
        <form action={formAction} className="flex flex-col gap-3 border-t pt-4">
          <input type="hidden" name="year_month" value={yearMonth} />
          <Label htmlFor="monthly_target_hours" className="text-sm">
            目標時間
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="monthly_target_hours"
              name="target_hours"
              type="number"
              step="0.5"
              min="0.5"
              defaultValue={currentGoal?.targetHours ?? ""}
              placeholder="例: 40"
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

          {/* エラーメッセージ */}
          {state && !state.success && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
