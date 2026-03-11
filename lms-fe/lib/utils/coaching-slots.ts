import type { BusinessHours, CoachingGenre, GenreBusinessHours } from "@/lib/types/database"

export interface TimeSlot {
  start: string // HH:MM
  end: string   // HH:MM
}

export interface AvailableSlot {
  date: string     // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string   // HH:MM
}

/**
 * Date を JST (UTC+9) として解釈する。
 * Vercel (UTC) 環境で正しく日本時間の年月日・曜日を取得するために使用。
 */
export function toJST(date: Date): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
}

const JS_DAY_TO_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

/**
 * Date オブジェクトから曜日キーを返す
 */
export function dateToDayKey(date: Date): string {
  return JS_DAY_TO_KEY[date.getDay()]
}

/**
 * 曜日キーと時刻文字列からスロットキーを生成
 */
function toSlotKey(dayKey: string, time: string): string {
  return `${dayKey}_${time.replace(":", "")}`
}

/**
 * 指定曜日の稼働スロットから予約可能な時間枠を算出する。
 * business-hours-section.tsx の computeBookableSlots と同等ロジック。
 */
export function computeBookableSlots(
  dayKey: string,
  slots: Record<string, boolean>,
  slotDurationMinutes: number,
  bufferMinutes: number
): TimeSlot[] {
  const activeMinutes: number[] = []
  for (let h = 0; h < 24; h++) {
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

/**
 * 日付を YYYY-MM-DD 形式で返す
 */
export function formatDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * HH:MM を分に変換する
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

/**
 * スロットが busy 期間と重複するかチェック
 */
function isSlotBusy(
  date: string,
  startTime: string,
  endTime: string,
  busyPeriods: { start: string; end: string }[]
): boolean {
  const slotStart = new Date(`${date}T${startTime}:00+09:00`).getTime()
  const slotEnd = new Date(`${date}T${endTime}:00+09:00`).getTime()

  for (const busy of busyPeriods) {
    const busyStart = new Date(busy.start).getTime()
    const busyEnd = new Date(busy.end).getTime()
    if (slotStart < busyEnd && slotEnd > busyStart) {
      return true
    }
  }
  return false
}

/**
 * 空き枠を算出する
 *
 * 1. business_hours からスロット候補を生成
 * 2. bookingLeadDays / bookingWindowWeeks で期間フィルタ
 * 3. busySlots で busy 時間帯を除外
 * 4. bookedSessions で予約済みスロットを除外
 */
export function computeAvailableSlots(
  businessHours: BusinessHours,
  busySlots: { start: string; end: string }[],
  bookedSessions: { session_date: string; start_time: string }[]
): AvailableSlot[] {
  const now = new Date()
  const jstNow = toJST(now)
  const today = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate())

  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() + businessHours.bookingLeadDays)

  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + businessHours.bookingWindowWeeks * 7)

  const bookedSet = new Set(
    bookedSessions.map((s) => `${s.session_date}_${s.start_time.slice(0, 5)}`)
  )

  const available: AvailableSlot[] = []
  const cursor = new Date(startDate)

  while (cursor <= endDate) {
    const dayKey = dateToDayKey(cursor)
    const dateStr = formatDateStr(cursor)

    const daySlots = computeBookableSlots(
      dayKey,
      businessHours.slots,
      businessHours.slotDurationMinutes,
      businessHours.bufferMinutes
    )

    for (const slot of daySlots) {
      // 予約済みチェック
      const bookedKey = `${dateStr}_${slot.start}`
      if (bookedSet.has(bookedKey)) continue

      // busy チェック
      if (isSlotBusy(dateStr, slot.start, slot.end, busySlots)) continue

      // 過去時刻チェック（JST として解釈）
      const slotDateTime = new Date(`${dateStr}T${slot.start}:00+09:00`)
      if (slotDateTime <= now) continue

      available.push({
        date: dateStr,
        startTime: slot.start,
        endTime: slot.end,
      })
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return available
}

/**
 * GenreBusinessHours 形式かどうかを判定する
 */
export function isGenreBusinessHours(bh: unknown): bh is GenreBusinessHours {
  return typeof bh === "object" && bh !== null && "engineering" in bh && "design" in bh
}

/**
 * ジャンル別の BusinessHours を取得する（後方互換対応）
 * 旧形式（フラット BusinessHours）の場合はそのまま返す
 */
export function getBusinessHoursForGenre(
  bh: BusinessHours | GenreBusinessHours,
  genre: CoachingGenre
): BusinessHours {
  if (isGenreBusinessHours(bh)) return bh[genre]
  return bh
}
