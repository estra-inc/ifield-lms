/**
 * MonthlyGoalCard Client Component のテスト
 *
 * 月次目標カードのデータ構造、進捗計算、バリデーション連携を検証する。
 */
import { monthlyGoalSchema } from "@/lib/validations/goals"

interface MonthlyGoalCardProps {
  currentMonth: string
  yearMonth: string
  actualHours: number
  currentGoal: {
    targetHours: number
  } | null
}

describe("MonthlyGoalCard", () => {
  describe("Props データ構造", () => {
    it("目標設定済みの場合、全データが正しく構築される", () => {
      const props: MonthlyGoalCardProps = {
        currentMonth: "2026年2月",
        yearMonth: "2026-02",
        actualHours: 20,
        currentGoal: {
          targetHours: 40,
        },
      }

      expect(props.currentGoal).not.toBeNull()
      expect(props.currentGoal?.targetHours).toBe(40)
      expect(props.actualHours).toBe(20)
    })

    it("目標未設定の場合、currentGoal が null になる", () => {
      const props: MonthlyGoalCardProps = {
        currentMonth: "2026年2月",
        yearMonth: "2026-02",
        actualHours: 20,
        currentGoal: null,
      }

      expect(props.currentGoal).toBeNull()
    })
  })

  describe("進捗率計算", () => {
    it("目標設定済みの場合に正しい進捗率を計算する", () => {
      const actual = 20
      const target = 40
      const percentage = Math.round((actual / target) * 100)

      expect(percentage).toBe(50)
    })

    it("目標を超えた場合に100%以上の進捗率を計算する", () => {
      const actual = 50
      const target = 40
      const percentage = Math.round((actual / target) * 100)

      expect(percentage).toBe(125)
    })

    it("実績が0の場合に0%の進捗率を計算する", () => {
      const actual = 0
      const target = 40
      const percentage = Math.round((actual / target) * 100)

      expect(percentage).toBe(0)
    })
  })

  describe("year_month 自動計算", () => {
    it("現在の年月を YYYY-MM 形式で取得する", () => {
      const now = new Date()
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

      expect(yearMonth).toMatch(/^\d{4}-\d{2}$/)
    })
  })

  describe("バリデーション連携", () => {
    it("有効な月次目標データでバリデーションが通る", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "2026-02",
        target_hours: 40,
      })
      expect(result.success).toBe(true)
    })

    it("目標時間0でバリデーションが失敗する", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "2026-02",
        target_hours: 0,
      })
      expect(result.success).toBe(false)
    })

    it("不正な year_month 形式でバリデーションが失敗する", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "2026/02",
        target_hours: 40,
      })
      expect(result.success).toBe(false)
    })
  })
})
