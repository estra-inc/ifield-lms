import { describe, it, expect } from "vitest"
import { deriveHardStopStatus } from "@/lib/utils/hard-stop"

describe("deriveHardStopStatus", () => {
  it("卒業日まで15日以上の場合は none を返す", () => {
    const result = deriveHardStopStatus("2026-01-16", "2026-01-01")
    expect(result).toEqual({ kind: "none" })
  })

  it("卒業日まで16日の場合も none を返す", () => {
    const result = deriveHardStopStatus("2026-01-17", "2026-01-01")
    expect(result).toEqual({ kind: "none" })
  })

  it("卒業日まで14日の場合は warning を返す", () => {
    const result = deriveHardStopStatus("2026-01-15", "2026-01-01")
    expect(result).toEqual({ kind: "warning", daysRemaining: 14 })
  })

  it("卒業日まで1日の場合は warning を返す", () => {
    const result = deriveHardStopStatus("2026-01-15", "2026-01-14")
    expect(result).toEqual({ kind: "warning", daysRemaining: 1 })
  })

  it("卒業日当日（残り0日）の場合は warning を返す", () => {
    const result = deriveHardStopStatus("2026-01-15", "2026-01-15")
    expect(result).toEqual({ kind: "warning", daysRemaining: 0 })
  })

  it("卒業日を過ぎている場合は expired を返す", () => {
    const result = deriveHardStopStatus("2026-01-15", "2026-01-16")
    expect(result).toEqual({ kind: "expired" })
  })

  it("卒業日を大幅に過ぎている場合も expired を返す", () => {
    const result = deriveHardStopStatus("2026-01-01", "2026-03-01")
    expect(result).toEqual({ kind: "expired" })
  })

  it("graduationDate が null の場合は none を返す", () => {
    const result = deriveHardStopStatus(null)
    expect(result).toEqual({ kind: "none" })
  })

  it("graduationDate が null の場合は now を指定しても none を返す", () => {
    const result = deriveHardStopStatus(null, "2026-01-01")
    expect(result).toEqual({ kind: "none" })
  })

  describe("タイムゾーン境界テスト", () => {
    it("日付のみ比較のため時刻に依存しない（同日は daysRemaining: 0）", () => {
      // differenceInCalendarDays は時刻を無視して日付のみで比較する
      const result = deriveHardStopStatus("2026-03-04", "2026-03-04")
      expect(result).toEqual({ kind: "warning", daysRemaining: 0 })
    })

    it("日付境界を跨ぐケース: 前日 → 残り1日", () => {
      const result = deriveHardStopStatus("2026-03-05", "2026-03-04")
      expect(result).toEqual({ kind: "warning", daysRemaining: 1 })
    })

    it("日付境界を跨ぐケース: 翌日 → expired", () => {
      const result = deriveHardStopStatus("2026-03-04", "2026-03-05")
      expect(result).toEqual({ kind: "expired" })
    })
  })

  describe("境界値テスト", () => {
    it("ちょうど15日先は none を返す", () => {
      const result = deriveHardStopStatus("2026-01-16", "2026-01-01")
      expect(result).toEqual({ kind: "none" })
    })

    it("ちょうど14日先は warning を返す", () => {
      const result = deriveHardStopStatus("2026-01-15", "2026-01-01")
      expect(result).toEqual({ kind: "warning", daysRemaining: 14 })
    })

    it("daysRemaining は 0 以上 14 以下の整数を返す", () => {
      for (let i = 0; i <= 14; i++) {
        const gradDate = `2026-01-${String(15 + i).padStart(2, "0")}`
        const result = deriveHardStopStatus(gradDate, `2026-01-${String(15).padStart(2, "0")}`)
        if (result.kind === "warning") {
          expect(result.daysRemaining).toBeGreaterThanOrEqual(0)
          expect(result.daysRemaining).toBeLessThanOrEqual(14)
          expect(Number.isInteger(result.daysRemaining)).toBe(true)
        }
      }
    })
  })
})
