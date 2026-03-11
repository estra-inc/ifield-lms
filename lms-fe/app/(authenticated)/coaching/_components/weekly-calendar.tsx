"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Loader2 } from "lucide-react"

import { Card } from "@/components/ui/card"
import type { CoachingGenre } from "@/lib/types/database"

interface AvailableSlot {
  date: string
  startTime: string
  endTime: string
}

interface WeeklyCalendarProps {
  genre: CoachingGenre
  onSlotSelect: (slot: AvailableSlot) => void
}

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** 曜日ヘッダーのスタイル */
function getDayHeaderStyle(index: number): string {
  if (index === 5) return "text-indigo-600"
  if (index === 6) return "text-red-600"
  return "text-foreground"
}

/** スロットの日付配列を月曜始まりの週単位にグループ化 */
function groupSlotsByWeek(slots: AvailableSlot[]): { weekStart: Date; weekEnd: Date; slots: AvailableSlot[] }[] {
  if (slots.length === 0) return []

  // 全日付を取得してソート
  const allDates = [...new Set(slots.map((s) => s.date))].sort()
  if (allDates.length === 0) return []

  const firstDate = new Date(allDates[0] + "T00:00:00")
  const lastDate = new Date(allDates[allDates.length - 1] + "T00:00:00")

  // 最初の月曜日
  const mondayOffset = (firstDate.getDay() + 6) % 7
  const firstMonday = addDays(firstDate, -mondayOffset)

  const weeks: { weekStart: Date; weekEnd: Date; slots: AvailableSlot[] }[] = []
  let currentMonday = new Date(firstMonday)

  while (currentMonday <= lastDate) {
    const sunday = addDays(currentMonday, 6)
    const mondayStr = formatDateStr(currentMonday)
    const sundayStr = formatDateStr(sunday)
    const weekSlots = slots.filter((s) => s.date >= mondayStr && s.date <= sundayStr)
    weeks.push({ weekStart: new Date(currentMonday), weekEnd: sunday, slots: weekSlots })
    currentMonday = addDays(currentMonday, 7)
  }

  return weeks
}

