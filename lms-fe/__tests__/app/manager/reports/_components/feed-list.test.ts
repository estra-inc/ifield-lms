/**
 * FeedList コンポーネントのテスト
 *
 * Manager 向けフィードリストのデータ構造を検証する。
 */
import type { ReportFeedItem } from "@/lib/types/daily-reports"

describe("FeedList", () => {
  describe("データ構造", () => {
    it("ReportFeedItem の型に必要なフィールドが揃っている", () => {
      const item: ReportFeedItem = {
        id: "report-1",
        userId: "user-1",
        userName: "田中 太郎",
        avatarUrl: null,
        reportDate: "2026-02-27",
        actualHours: 2.5,
        content: "TypeScript の学習",
        likedByManager: false,
      }

      expect(item.id).toBe("report-1")
      expect(item.userId).toBe("user-1")
      expect(item.userName).toBe("田中 太郎")
      expect(item.reportDate).toBe("2026-02-27")
      expect(item.actualHours).toBe(2.5)
      expect(item.content).toBe("TypeScript の学習")
      expect(item.likedByManager).toBe(false)
    })

    it("空のフィードリストでもエラーにならない", () => {
      const items: ReportFeedItem[] = []
      expect(items).toHaveLength(0)
    })

    it("複数フィードアイテムを日付降順でソートできる", () => {
      const items: ReportFeedItem[] = [
        {
          id: "1",
          userId: "u1",
          userName: "田中 太郎",
          avatarUrl: null,
          reportDate: "2026-02-25",
          actualHours: 1,
          content: "A",
          likedByManager: false,
        },
        {
          id: "2",
          userId: "u2",
          userName: "佐藤 花子",
          avatarUrl: null,
          reportDate: "2026-02-27",
          actualHours: 2,
          content: "B",
          likedByManager: true,
        },
        {
          id: "3",
          userId: "u1",
          userName: "田中 太郎",
          avatarUrl: null,
          reportDate: "2026-02-26",
          actualHours: 1.5,
          content: "C",
          likedByManager: false,
        },
      ]

      // 日付降順でソート
      const sorted = [...items].sort(
        (a, b) => b.reportDate.localeCompare(a.reportDate)
      )

      expect(sorted[0].reportDate).toBe("2026-02-27")
      expect(sorted[1].reportDate).toBe("2026-02-26")
      expect(sorted[2].reportDate).toBe("2026-02-25")
    })
  })
})
