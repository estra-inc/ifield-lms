import { differenceInCalendarDays, parseISO } from "date-fns"

/**
 * Hard Stop ステータス型
 *
 * - none: 卒業日が null または 15日以上先
 * - warning: 卒業日まで残り 0〜14 日
 * - expired: 卒業日を過ぎている
 */
export type HardStopStatus =
  | { kind: "none" }
  | { kind: "warning"; daysRemaining: number }
  | { kind: "expired" }

const WARNING_THRESHOLD_DAYS = 14

/**
 * 卒業日から Hard Stop ステータスを導出する純粋関数
 *
 * @param graduationDate - 卒業日（YYYY-MM-DD 形式）。null の場合は常に none。
 * @param now - 現在日付（YYYY-MM-DD 形式）。省略時は本日。テスト容易性のために指定可能。
 */
export function deriveHardStopStatus(
  graduationDate: string | null,
  now?: string
): HardStopStatus {
  if (!graduationDate) {
    return { kind: "none" }
  }

  const gradDate = parseISO(graduationDate)
  const today = now ? parseISO(now) : new Date()
  const daysRemaining = differenceInCalendarDays(gradDate, today)

  if (daysRemaining < 0) {
    return { kind: "expired" }
  }

  if (daysRemaining <= WARNING_THRESHOLD_DAYS) {
    return { kind: "warning", daysRemaining }
  }

  return { kind: "none" }
}
