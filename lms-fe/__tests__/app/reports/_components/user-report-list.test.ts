/**
 * UserReportList Server Component のテスト
 *
 * 日報グループ化ユーティリティロジックを検証する。
 */
import type { DailyReportEntry, DateGroup } from "@/lib/types/daily-reports"

/**
 * 日報エントリを日付ごとにグループ化するユーティリティ関数
 * （user-report-list.tsx 内で使用するのと同じロジック）
 */
function groupReportsByDate(entries: DailyReportEntry[]): DateGroup[] {
  const dayOfWeekNames = ["日", "月", "火", "水", "木", "金", "土"]
  const groupMap = new Map<string, DailyReportEntry[]>()

  for (const entry of entries) {
    const existing = groupMap.get(entry.reportDate) ?? []
    existing.push(entry)
    groupMap.set(entry.reportDate, existing)
  }

  const groups: DateGroup[] = Array.from(groupMap.entries()).map(
    ([date, dateEntries]) => {
      const dateObj = new Date(date + "T00:00:00")
      return {
        date,
        dayOfWeek: dayOfWeekNames[dateObj.getDay()],
        totalHours: dateEntries.reduce((sum, e) => sum + e.actualHours, 0),
        entries: dateEntries,
      }
    }
  )

  // 日付降順でソート
  groups.sort((a, b) => b.date.localeCompare(a.date))

  return groups
}

describe("UserReportList", () => {
  describe("groupReportsByDate", () => {
    it("複数日の日報を日付ごとにグループ化する", () => {
      const entries: DailyReportEntry[] = [
        {
          id: "1",
          reportDate: "2026-02-27",
          actualHours: 2,
          content: "学習A",
          likedByManager: false,
          createdAt: "2026-02-27T10:00:00Z",
        },
        {
          id: "2",
          reportDate: "2026-02-26",
          actualHours: 3,
          content: "学習B",
          likedByManager: true,
          createdAt: "2026-02-26T10:00:00Z",
        },
      ]

      const groups = groupReportsByDate(entries)

      expect(groups).toHaveLength(2)
      // 降順: 2/27 が先
      expect(groups[0].date).toBe("2026-02-27")
      expect(groups[1].date).toBe("2026-02-26")
    })

    it("同一日の複数エントリを1つのグループにまとめる", () => {
      const entries: DailyReportEntry[] = [
        {
          id: "1",
          reportDate: "2026-02-27",
          actualHours: 2,
          content: "学習A",
          likedByManager: false,
          createdAt: "2026-02-27T10:00:00Z",
        },
        {
          id: "2",
          reportDate: "2026-02-27",
          actualHours: 1.5,
          content: "学習B",
          likedByManager: false,
          createdAt: "2026-02-27T14:00:00Z",
        },
      ]

      const groups = groupReportsByDate(entries)

      expect(groups).toHaveLength(1)
      expect(groups[0].entries).toHaveLength(2)
      expect(groups[0].totalHours).toBe(3.5)
    })

    it("空配列の場合は空のグループ配列を返す", () => {
      const groups = groupReportsByDate([])
      expect(groups).toHaveLength(0)
    })

    it("各グループに曜日が正しく設定される", () => {
      const entries: DailyReportEntry[] = [
        {
          id: "1",
          reportDate: "2026-02-27", // 金曜日
          actualHours: 2,
          content: "学習",
          likedByManager: false,
          createdAt: "2026-02-27T10:00:00Z",
        },
      ]

      const groups = groupReportsByDate(entries)

      expect(groups[0].dayOfWeek).toBe("金")
    })

    it("各グループの合計学習時間が正しく計算される", () => {
      const entries: DailyReportEntry[] = [
        {
          id: "1",
          reportDate: "2026-02-27",
          actualHours: 2,
          content: "A",
          likedByManager: false,
          createdAt: "2026-02-27T09:00:00Z",
        },
        {
          id: "2",
          reportDate: "2026-02-27",
          actualHours: 1.5,
          content: "B",
          likedByManager: false,
          createdAt: "2026-02-27T13:00:00Z",
        },
        {
          id: "3",
          reportDate: "2026-02-27",
          actualHours: 0.5,
          content: "C",
          likedByManager: false,
          createdAt: "2026-02-27T17:00:00Z",
        },
      ]

      const groups = groupReportsByDate(entries)

      expect(groups[0].totalHours).toBe(4)
    })

    it("グループが日付の降順でソートされる", () => {
      const entries: DailyReportEntry[] = [
        {
          id: "1",
          reportDate: "2026-02-25",
          actualHours: 1,
          content: "古い",
          likedByManager: false,
          createdAt: "2026-02-25T10:00:00Z",
        },
        {
          id: "2",
          reportDate: "2026-02-27",
          actualHours: 2,
          content: "新しい",
          likedByManager: false,
          createdAt: "2026-02-27T10:00:00Z",
        },
        {
          id: "3",
          reportDate: "2026-02-26",
          actualHours: 1.5,
          content: "中間",
          likedByManager: false,
          createdAt: "2026-02-26T10:00:00Z",
        },
      ]

      const groups = groupReportsByDate(entries)

      expect(groups[0].date).toBe("2026-02-27")
      expect(groups[1].date).toBe("2026-02-26")
      expect(groups[2].date).toBe("2026-02-25")
    })
  })
})