export function WeeklyCalendar({ genre, onSlotSelect }: WeeklyCalendarProps) {
  const [allSlots, setAllSlots] = useState<AvailableSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [slotDuration, setSlotDuration] = useState(60)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/coaching/available-slots?genre=${genre}`)
      const text = await res.text()
      if (!text) {
        setError(`APIが空のレスポンスを返しました (${res.status})`)
        return
      }
      const data = JSON.parse(text)
      if (res.ok) {
        setAllSlots(data.slots ?? [])
        setSlotDuration(data.slotDurationMinutes ?? 60)
      } else {
        setError(data.error ?? `APIエラー (${res.status})`)
      }
    } catch (err) {
      setError("空き枠の取得に失敗しました")
      console.error("Failed to fetch slots:", err)
    } finally {
      setIsLoading(false)
    }
  }, [genre])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  const weeks = useMemo(() => groupSlotsByWeek(allSlots), [allSlots])
  const safeWeekIndex = Math.min(currentWeekIndex, Math.max(0, weeks.length - 1))
  const currentWeek = weeks[safeWeekIndex]

  // 現在の週の月〜日の7日間
  const weekDays: (Date | null)[] = useMemo(() => {
    if (!currentWeek) return Array(7).fill(null)
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek.weekStart, i))
  }, [currentWeek])

  // 週ラベル
  const weekLabel = currentWeek
    ? `${currentWeek.weekStart.getMonth() + 1}/${currentWeek.weekStart.getDate()} – ${currentWeek.weekEnd.getMonth() + 1}/${currentWeek.weekEnd.getDate()}`
    : ""

  // 各日のスロットを date_startTime キーでマップ化
  const slotsByDateAndTime = useMemo(() => {
    const map = new Map<string, AvailableSlot>()
    for (const slot of currentWeek?.slots ?? []) {
      map.set(`${slot.date}_${slot.startTime}`, slot)
    }
    return map
  }, [currentWeek])

  // 今週の全スロットから表示する時間行を算出（重複なしソート済み）
  const timeRows = useMemo(() => {
    const times = new Set<string>()
    for (const slot of currentWeek?.slots ?? []) {
      times.add(slot.startTime)
    }
    return Array.from(times).sort()
  }, [currentWeek])

  const todayStr = new Date().toDateString()

  // ローディング
  if (isLoading) {
    return (
      <Card className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  // エラー
  if (error) {
    return (
      <Card className="p-6">
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      </Card>
    )
  }

  // スロットなし
  if (weeks.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-sm text-muted-foreground py-8">
          現在、予約可能な枠はありません
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 週ナビゲーション */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentWeekIndex(Math.max(0, safeWeekIndex - 1))}
          disabled={safeWeekIndex === 0}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← 前の週
        </button>
        <span className="text-sm font-semibold tabular-nums">
          {weekLabel}
        </span>
        <button
          type="button"
          onClick={() => setCurrentWeekIndex(Math.min(weeks.length - 1, safeWeekIndex + 1))}
          disabled={safeWeekIndex >= weeks.length - 1}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          次の週 →
        </button>
      </div>

      {/* 週間カレンダーテーブル */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[560px] border-collapse table-fixed">
          <colgroup>
            <col className="w-14" />
            {weekDays.map((_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-muted/30">
              <th className="h-12 text-[10px] font-semibold text-muted-foreground text-center border-b border-border" />
              {weekDays.map((date, i) => {
                const isToday = date !== null && date.toDateString() === todayStr
                return (
                  <th
                    key={i}
                    className="h-12 text-center border-l border-b border-border px-1"
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span className={`text-[10px] font-semibold leading-none ${getDayHeaderStyle(i)}`}>
                        {WEEKDAY_LABELS[i]}
                      </span>
                      {date ? (
                        isToday ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono font-bold leading-none">
                            {date.getDate()}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-muted-foreground leading-none">
                            {date.getDate()}
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] font-mono text-muted-foreground/20 leading-none">
                          –
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {timeRows.map((time, rowIdx) => {
              const isLastRow = rowIdx === timeRows.length - 1
              const isHalfHour = time.endsWith(":30")
              const borderStyle = isLastRow ? "" : isHalfHour ? "border-b border-dashed border-border" : "border-b border-foreground/20"
              return (
                <tr key={time} className={borderStyle}>
                  <td className="text-[10px] text-muted-foreground text-center font-mono w-14 py-2 h-10">
                    {time}
                  </td>
                  {weekDays.map((date, dayIndex) => {
                    if (!date) {
                      return (
                        <td
                          key={dayIndex}
                          className="border-l border-border bg-muted/10 h-10"
                        />
                      )
                    }
                    const dateStr = formatDateStr(date)
                    const slot = slotsByDateAndTime.get(`${dateStr}_${time}`)

                    if (slot) {
                      return (
                        <td
                          key={dayIndex}
                          className="border-l border-border p-0.5 h-10 bg-primary/15 hover:bg-primary/25 cursor-pointer transition-colors"
                          onClick={() => onSlotSelect(slot)}
                        >
                          <div className="flex items-center justify-center h-full text-[10px] font-mono leading-tight">
                            <span className="text-foreground">{slot.startTime}</span>
                            <span className="text-muted-foreground ml-0.5">– {slot.endTime}</span>
                          </div>
                        </td>
                      )
                    }

                    return (
                      <td
                        key={dayIndex}
                        className="border-l border-border h-10"
                      />
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-6 rounded-sm bg-primary/15" />
          <span>予約可能</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-bold">
            {new Date().getDate()}
          </div>
          <span>今日</span>
        </div>
        <span>1枠: {slotDuration}分 — クリックで予約</span>
      </div>
    </div>
  )
}
