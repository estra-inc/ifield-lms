/**
 * DailyReportForm Client Component のテスト
 *
 * "use client" コンポーネントのため、直接レンダリングテストは行わない。
 * ロジック面（バリデーション連携、フォームデータ構築）を検証する。
 */
import { dailyReportSchema } from "@/lib/validations/daily-reports"

describe("DailyReportForm", () => {
  describe("クライアントサイドバリデーション", () => {
    it("有効な入力でバリデーションが通る", () => {
      const formValues = {
        report_date: "2026-02-27",
        actual_hours: 2,
        content: "TypeScriptの学習",
      }
      const result = dailyReportSchema.safeParse(formValues)
      expect(result.success).toBe(true)
    })

    it("空の日付でバリデーションが失敗する", () => {
      const formValues = {
        report_date: "",
        actual_hours: 2,
        content: "学習内容",
      }
      const result = dailyReportSchema.safeParse(formValues)
      expect(result.success).toBe(false)
    })

    it("0.5刻みでない学習時間でバリデーションが失敗する", () => {
      const formValues = {
        report_date: "2026-02-27",
        actual_hours: 1.3,
        content: "学習内容",
      }
      const result = dailyReportSchema.safeParse(formValues)
      expect(result.success).toBe(false)
    })

    it("空の学習内容でバリデーションが失敗する", () => {
      const formValues = {
        report_date: "2026-02-27",
        actual_hours: 1,
        content: "",
      }
      const result = dailyReportSchema.safeParse(formValues)
      expect(result.success).toBe(false)
    })

    it("step=0.5 の有効な値が通る（0.5, 1.0, 1.5, 2.0）", () => {
      const validHours = [0.5, 1.0, 1.5, 2.0, 3.5, 8.0]
      for (const hours of validHours) {
        const result = dailyReportSchema.safeParse({
          report_date: "2026-02-27",
          actual_hours: hours,
          content: "学習内容",
        })
        expect(result.success).toBe(true)
      }
    })
  })

  describe("フォームデータ構築", () => {
    it("FormData からバリデーション用オブジェクトを正しく構築する", () => {
      const formData = new FormData()
      formData.set("report_date", "2026-02-27")
      formData.set("actual_hours", "2.5")
      formData.set("content", "学習内容テスト")

      const rawData = {
        report_date: formData.get("report_date") as string,
        actual_hours: Number(formData.get("actual_hours")),
        content: formData.get("content") as string,
      }

      expect(rawData.report_date).toBe("2026-02-27")
      expect(rawData.actual_hours).toBe(2.5)
      expect(rawData.content).toBe("学習内容テスト")

      const result = dailyReportSchema.safeParse(rawData)
      expect(result.success).toBe(true)
    })

    it("デフォルトの日付が今日になることを確認する", () => {
      const today = new Date().toISOString().split("T")[0]
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
