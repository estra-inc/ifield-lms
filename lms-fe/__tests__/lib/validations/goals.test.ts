import { monthlyGoalSchema, weeklyGoalSchema } from "@/lib/validations/goals"

describe("monthlyGoalSchema", () => {
  // --- 正常値テスト ---
  describe("正常値", () => {
    it("有効な YYYY-MM 形式と正の目標時間でバリデーションが通る", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "2026-02",
        target_hours: 40,
      })
      expect(result.success).toBe(true)
    })

    it("1月でバリデーションが通る", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "2026-01",
        target_hours: 10,
      })
      expect(result.success).toBe(true)
    })

    it("12月でバリデーションが通る", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "2026-12",
        target_hours: 100,
      })
      expect(result.success).toBe(true)
    })

    it("小数の目標時間でバリデーションが通る", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "2026-03",
        target_hours: 20.5,
      })
      expect(result.success).toBe(true)
    })
  })

  // --- 異常値テスト ---
  describe("year_month のバリデーション", () => {
    it("不正な形式でバリデーションが失敗する（YYYY/MM）", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "2026/02",
        target_hours: 40,
      })
      expect(result.success).toBe(false)
    })

    it("不正な形式でバリデーションが失敗する（YYYYMM）", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "202602",
        target_hours: 40,
      })
      expect(result.success).toBe(false)
    })

    it("不正な形式でバリデーションが失敗する（YYYY-M）", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "2026-2",
        target_hours: 40,
      })
      expect(result.success).toBe(false)
    })

    it("空文字でバリデーションが失敗する", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "",
        target_hours: 40,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("target_hours のバリデーション", () => {
    it("0時間でバリデーションが失敗する", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "2026-02",
        target_hours: 0,
      })
      expect(result.success).toBe(false)
    })

    it("負の数でバリデーションが失敗する", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "2026-02",
        target_hours: -10,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("日本語エラーメッセージ", () => {
    it("バリデーションエラーが日本語で返される", () => {
      const result = monthlyGoalSchema.safeParse({
        year_month: "",
        target_hours: 0,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        for (const issue of result.error.issues) {
          expect(issue.message).toMatch(/[\u3000-\u9FFF]/)
        }
      }
    })
  })
})

describe("weeklyGoalSchema", () => {
  // --- 正常値テスト ---
  describe("正常値", () => {
    it("有効な start_date と end_date でバリデーションが通る", () => {
      const result = weeklyGoalSchema.safeParse({
        start_date: "2026-02-23",
        end_date: "2026-03-01",
        target_hours: 20,
      })
      expect(result.success).toBe(true)
    })

    it("小数の目標時間でバリデーションが通る", () => {
      const result = weeklyGoalSchema.safeParse({
        start_date: "2026-03-02",
        end_date: "2026-03-08",
        target_hours: 15.5,
      })
      expect(result.success).toBe(true)
    })
  })

  // --- 異常値テスト ---
  describe("start_date のバリデーション", () => {
    it("空文字の start_date でバリデーションが失敗する", () => {
      const result = weeklyGoalSchema.safeParse({
        start_date: "",
        end_date: "2026-03-01",
        target_hours: 20,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("end_date のバリデーション", () => {
    it("空文字の end_date でバリデーションが失敗する", () => {
      const result = weeklyGoalSchema.safeParse({
        start_date: "2026-02-23",
        end_date: "",
        target_hours: 20,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("target_hours のバリデーション", () => {
    it("0時間でバリデーションが失敗する", () => {
      const result = weeklyGoalSchema.safeParse({
        start_date: "2026-02-23",
        end_date: "2026-03-01",
        target_hours: 0,
      })
      expect(result.success).toBe(false)
    })

    it("負の数でバリデーションが失敗する", () => {
      const result = weeklyGoalSchema.safeParse({
        start_date: "2026-02-23",
        end_date: "2026-03-01",
        target_hours: -5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("日本語エラーメッセージ", () => {
    it("バリデーションエラーが日本語で返される", () => {
      const result = weeklyGoalSchema.safeParse({
        start_date: "",
        end_date: "",
        target_hours: 0,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        for (const issue of result.error.issues) {
          expect(issue.message).toMatch(/[\u3000-\u9FFF]/)
        }
      }
    })
  })
})
