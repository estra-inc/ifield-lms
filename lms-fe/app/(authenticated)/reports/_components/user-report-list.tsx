import { CalendarDays, Clock } from "lucide-react"
import type { DailyReportEntry, DateGroup } from "@/lib/types/daily-reports"
import { ReportEntryCard } from "./report-entry-card"

export interface UserReportListProps {
  groups: DateGroup[]
  nextCursor: string | null
}

/**
 * 日報エントリを日付ごとにグループ化するユーティリティ関数
 */
export function groupReportsByDate(entries: DailyReportEntry[]): DateGroup[] {
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

/**
 * 日報一覧コンポーネント (Server Component)
 *
 * 日報データを日付ごとにグループ化して表示する。
 * 各日付グループのヘッダーに日付、曜日、合計時間を表示し、
 * グループ内に各エントリカードを配置する。
 */
export function UserReportList({ groups, nextCursor }: UserReportListProps) {
  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CalendarDays className="size-12 mb-4 opacity-40" />
        <p className="text-sm">日報がまだありません</p>
        <p className="text-xs mt-1">日報を作成して学習記録を始めましょう</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.date} className="flex flex-col gap-3">
          {/* 日付グループヘッダー */}
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">
              {formatDateDisplay(group.date)}
              <span className="ml-1 text-muted-foreground">
                ({group.dayOfWeek})
              </span>
            </h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>合計 {group.totalHours}h</span>
            </div>
            <div className="flex-1 border-b" />
          </div>

          {/* エントリカード群 */}
          <div className="flex flex-col gap-2 pl-1">
            {group.entries.map((entry) => (
              <ReportEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 日付表示用フォーマット（例: "2月27日"）
 */
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return `${date.getMonth() + 1}月${date.getDate()}日`
}
