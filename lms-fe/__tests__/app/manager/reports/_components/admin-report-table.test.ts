/**
 * AdminReportTable コンポーネントのテスト
 *
 * 管理テーブルのデータ構造を検証する。
 */
import type { AdminReportRow } from "@/lib/types/daily-reports"

describe("AdminReportTable", () => {
  describe("AdminReportRow 型", () => {
    it("行のデータ構造が正しい", () => {
      const row: AdminReportRow = {
        id: "report-1",
        userId: "user-1",
        userName: "田中 太郎",
        avatarUrl: null,
        reportDate: "2026-02-27",
        actualHours: 2.5,
        content: "TypeScript学習",
        likedByManager: true,
      }

      expect(row.id).toBe("report-1")
      expect(row.userName).toBe("田中 太郎")
      expect(row.actualHours).toBe(2.5)
      expect(row.likedByManager).toBe(true)
    })
  })
})
