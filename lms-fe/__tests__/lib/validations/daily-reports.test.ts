import { dailyReportSchema } from "@/lib/validations/daily-reports"

describe("dailyReportSchema", () => {
  // --- 正常値テスト ---
  describe("正常値", () => {
    it("有効な日付、正の学習時間、非空の内容でバリデーションが通る", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "2026-02-27",
        actual_hours: 2,
        content: "TypeScriptの学習",
      })
      expect(result.success).toBe(true)
    })

    it("0.5時間刻みの学習時間でバリデーションが通る", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "2026-02-27",
        actual_hours: 1.5,
        content: "学習内容",
      })
      expect(result.success).toBe(true)
    })

    it("過去の日付でバリデーションが通る", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "2025-01-01",
        actual_hours: 3,
        content: "過去の学習内容",
      })
      expect(result.success).toBe(true)
    })

    it("今日の日付でバリデーションが通る", () => {
      const today = new Date().toISOString().split("T")[0]
      const result = dailyReportSchema.safeParse({
        report_date: today,
        actual_hours: 1,
        content: "今日の学習",
      })
      expect(result.success).toBe(true)
    })

    it("0.5時間でバリデーションが通る（最小の有効値）", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "2026-02-27",
        actual_hours: 0.5,
        content: "短時間学習",
      })
      expect(result.success).toBe(true)
    })
  })

  // --- 境界値・異常値テスト ---
  describe("report_date のバリデーション", () => {
    it("未来の日付でバリデーションが失敗する", () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const futureDateStr = futureDate.toISOString().split("T")[0]

      const result = dailyReportSchema.safeParse({
        report_date: futureDateStr,
        actual_hours: 1,
        content: "内容",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages.some((m) => m.includes("未来"))).toBe(true)
      }
    })

    it("空文字の日付でバリデーションが失敗する", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "",
        actual_hours: 1,
        content: "内容",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("actual_hours のバリデーション", () => {
    it("0時間でバリデーションが失敗する", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "2026-02-27",
        actual_hours: 0,
        content: "内容",
      })
      expect(result.success).toBe(false)
    })

    it("負の数でバリデーションが失敗する", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "2026-02-27",
        actual_hours: -1,
        content: "内容",
      })
      expect(result.success).toBe(false)
    })

    it("0.5刻みでない値でバリデーションが失敗する（例: 0.3）", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "2026-02-27",
        actual_hours: 0.3,
        content: "内容",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages.some((m) => m.includes("0.5"))).toBe(true)
      }
    })

    it("0.5刻みでない値でバリデーションが失敗する（例: 1.7）", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "2026-02-27",
        actual_hours: 1.7,
        content: "内容",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("content のバリデーション", () => {
    it("空文字の学習内容でバリデーションが失敗する", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "2026-02-27",
        actual_hours: 1,
        content: "",
      })
      expect(result.success).toBe(false)
    })

    it("1文字の学習内容でバリデーションが通る", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "2026-02-27",
        actual_hours: 1,
        content: "a",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("日本語エラーメッセージ", () => {
    it("バリデーションエラーが日本語で返される", () => {
      const result = dailyReportSchema.safeParse({
        report_date: "",
        actual_hours: 0,
        content: "",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        for (const issue of result.error.issues) {
          // 全てのエラーメッセージが日本語（非ASCII文字を含む）であることを確認
          expect(issue.message).toMatch(/[\u3000-\u9FFF]/)
        }
      }
    })
  })
})
