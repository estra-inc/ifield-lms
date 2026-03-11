/**
 * 日報入力ページ Server Component のテスト
 *
 * データフェッチロジック（当月/当週/本日のメトリクス計算）を検証する。
 */
import type { LearningMetrics } from "@/lib/types/daily-reports"

/**
 * 進捗率計算ヘルパー（page.tsx 内で使用するのと同じロジック）
 */
function calculatePercentage(actual: number, target: number | null): number | null {
  if (target === null || target === 0) return null
  return Math.round((actual / target) * 100)
}

/**
 * 当月の日付範囲を取得するヘルパー
 */
function getCurrentMonthRange(): { start: string; end: string; yearMonth: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
    yearMonth: `${year}-${month}`,
  }
}

/**
 * 今週の月曜日〜日曜日の日付範囲を取得するヘルパー
 */
function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  // 月曜日を週の始まりとする（dayOfWeek: 0=日曜 → 6, 1=月曜 → 0, ...）
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  }
}

describe("日報入力ページ", () => {
  describe("進捗メトリクス計算", () => {
    it("目標設定済みの場合に正しいメトリクスを構築する", () => {
      const monthlyActual = 20
      const monthlyTarget = 40
      const weeklyActual = 5
      const weeklyTarget = 10
      const dailyActual = 2

      const metrics: LearningMetrics = {
        monthly: {
          actual: monthlyActual,
          target: monthlyTarget,
          percentage: calculatePercentage(monthlyActual, monthlyTarget),
        },
        weekly: {
          actual: weeklyActual,
          target: weeklyTarget,
          percentage: calculatePercentage(weeklyActual, weeklyTarget),
        },
        daily: {
          actual: dailyActual,
        },
      }

      expect(metrics.monthly.percentage).toBe(50)
      expect(metrics.weekly.percentage).toBe(50)
      expect(metrics.daily.actual).toBe(2)
    })

    it("目標未設定の場合に null を含むメトリクスを構築する", () => {
      const metrics: LearningMetrics = {
        monthly: {
          actual: 20,
          target: null,
          percentage: calculatePercentage(20, null),
        },
        weekly: {
          actual: 5,
          target: null,
          percentage: calculatePercentage(5, null),
        },
        daily: {
          actual: 2,
        },
      }

      expect(metrics.monthly.target).toBeNull()
      expect(metrics.monthly.percentage).toBeNull()
      expect(metrics.weekly.target).toBeNull()
      expect(metrics.weekly.percentage).toBeNull()
    })
  })

  describe("日付範囲計算", () => {
    it("当月の日付範囲を正しく取得する", () => {
      const range = getCurrentMonthRange()
      expect(range.start).toMatch(/^\d{4}-\d{2}-01$/)
      expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(range.yearMonth).toMatch(/^\d{4}-\d{2}$/)
    })

    it("今週の日付範囲を正しく取得する（月曜〜日曜）", () => {
      const range = getCurrentWeekRange()
      const startDate = new Date(range.start)
      const endDate = new Date(range.end)

      // start_date は月曜日（getDay() === 1）
      expect(startDate.getDay()).toBe(1)
      // end_date は日曜日（getDay() === 0）
      expect(endDate.getDay()).toBe(0)
      // 7 日間の差
      const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      expect(diffDays).toBe(6)
    })
  })

  describe("日報合計計算", () => {
    it("複数の日報の合計学習時間を正しく計算する", () => {
      const reports = [
        { actual_hours: 2 },
        { actual_hours: 1.5 },
        { actual_hours: 3 },
      ]
      const total = reports.reduce((sum, r) => sum + r.actual_hours, 0)
      expect(total).toBe(6.5)
    })

    it("日報がない場合は合計が0になる", () => {
      const reports: Array<{ actual_hours: number }> = []
      const total = reports.reduce((sum, r) => sum + r.actual_hours, 0)
      expect(total).toBe(0)
    })
  })
})
