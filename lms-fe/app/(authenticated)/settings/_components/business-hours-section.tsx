"use client"

import {
  useState,
  useTransition,
  useActionState,
  useEffect,
  useRef,
  useCallback,
} from "react"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { updateBusinessHours } from "@/app/(authenticated)/settings/actions"
import type { ActionResult } from "@/lib/validations/auth"
import type { BusinessHours, CoachingGenre, GenreBusinessHours } from "@/lib/types/database"
import { isGenreBusinessHours } from "@/lib/utils/coaching-slots"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"

// ---- 定数定義 ----

/** 曜日キー定義 */
const DAYS_OF_WEEK = [
  { key: "mon", label: "月" },
  { key: "tue", label: "火" },
  { key: "wed", label: "水" },
  { key: "thu", label: "木" },
  { key: "fri", label: "金" },
  { key: "sat", label: "土" },
  { key: "sun", label: "日" },
] as const

/** 時間帯の開始・終了 (HH:MM) */
const START_HOUR = 0
const END_HOUR = 24

/** 時間帯ラベルを生成 (00:00 〜 23:00) */
function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = START_HOUR; h < END_HOUR; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`)
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

/** 時間帯ラベルからスロットキーを生成 (例: "mon" + "09:00" -> "mon_0900") */
function toSlotKey(dayKey: string, time: string): string {
  return `${dayKey}_${time.replace(":", "")}`
}

// ---- Props ----

interface BusinessHoursSectionProps {
  initialBusinessHours: BusinessHours | GenreBusinessHours | null
}

// ---- デフォルト値 ----

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  slots: {},
  holidayShift: false,
  bufferMinutes: 0,
  slotDurationMinutes: 60,
  bookingLeadDays: 1,
  bookingWindowWeeks: 2,
}

/**
 * BusinessHoursSection (Client Component)
 *
 * 週間カレンダーグリッドで稼働/非稼働時間を管理するセクション。
 * - 7列（月〜日）x 時間帯行のグリッドレイアウト
 * - ドラッグ選択: クリック&ドラッグで複数セルをまとめて稼働/非稼働に切替
 * - useState でローカル状態管理、保存ボタンで Server Action へ送信
 * - オプション: 祝日シフト設定、確保時間、スロット時間
 * - モバイル対応: 横スクロール可能なテーブルレイアウト
 */
/** 初期値から GenreBusinessHours を構築（後方互換対応） */
function resolveInitialGenreHours(raw: BusinessHours | GenreBusinessHours | null): GenreBusinessHours {
  if (!raw) return { engineering: DEFAULT_BUSINESS_HOURS, design: DEFAULT_BUSINESS_HOURS }
  if (isGenreBusinessHours(raw)) return raw
  // 旧形式: 両ジャンルに同じ値をコピー
  return { engineering: raw, design: { ...raw, slots: { ...raw.slots } } }
}

const GENRE_LABELS: Record<CoachingGenre, string> = {
  engineering: "エンジニアリング",
  design: "デザイン",
}

export function BusinessHoursSection({
  initialBusinessHours,
}: BusinessHoursSectionProps) {
  const initialGenre = resolveInitialGenreHours(initialBusinessHours)

  // ---- ジャンルタブ ----
  const [genreTab, setGenreTab] = useState<CoachingGenre>("engineering")

  // ---- ジャンル別ローカル状態 ----
  const [genreSlots, setGenreSlots] = useState<Record<CoachingGenre, Record<string, boolean>>>({
    engineering: initialGenre.engineering.slots,
    design: initialGenre.design.slots,
  })
  const [genreHolidayShift, setGenreHolidayShift] = useState<Record<CoachingGenre, boolean>>({
    engineering: initialGenre.engineering.holidayShift,
    design: initialGenre.design.holidayShift,
  })
  const [genreBufferMinutes, setGenreBufferMinutes] = useState<Record<CoachingGenre, number>>({
    engineering: initialGenre.engineering.bufferMinutes,
    design: initialGenre.design.bufferMinutes,
  })
  const [genreSlotDuration, setGenreSlotDuration] = useState<Record<CoachingGenre, number>>({
    engineering: initialGenre.engineering.slotDurationMinutes,
    design: initialGenre.design.slotDurationMinutes,
  })
  const [genreLeadDays, setGenreLeadDays] = useState<Record<CoachingGenre, number>>({
    engineering: initialGenre.engineering.bookingLeadDays ?? 1,
    design: initialGenre.design.bookingLeadDays ?? 1,
  })
  const [genreWindowWeeks, setGenreWindowWeeks] = useState<Record<CoachingGenre, number>>({
    engineering: initialGenre.engineering.bookingWindowWeeks ?? 2,
    design: initialGenre.design.bookingWindowWeeks ?? 2,
  })

  // 現在のジャンルの値へのアクセサ
  const slots = genreSlots[genreTab]
  const setSlots = useCallback((updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    setGenreSlots((prev) => ({
      ...prev,
      [genreTab]: typeof updater === "function" ? updater(prev[genreTab]) : updater,
    }))
  }, [genreTab])
  const holidayShift = genreHolidayShift[genreTab]
  const setHolidayShift = useCallback((v: boolean) => {
    setGenreHolidayShift((prev) => ({ ...prev, [genreTab]: v }))
  }, [genreTab])
  const bufferMinutes = genreBufferMinutes[genreTab]
  const setBufferMinutes = useCallback((v: number) => {
    setGenreBufferMinutes((prev) => ({ ...prev, [genreTab]: v }))
  }, [genreTab])
  const slotDurationMinutes = genreSlotDuration[genreTab]
  const setSlotDurationMinutes = useCallback((v: number | ((prev: number) => number)) => {
    setGenreSlotDuration((prev) => ({
      ...prev,
      [genreTab]: typeof v === "function" ? v(prev[genreTab]) : v,
    }))
  }, [genreTab])
  const bookingLeadDays = genreLeadDays[genreTab]
  const setBookingLeadDays = useCallback((v: number) => {
    setGenreLeadDays((prev) => ({ ...prev, [genreTab]: v }))
  }, [genreTab])
  const bookingWindowWeeks = genreWindowWeeks[genreTab]
  const setBookingWindowWeeks = useCallback((v: number) => {
    setGenreWindowWeeks((prev) => ({ ...prev, [genreTab]: v }))
  }, [genreTab])

  // ---- ドラッグ選択状態 ----
  // painting: ドラッグ中に適用する値 (true=稼働にする, false=非稼働にする, null=ドラッグ中でない)
  const paintingRef = useRef<boolean | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // ---- Server Action ----
  const [isPending, startTransition] = useTransition()
  const [state, formAction] = useActionState<ActionResult, FormData>(
    updateBusinessHours,
    null
  )

  // state が変わったら toast を表示
  const prevStateRef = useRef(state)
  useEffect(() => {
    if (state === prevStateRef.current) return
    prevStateRef.current = state

    if (state?.success) {
      toast.success(state.message)
    } else if (state && !state.success) {
      toast.error(state.message)
    }
  }, [state])

  /** ドラッグ開始: クリックしたセルの現在の状態を反転してペイントモードを決定 */
  const handlePointerDown = useCallback(
    (slotKey: string) => {
      if (isPending) return
      const newValue = !slots[slotKey]
      paintingRef.current = newValue
      setIsDragging(true)
      setSlots((prev) => ({ ...prev, [slotKey]: newValue }))
    },
    [slots, isPending]
  )

  /** ドラッグ中: ペイントモードの値をセルに適用 */
  const handlePointerEnter = useCallback(
    (slotKey: string) => {
      if (paintingRef.current === null) return
      setSlots((prev) => ({ ...prev, [slotKey]: paintingRef.current! }))
    },
    []
  )

  /** ドラッグ終了 */
  const handlePointerUp = useCallback(() => {
    paintingRef.current = null
    setIsDragging(false)
  }, [])

  // グローバルなpointerup/pointercancel でドラッグを終了
  useEffect(() => {
    const stop = () => {
      paintingRef.current = null
      setIsDragging(false)
    }
    window.addEventListener("pointerup", stop)
    window.addEventListener("pointercancel", stop)
    return () => {
      window.removeEventListener("pointerup", stop)
      window.removeEventListener("pointercancel", stop)
    }
  }, [])

  /** 保存ボタン押下時に Server Action へ送信（GenreBusinessHours 形式） */
  const handleSave = () => {
    const genreBusinessHours: GenreBusinessHours = {
      engineering: {
        slots: genreSlots.engineering,
        holidayShift: genreHolidayShift.engineering,
        bufferMinutes: genreBufferMinutes.engineering,
        slotDurationMinutes: genreSlotDuration.engineering,
        bookingLeadDays: genreLeadDays.engineering,
        bookingWindowWeeks: genreWindowWeeks.engineering,
      },
      design: {
        slots: genreSlots.design,
        holidayShift: genreHolidayShift.design,
        bufferMinutes: genreBufferMinutes.design,
        slotDurationMinutes: genreSlotDuration.design,
        bookingLeadDays: genreLeadDays.design,
        bookingWindowWeeks: genreWindowWeeks.design,
      },
    }

    const formData = new FormData()
    formData.set("businessHours", JSON.stringify(genreBusinessHours))

    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <div className="rounded-lg border bg-card p-6 flex flex-col gap-5">
      {/* タイトル & 説明 */}
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">稼働時間枠設定</h3>
        <p className="text-xs text-muted-foreground">
          コーチング予約が可能な時間帯を設定します。受講生はこの時間枠内でのみ予約が可能です。
        </p>
      </div>

      <Separator />

      <Tabs defaultValue="settings" className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="settings">設定</TabsTrigger>
          <TabsTrigger value="preview">プレビュー</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4 flex flex-col gap-5">

      {/* ジャンルタブ */}
      <div className="flex items-center gap-2">
        {(["engineering", "design"] as const).map((genre) => (
          <button
            key={genre}
            type="button"
            onClick={() => setGenreTab(genre)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              genreTab === genre
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {GENRE_LABELS[genre]}
          </button>
        ))}
      </div>

      {/* 週間カレンダーグリッド -- ドラッグ選択対応 */}
      <div
        className="overflow-x-auto"
        onPointerUp={handlePointerUp}
      >
        <table
          className={`w-full min-w-[560px] border-collapse ${isDragging ? "select-none" : ""}`}
        >
          <thead>
            <tr>
              <th className="w-14 h-9 text-[10px] font-semibold text-muted-foreground text-center">
                時間
              </th>
              {DAYS_OF_WEEK.map((day) => (
                <th
                  key={day.key}
                  className={`h-9 text-center text-[11px] font-semibold border-l border-border ${getDayHeaderStyle(day.key)}`}
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time, rowIndex) => (
              <tr
                key={time}
                className={rowIndex < TIME_SLOTS.length - 1 ? "border-b border-border" : ""}
              >
                <td className="h-8 text-[10px] text-muted-foreground text-center font-mono w-14">
                  {time}
                </td>
                {DAYS_OF_WEEK.map((day) => {
                  const slotKey = toSlotKey(day.key, time)
                  const isActive = !!slots[slotKey]
                  return (
                    <td key={slotKey} className="p-0 border-l border-border">
                      <div
                        onPointerDown={(e) => {
                          e.preventDefault()
                          handlePointerDown(slotKey)
                        }}
                        onPointerEnter={() => handlePointerEnter(slotKey)}
                        className={`w-full h-8 transition-colors cursor-pointer ${
                          isActive
                            ? "bg-primary/15 hover:bg-primary/25"
                            : "bg-transparent hover:bg-muted/50"
                        } ${isPending ? "pointer-events-none opacity-50" : ""}`}
                        role="gridcell"
                        aria-label={`${day.label} ${time} ${isActive ? "稼働" : "非稼働"}`}
                        aria-pressed={isActive}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-primary/30" />
          <span>稼働時間</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-muted border border-border" />
          <span>非稼働</span>
        </div>
        <span className="text-muted-foreground/60">
          — ドラッグで複数セルをまとめて選択できます
        </span>
      </div>

      {/* 曜日別稼働時間サマリー */}
      {(() => {
        let weekTotal = 0
        const daySummaries = DAYS_OF_WEEK.map((day) => {
          const ranges = getActiveRanges(day.key, slots)
          const hours = getActiveHoursCount(day.key, slots)
          weekTotal += hours
          return { ...day, ranges, hours }
        })

        return (
          <div className="rounded-md border bg-muted/30 p-4 flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1.5">
              {daySummaries.map((day) => (
                <div key={day.key} className="flex items-center gap-2">
                  <span className={`font-semibold w-4 shrink-0 ${getDayHeaderStyle(day.key)}`}>
                    {day.label}
                  </span>
                  <span className="text-muted-foreground font-mono flex-1 min-w-0 truncate">
                    {day.ranges.length > 0 ? day.ranges.join(", ") : "—"}
                  </span>
                  <span className={`font-mono tabular-nums shrink-0 ${day.hours > 0 ? "text-foreground font-medium" : "text-muted-foreground/50"}`}>
                    {day.hours}h
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2.5">
              <span className="font-semibold text-foreground">週合計</span>
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {weekTotal}h
              </span>
            </div>
          </div>
        )
      })()}

      {/* オプション設定 (横一列) */}
      <div className="flex flex-wrap items-center gap-6">
        {/* 祝日シフト */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="holidayShift"
            checked={holidayShift}
            onCheckedChange={(checked) => setHolidayShift(checked === true)}
            disabled={isPending}
          />
          <label htmlFor="holidayShift" className="text-xs font-medium cursor-pointer">
            祝日もシフトを入れる
          </label>
        </div>

        {/* 確保時間 */}
        <div className="flex items-center gap-2">
          <label htmlFor="bufferMinutes" className="text-xs font-medium">
            前後の確保時間
          </label>
          <Input
            id="bufferMinutes"
            type="number"
            min={0}
            max={120}
            value={bufferMinutes}
            onChange={(e) =>
              setBufferMinutes(Math.max(0, parseInt(e.target.value) || 0))
            }
            className="h-8 w-[72px] text-xs text-center"
            disabled={isPending}
          />
          <span className="text-xs text-muted-foreground">分</span>
        </div>

        {/* スロット時間 */}
        <div className="flex items-center gap-2">
          <label htmlFor="slotDurationMinutes" className="text-xs font-medium">
            1枠のスロット時間
          </label>
          <Input
            id="slotDurationMinutes"
            type="number"
            min={30}
            step={30}
            value={slotDurationMinutes}
            onChange={(e) => {
              const raw = parseInt(e.target.value) || 30
              const rounded = Math.max(30, Math.round(raw / 30) * 30)
              setSlotDurationMinutes(rounded)
            }}
            onBlur={() => {
              setSlotDurationMinutes((prev) => Math.max(30, Math.round(prev / 30) * 30))
            }}
            className="h-8 w-[72px] text-xs text-center"
            disabled={isPending}
          />
          <span className="text-xs text-muted-foreground">分（30分刻み）</span>
        </div>

        {/* 予約受付開始日 */}
        <div className="flex items-center gap-2">
          <label htmlFor="bookingLeadDays" className="text-xs font-medium">
            予約受付開始
          </label>
          <Input
            id="bookingLeadDays"
            type="number"
            min={0}
            max={30}
            value={bookingLeadDays}
            onChange={(e) =>
              setBookingLeadDays(Math.max(0, parseInt(e.target.value) || 0))
            }
            className="h-8 w-[72px] text-xs text-center"
            disabled={isPending}
          />
          <span className="text-xs text-muted-foreground">日後から</span>
        </div>

        {/* カレンダー表示範囲 */}
        <div className="flex items-center gap-2">
          <label htmlFor="bookingWindowWeeks" className="text-xs font-medium">
            カレンダー表示
          </label>
          <Input
            id="bookingWindowWeeks"
            type="number"
            min={1}
            max={12}
            value={bookingWindowWeeks}
            onChange={(e) =>
              setBookingWindowWeeks(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="h-8 w-[72px] text-xs text-center"
            disabled={isPending}
          />
          <span className="text-xs text-muted-foreground">週間先まで</span>
        </div>
      </div>

      <Separator />

      {/* 保存ボタン (右寄せ) */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          size="sm"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              変更を保存
            </>
          )}
        </Button>
      </div>

        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <PreviewView
            slots={slots}
            slotDurationMinutes={slotDurationMinutes}
            bufferMinutes={bufferMinutes}
            bookingLeadDays={bookingLeadDays}
            bookingWindowWeeks={bookingWindowWeeks}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---- ヘルパー関数 ----

/** 曜日ヘッダーのスタイルを返す */
function getDayHeaderStyle(dayKey: string): string {
  switch (dayKey) {
    case "sat":
      return "text-indigo-600"
    case "sun":
      return "text-red-600"
    default:
      return "text-foreground"
  }
}

/**
 * 指定曜日の連続した稼働時間帯を算出する
 * 例: 09:00, 10:00, 11:00, 13:00, 14:00 → ["09:00 - 12:00", "13:00 - 15:00"]
 */
function getActiveRanges(
  dayKey: string,
  slots: Record<string, boolean>
): string[] {
  const activeHours: number[] = []
  for (let h = START_HOUR; h < END_HOUR; h++) {
    const time = `${String(h).padStart(2, "0")}:00`
    const key = toSlotKey(dayKey, time)
    if (slots[key]) activeHours.push(h)
  }

  if (activeHours.length === 0) return []

  const ranges: string[] = []
  let rangeStart = activeHours[0]
  let prev = activeHours[0]

  for (let i = 1; i < activeHours.length; i++) {
    if (activeHours[i] === prev + 1) {
      prev = activeHours[i]
    } else {
      ranges.push(formatRange(rangeStart, prev + 1))
      rangeStart = activeHours[i]
      prev = activeHours[i]
    }
  }
  ranges.push(formatRange(rangeStart, prev + 1))
  return ranges
}

/** 指定曜日の稼働時間数を算出する */
function getActiveHoursCount(
  dayKey: string,
  slots: Record<string, boolean>
): number {
  let count = 0
  for (let h = START_HOUR; h < END_HOUR; h++) {
    const time = `${String(h).padStart(2, "0")}:00`
    const key = toSlotKey(dayKey, time)
    if (slots[key]) count++
  }
  return count
}

function formatRange(startHour: number, endHour: number): string {
  const s = `${String(startHour).padStart(2, "0")}:00`
  const e = `${String(endHour).padStart(2, "0")}:00`
  return `${s} – ${e}`
}

// ---- プレビュー用ヘルパー ----

interface TimeSlot {
  start: string
  end: string
}

/** Date から曜日キー ("mon"〜"sun") を取得 */
const JS_DAY_TO_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

function dateToDayKey(date: Date): string {
  return JS_DAY_TO_KEY[date.getDay()]
}

/**
 * 指定曜日の稼働スロットから予約可能な時間枠を算出
 */
function computeBookableSlots(
  dayKey: string,
  slots: Record<string, boolean>,
  slotDurationMinutes: number,
  bufferMinutes: number
): TimeSlot[] {
  const activeMinutes: number[] = []
  for (let h = START_HOUR; h < END_HOUR; h++) {
    const time = `${String(h).padStart(2, "0")}:00`
    const key = toSlotKey(dayKey, time)
    if (slots[key]) {
      for (let m = 0; m < 60; m++) {
        activeMinutes.push(h * 60 + m)
      }
    }
  }

  if (activeMinutes.length === 0) return []

  const blocks: { start: number; end: number }[] = []
  let blockStart = activeMinutes[0]
  let prev = activeMinutes[0]
  for (let i = 1; i < activeMinutes.length; i++) {
    if (activeMinutes[i] !== prev + 1) {
      blocks.push({ start: blockStart, end: prev + 1 })
      blockStart = activeMinutes[i]
    }
    prev = activeMinutes[i]
  }
  blocks.push({ start: blockStart, end: prev + 1 })

  const bookable: TimeSlot[] = []
  const step = slotDurationMinutes + bufferMinutes
  for (const block of blocks) {
    let cursor = block.start
    while (cursor + slotDurationMinutes <= block.end) {
      const startH = Math.floor(cursor / 60)
      const startM = cursor % 60
      const endMin = cursor + slotDurationMinutes
      const endH = Math.floor(endMin / 60)
      const endM = endMin % 60
      bookable.push({
        start: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
        end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
      })
      cursor += step
    }
  }

  return bookable
}

/** 日付を "M/D" 形式でフォーマット */
function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/** 日付を n 日進める（新しい Date を返す） */
function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** 予約受付開始日から表示期限までの日付配列を生成 */
function generatePreviewDates(
  bookingLeadDays: number,
  bookingWindowWeeks: number
): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = addDays(today, Math.max(1, bookingLeadDays))
  const endDate = addDays(today, bookingWindowWeeks * 7)
  const dates: Date[] = []
  let current = new Date(startDate)
  while (current <= endDate) {
    dates.push(new Date(current))
    current = addDays(current, 1)
  }
  return dates
}

/** 日付配列を月曜始まりの週単位にグループ化 */
function groupByWeek(dates: Date[]): Date[][] {
  if (dates.length === 0) return []
  const weeks: Date[][] = []
  let currentWeek: Date[] = []

  // 最初の日の週の月曜日を求める
  const firstDate = dates[0]
  const firstDayOfWeek = firstDate.getDay() // 0=日, 1=月, ...
  // 月曜始まりなので、月曜=0, 火=1, ..., 日=6 に変換
  const mondayOffset = (firstDayOfWeek + 6) % 7
  const weekStart = addDays(firstDate, -mondayOffset)

  for (const date of dates) {
    const daysSinceWeekStart = Math.floor(
      (date.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    const weekIndex = Math.floor(daysSinceWeekStart / 7)

    while (weeks.length <= weekIndex) {
      weeks.push([])
    }
    weeks[weekIndex].push(date)
  }

  return weeks
}

/** 曜日ラベル（月〜日） */
const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const

// ---- プレビュー用: busy スロット型 ----

interface BusySlot {
  start: string
  end: string
}

/**
 * 予約可能スロットが Google Calendar の busy 期間と重複するかチェック
 */
function isSlotBusy(
  date: Date,
  slot: TimeSlot,
  busySlots: BusySlot[]
): boolean {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  const slotStart = new Date(`${dateStr}T${slot.start}:00`).getTime()
  const slotEnd = new Date(`${dateStr}T${slot.end}:00`).getTime()

  return busySlots.some((busy) => {
    const busyStart = new Date(busy.start).getTime()
    const busyEnd = new Date(busy.end).getTime()
    // 重複判定: スロット開始 < busy終了 && スロット終了 > busy開始
    return slotStart < busyEnd && slotEnd > busyStart
  })
}

// ---- プレビューコンポーネント ----

function PreviewView({
  slots,
  slotDurationMinutes,
  bufferMinutes,
  bookingLeadDays,
  bookingWindowWeeks,
}: {
  slots: Record<string, boolean>
  slotDurationMinutes: number
  bufferMinutes: number
  bookingLeadDays: number
  bookingWindowWeeks: number
}) {
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)
  const [busySlots, setBusySlots] = useState<BusySlot[]>([])
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [isLoadingBusy, setIsLoadingBusy] = useState(false)

  const dates = generatePreviewDates(bookingLeadDays, bookingWindowWeeks)
  const weeks = groupByWeek(dates)

  // 全表示期間の busy slots を初回取得
  useEffect(() => {
    if (dates.length === 0) return
    const timeMin = dates[0].toISOString()
    const timeMax = addDays(dates[dates.length - 1], 1).toISOString()

    setIsLoadingBusy(true)
    fetch(`/api/admin/google-calendar-busy?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
      .then((res) => {
        if (!res.ok) {
          console.error("Google Calendar busy API error:", res.status)
          return { busy: [], connected: false }
        }
        return res.json()
      })
      .then((data) => {
        setBusySlots(data.busy ?? [])
        setCalendarConnected(data.connected ?? false)
      })
      .catch((err) => {
        console.error("Google Calendar busy fetch error:", err)
        setBusySlots([])
        setCalendarConnected(false)
      })
      .finally(() => setIsLoadingBusy(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingLeadDays, bookingWindowWeeks])

  // 週インデックスが範囲外にならないよう補正
  const safeWeekIndex = Math.min(currentWeekIndex, Math.max(0, weeks.length - 1))
  const currentWeekDates = weeks[safeWeekIndex] ?? []

  // 現在の週の月曜日〜日曜日の完全な7日間を生成
  const weekDays: (Date | null)[] = (() => {
    if (currentWeekDates.length === 0) return Array(7).fill(null)
    const first = currentWeekDates[0]
    const mondayOffset = (first.getDay() + 6) % 7
    const monday = addDays(first, -mondayOffset)
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i)
      const isInRange = dates.some((rd) => rd.getTime() === d.getTime())
      return isInRange ? d : null
    })
  })()

  // 週ラベル（月曜〜日曜の実日付を表示）
  const weekLabel = (() => {
    if (currentWeekDates.length === 0) return ""
    const first = currentWeekDates[0]
    const mondayOffset = (first.getDay() + 6) % 7
    const monday = addDays(first, -mondayOffset)
    const sunday = addDays(monday, 6)
    return `${monday.getMonth() + 1}/${monday.getDate()} – ${sunday.getMonth() + 1}/${sunday.getDate()}`
  })()

  // 各曜日の予約可能スロット（busy を除外済み）を事前計算
  const weekSlots = weekDays.map((date) => {
    if (!date) return []
    const allSlots = computeBookableSlots(dateToDayKey(date), slots, slotDurationMinutes, bufferMinutes)
    if (busySlots.length === 0) return allSlots
    return allSlots.filter((slot) => !isSlotBusy(date, slot, busySlots))
  })

  // スロット単位の時間行を算出（全曜日のスロット開始時刻をユニーク化してソート）
  const timeRows = (() => {
    const times = new Set<string>()
    for (const daySlots of weekSlots) {
      for (const slot of daySlots) {
        times.add(slot.start)
      }
    }
    return Array.from(times).sort()
  })()

  // 曜日×時刻でスロットを引けるマップ
  const slotMap = new Map<string, TimeSlot>()
  weekDays.forEach((date, dayIndex) => {
    if (!date) return
    for (const slot of weekSlots[dayIndex]) {
      slotMap.set(`${dayIndex}_${slot.start}`, slot)
    }
  })

  const todayStr = new Date().toDateString()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          受講生から見た予約可能な時間枠のプレビューです。{bookingLeadDays}日後から{bookingWindowWeeks}週間先までの範囲を表示しています。
        </p>
        {isLoadingBusy && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Loader2 className="h-3 w-3 animate-spin" />
            カレンダー取得中...
          </div>
        )}
      </div>

      {!calendarConnected && !isLoadingBusy && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Google Calendar 未連携のため、既存の予定は反映されていません。
        </div>
      )}

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

      {/* 週間カレンダー */}
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
                const outOfRange = date === null
                return (
                  <th
                    key={i}
                    className={`h-12 text-center border-l border-b border-border px-1 ${
                      outOfRange ? "bg-muted/10" : ""
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <span
                        className={`text-[10px] font-semibold leading-none ${
                          outOfRange ? "text-muted-foreground/30" : getDayHeaderStyle(WEEKDAY_KEYS[i])
                        }`}
                      >
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
                    const slot = slotMap.get(`${dayIndex}_${time}`)
                    return (
                      <td
                        key={dayIndex}
                        className={`border-l border-border h-10 ${
                          slot ? "bg-primary/15 p-1" : ""
                        }`}
                      >
                        {slot && (
                          <div className="flex items-center justify-center h-full text-[10px] font-mono leading-tight">
                            <span className="text-foreground">{slot.start}</span>
                            <span className="text-muted-foreground ml-0.5">– {slot.end}</span>
                          </div>
                        )}
                      </td>
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
            5
          </div>
          <span>今日</span>
        </div>
        <span>1枠: {slotDurationMinutes}分</span>
        {bufferMinutes > 0 && <span>確保時間: {bufferMinutes}分</span>}
        {calendarConnected && <span>Google Calendar 反映済み</span>}
      </div>
    </div>
  )
}
