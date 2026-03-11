import { FileText } from "lucide-react"
import { FeedCard } from "./feed-card"
import type { ReportFeedItem } from "@/lib/types/daily-reports"
import type { UserRole } from "@/lib/types/app-shell"

export interface FeedListProps {
  items: ReportFeedItem[]
  currentUserRole: UserRole
}

/**
 * フィードリストコンポーネント
 *
 * ReportFeedItem の配列を受け取り、FeedCard のリストをレンダリングする。
 */
export function FeedList({ items, currentUserRole }: FeedListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="size-12 mb-4 opacity-40" />
        <p className="text-sm">日報がまだありません</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <FeedCard
          key={item.id}
          report={{
            id: item.id,
            userId: item.userId,
            userName: item.userName,
            reportDate: item.reportDate,
            actualHours: item.actualHours,
            content: item.content,
            likedByManager: item.likedByManager,
          }}
          currentUserRole={currentUserRole}
        />
      ))}
    </div>
  )
}
