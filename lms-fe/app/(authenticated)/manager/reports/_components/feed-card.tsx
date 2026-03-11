"use client"

import { useActionState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toggleLike } from "@/app/(authenticated)/reports/actions"
import { getAvatarInitial, getAvatarColor, shouldShowLikeButton } from "@/lib/utils/avatar"
import type { ActionResult } from "@/lib/validations/auth"
import type { UserRole } from "@/lib/types/app-shell"

export interface FeedCardProps {
  report: {
    id: string
    userId: string
    userName: string
    reportDate: string
    actualHours: number
    content: string
    likedByManager: boolean
  }
  /** 現在のユーザーロール（Manager のみいいねボタン表示） */
  currentUserRole: UserRole
}

/**
 * フィードカード (Client Component)
 *
 * Manager 向け日報フィードの個別カード。
 * ユーザー名、アバター、日付、学習時間、学習内容を表示する。
 * Manager ロールのみいいねトグルボタンを表示する。
 */
export function FeedCard({ report, currentUserRole }: FeedCardProps) {
  const [, formAction, isPending] = useActionState<ActionResult, FormData>(
    toggleLike,
    null
  )

  const initial = getAvatarInitial(report.userName)
  const color = getAvatarColor(report.userId)
  const liked = report.likedByManager
  const showLike = shouldShowLikeButton(currentUserRole)

  // 日付表示フォーマット
  const dateObj = new Date(report.reportDate + "T00:00:00")
  const dayOfWeekNames = ["日", "月", "火", "水", "木", "金", "土"]
  const dateDisplay = `${dateObj.getMonth() + 1}/${dateObj.getDate()} (${dayOfWeekNames[dateObj.getDay()]})`

  return (
    <Card
      className={`p-5 transition-colors ${
        liked ? "bg-[#FEF2F2] border-red-200" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        {/* アバター */}
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {initial}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold">{report.userName}</span>
            <span className="text-xs text-muted-foreground">{dateDisplay}</span>
            <span className="text-xs text-muted-foreground">
              {report.actualHours}h
            </span>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
            {report.content}
          </p>
        </div>

        {/* いいねボタン（Manager のみ） */}
        {showLike && (
          <form action={formAction}>
            <input type="hidden" name="reportId" value={report.id} />
            <input type="hidden" name="liked" value={String(liked)} />
            <Button
              type="submit"
              variant={liked ? "default" : "outline"}
              size="sm"
              disabled={isPending}
              className={
                liked
                  ? "bg-[#EF4444] text-white hover:bg-[#EF4444]/90 gap-1.5"
                  : "gap-1.5"
              }
            >
              <Heart
                className={`size-4 ${liked ? "fill-current" : ""}`}
              />
              <span className="text-xs">
                {liked ? "いいね済み" : "いいね"}
              </span>
            </Button>
          </form>
        )}
      </div>
    </Card>
  )
}
