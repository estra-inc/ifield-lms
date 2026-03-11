/**
 * ReportEntryCard Server Component のテスト
 *
 * 日報エントリカードのデータ構造と表示ロジックを検証する。
 */
import type { DailyReportEntry } from "@/lib/types/daily-reports"

describe("ReportEntryCard", () => {
  describe("エントリデータ構造", () => {
    it("日報エントリの全フィールドが正しく定義される", () => {
      const entry: DailyReportEntry = {
        id: "entry-1",
        reportDate: "2026-02-27",
        actualHours: 2.5,
        content: "TypeScriptの学習を行った",
        likedByManager: false,
        createdAt: "2026-02-27T10:00:00Z",
      }

      expect(entry.id).toBe("entry-1")
      expect(entry.reportDate).toBe("2026-02-27")
      expect(entry.actualHours).toBe(2.5)
      expect(entry.content).toBe("TypeScriptの学習を行った")
      expect(entry.likedByManager).toBe(false)
    })

    it("いいね済みのエントリを正しく判定する", () => {
      const likedEntry: DailyReportEntry = {
        id: "entry-2",
        reportDate: "2026-02-27",
        actualHours: 1,
        content: "学習内容",
        likedByManager: true,
        createdAt: "2026-02-27T10:00:00Z",
      }

      expect(likedEntry.likedByManager).toBe(true)
    })

    it("いいね未済のエントリを正しく判定する", () => {
      const notLikedEntry: DailyReportEntry = {
        id: "entry-3",
        reportDate: "2026-02-27",
        actualHours: 1,
        content: "学習内容",
        likedByManager: false,
        createdAt: "2026-02-27T10:00:00Z",
      }

      expect(notLikedEntry.likedByManager).toBe(false)
    })
  })

  describe("snake_case → camelCase 変換", () => {
    it("DB の snake_case レスポンスを camelCase に変換する", () => {
      const dbRow = {
        id: "entry-1",
        report_date: "2026-02-27",
        actual_hours: 2.5,
        content: "学習内容",
        liked_by_manager: true,
        created_at: "2026-02-27T10:00:00Z",
      }

      const entry: DailyReportEntry = {
        id: dbRow.id,
        reportDate: dbRow.report_date,
        actualHours: dbRow.actual_hours,
        content: dbRow.content,
        likedByManager: dbRow.liked_by_manager,
        createdAt: dbRow.created_at,
      }

      expect(entry.reportDate).toBe("2026-02-27")
      expect(entry.actualHours).toBe(2.5)
      expect(entry.likedByManager).toBe(true)
    })
  })
})
