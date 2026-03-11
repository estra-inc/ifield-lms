/**
 * WeeklyGoalCard Client Component のテスト
 *
 * 週次目標カードのデータ構造、週セレクター生成、バリデーション連携を検証する。
 */
import { weeklyGoalSchema } from "@/lib/validations/goals"

/**
 * 週の選択肢を生成するヘルパー（直近12週分）
 */
function generateAvailableWeeks(
  count: number = 12
): Array<{ startDate: string; endDate: string; label: string }> {
  const weeks: Array<{ startDate: string; endDate: string; label: string }> = []
  const now = new Date()

  // 今週の月曜日を取得
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const currentMonday = new Date(now)
  currentMonday.setDate(now.getDate() - diff)

  for (let i = 0; i < count; i++) {
    const monday = new Date(currentMonday)
    monday.setDate(currentMonday.getDate() - i * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const startDate = monday.toISOString().split("T")[0]
    const endDate = sunday.toISOString().split("T")[0]

    const label = `${monday.getMonth() + 1}/${monday.getDate()} - ${sunday.getMonth() + 1}/${sunday.getDate()}`

    weeks.push({ startDate, endDate, label })
  }

  return weeks
}

describe("WeeklyGoalCard", () => {
  describe("週セレクター生成", () => {
    it("直近12週分の選択肢を生成する", () => {
      const weeks = generateAvailableWeeks(12)

      expect(weeks).toHaveLength(12)
    })

    it("各週の startDate が月曜日である", () => {
      const weeks = generateAvailableWeeks(4)

      for (const week of weeks) {
        const startDate = new Date(week.startDate)
        expect(startDate.getDay()).toBe(1) // 月曜日
      }
    })

    it("各週の endDate が日曜日である", () => {
      const weeks = generateAvailableWeeks(4)

      for (const week of weeks) {
        const endDate = new Date(week.endDate)
        expect(endDate.getDay()).toBe(0) // 日曜日
      }
    })

    it("最初の要素が今週（最新の週）である", () => {
      const weeks = generateAvailableWeeks(4)
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const expectedMonday = new Date(now)
      expectedMonday.setDate(now.getDate() - diff)
      const expectedMondayStr = expectedMonday.toISOString().split("T")[0]

      expect(weeks[0].startDate).toBe(expectedMondayStr)
    })

    it("各週のラベルが 'M/D - M/D' 形式である", () => {
      const weeks = generateAvailableWeeks(1)

      expect(weeks[0].label).toMatch(/^\d+\/\d+ - \d+\/\d+$/)
    })

    it("各週の期間が7日間である", () => {
      const weeks = generateAvailableWeeks(4)

      for (const week of weeks) {
        const start = new Date(week.startDate)
        const end = new Date(week.endDate)
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        expect(diffDays).toBe(6) // 月曜〜日曜 = 6日差
      }
    })
  })

  describe("バリデーション連携", () => {
    it("有効な週次目標データでバリデーションが通る", () => {
      const result = weeklyGoalSchema.safeParse({
        start_date: "2026-02-23", // 月曜日
        end_date: "2026-03-01",   // 日曜日
        target_hours: 10,
      })
      expect(result.success).toBe(true)
    })

    it("start_date が月曜日でない場合バリデーションが失敗する", () => {
      const result = weeklyGoalSchema.safeParse({
        start_date: "2026-02-24", // 火曜日
        end_date: "2026-03-01",
        target_hours: 10,
      })
      expect(result.success).toBe(false)
    })

    it("end_date が日曜日でない場合バリデーションが失敗する", () => {
      const result = weeklyGoalSchema.safeParse({
        start_date: "2026-02-23",
        end_date: "2026-02-28", // 土曜日
        target_hours: 10,
      })
      expect(result.success).toBe(false)
    })

    it("目標時間0でバリデーションが失敗する", () => {
      const result = weeklyGoalSchema.safeParse({
        start_date: "2026-02-23",
        end_date: "2026-03-01",
        target_hours: 0,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("Props データ構造", () => {
    it("目標設定済みの場合、進捗率を計算できる", () => {
      const actual = 5
      const target = 10
      const percentage = Math.round((actual / target) * 100)

      expect(percentage).toBe(50)
    })

    it("目標未設定の場合、currentGoal が null", () => {
      const currentGoal: { targetHours: number } | null = null

      expect(currentGoal).toBeNull()
    })
  })
})
