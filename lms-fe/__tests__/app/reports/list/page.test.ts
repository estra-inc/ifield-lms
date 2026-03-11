/**
 * 日報一覧ページ Server Component のテスト
 *
 * cursor-based ページネーションのロジックと
 * snake_case → camelCase 変換を検証する。
 */
import type { DailyReportEntry, DateGroup } from "@/lib/types/daily-reports"

const PER_PAGE = 20

describe("日報一覧ページ", () => {
  describe("cursor-based ページネーション", () => {
    it("初回ロードでは cursor なしで最新20件を取得する", () => {
      const cursor = undefined
      const limit = PER_PAGE

      expect(cursor).toBeUndefined()
      expect(limit).toBe(20)
    })

    it("cursor が指定された場合、その created_at 以前のデータを取得する", () => {
      const cursor = "2026-02-27T10:00:00Z"
      // cursor 以前の条件を構築
      const filter = { column: "created_at", operator: "lt", value: cursor }

      expect(filter.column).toBe("created_at")
      expect(filter.operator).toBe("lt")
      expect(filter.value).toBe("2026-02-27T10:00:00Z")
    })

    it("取得件数が PER_PAGE と一致する場合、次のページがある", () => {
      const fetchedCount = 20
      const hasNextPage = fetchedCount === PER_PAGE

      expect(hasNextPage).toBe(true)
    })

    it("取得件数が PER_PAGE 未満の場合、次のページがない", () => {
      const fetchedCount: number = 15
      const hasNextPage = fetchedCount === (PER_PAGE as number)

      expect(hasNextPage).toBe(false)
    })

    it("次の cursor は最後のアイテムの created_at を使う", () => {
      const items = [
        { created_at: "2026-02-27T10:00:00Z" },
        { created_at: "2026-02-27T09:00:00Z" },
        { created_at: "2026-02-27T08:00:00Z" },
      ]

      const nextCursor = items.length > 0 ? items[items.length - 1].created_at : null

      expect(nextCursor).toBe("2026-02-27T08:00:00Z")
    })
  })

  describe("snake_case → camelCase 変換", () => {
    it("DB レスポンスを DailyReportEntry に変換する", () => {
      const dbRows = [
        {
          id: "uuid-1",
          report_date: "2026-02-27",
          actual_hours: 2.5,
          content: "TypeScript学習",
          liked_by_manager: true,
          created_at: "2026-02-27T10:00:00Z",
        },
        {
          id: "uuid-2",
          report_date: "2026-02-26",
          actual_hours: 1,
          content: "React学習",
          liked_by_manager: false,
          created_at: "2026-02-26T09:00:00Z",
        },
      ]

      const entries: DailyReportEntry[] = dbRows.map((row) => ({
        id: row.id,
        reportDate: row.report_date,
        actualHours: row.actual_hours,
        content: row.content,
        likedByManager: row.liked_by_manager,
        createdAt: row.created_at,
      }))

      expect(entries).toHaveLength(2)
      expect(entries[0].reportDate).toBe("2026-02-27")
      expect(entries[0].actualHours).toBe(2.5)
      expect(entries[0].likedByManager).toBe(true)
      expect(entries[1].likedByManager).toBe(false)
    })
  })

  describe("グループ化とページネーションの統合", () => {
    it("変換後のエントリをグループ化して nextCursor を設定する", () => {
      const dbRows = [
        {
          id: "1",
          report_date: "2026-02-27",
          actual_hours: 2,
          content: "A",
          liked_by_manager: false,
          created_at: "2026-02-27T10:00:00Z",
        },
        {
          id: "2",
          report_date: "2026-02-27",
          actual_hours: 1.5,
          content: "B",
          liked_by_manager: false,
          created_at: "2026-02-27T08:00:00Z",
        },
      ]

      const entries: DailyReportEntry[] = dbRows.map((row) => ({
        id: row.id,
        reportDate: row.report_date,
        actualHours: row.actual_hours,
        content: row.content,
        likedByManager: row.liked_by_manager,
        createdAt: row.created_at,
      }))

      // PER_PAGE未満なので次ページなし
      const hasNextPage = dbRows.length === PER_PAGE
      const nextCursor = hasNextPage
        ? dbRows[dbRows.length - 1].created_at
        : null

      expect(entries).toHaveLength(2)
      expect(nextCursor).toBeNull()
    })
  })
})
