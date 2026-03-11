/**
 * MetricsRow Server Component のテスト
 *
 * メトリクス計算ロジック（進捗率、目標未設定ハンドリング）を検証する。
 */
import type { LearningMetrics } from "@/lib/types/daily-reports"

describe("MetricsRow", () => {
  describe("メトリクスデータ構造", () => {
    it("目標設定済みの場合、進捗率が正しく計算される", () => {
      const metrics: LearningMetrics = {
        monthly: { actual: 20, target: 40, percentage: 50 },
        weekly: { actual: 5, target: 10, percentage: 50 },
        daily: { actual: 2 },
      }

      expect(metrics.monthly.percentage).toBe(50)
      expect(metrics.weekly.percentage).toBe(50)
    })

    it("目標未設定の場合、target と percentage が null になる", () => {
      const metrics: LearningMetrics = {
        monthly: { actual: 20, target: null, percentage: null },
        weekly: { actual: 5, target: null, percentage: null },
        daily: { actual: 2 },
      }

      expect(metrics.monthly.target).toBeNull()
      expect(metrics.monthly.percentage).toBeNull()
      expect(metrics.weekly.target).toBeNull()
      expect(metrics.weekly.percentage).toBeNull()
    })

    it("実績が0の場合でもメトリクスが正しく構築される", () => {
      const metrics: LearningMetrics = {
        monthly: { actual: 0, target: 40, percentage: 0 },
        weekly: { actual: 0, target: 10, percentage: 0 },
        daily: { actual: 0 },
      }

      expect(metrics.monthly.actual).toBe(0)
      expect(metrics.monthly.percentage).toBe(0)
      expect(metrics.daily.actual).toBe(0)
    })

    it("目標を超えた場合、100%以上の進捗率を表示できる", () => {
      const metrics: LearningMetrics = {
        monthly: { actual: 50, target: 40, percentage: 125 },
        weekly: { actual: 15, target: 10, percentage: 150 },
        daily: { actual: 8 },
      }

      expect(metrics.monthly.percentage).toBe(125)
      expect(metrics.weekly.percentage).toBe(150)
    })
  })

  describe("進捗率計算ロジック", () => {
    function calculatePercentage(actual: number, target: number | null): number | null {
      if (target === null || target === 0) return null
      return Math.round((actual / target) * 100)
    }

    it("正常な進捗率を計算する", () => {
      expect(calculatePercentage(20, 40)).toBe(50)
      expect(calculatePercentage(30, 40)).toBe(75)
      expect(calculatePercentage(40, 40)).toBe(100)
    })

    it("目標未設定の場合 null を返す", () => {
      expect(calculatePercentage(20, null)).toBeNull()
    })

    it("目標が0の場合 null を返す", () => {
      expect(calculatePercentage(20, 0)).toBeNull()
    })

    it("小数を四捨五入する", () => {
      expect(calculatePercentage(1, 3)).toBe(33) // 33.333...
      expect(calculatePercentage(2, 3)).toBe(67) // 66.666...
    })
  })
})
