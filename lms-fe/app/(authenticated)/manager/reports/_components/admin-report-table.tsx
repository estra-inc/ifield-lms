"use client"

import { useState, useOptimistic, useCallback, useTransition } from "react"
import Link from "next/link"
import { Heart, FileText, Clock, CalendarDays } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getAvatarInitial, getAvatarColor, shouldShowLikeButton } from "@/lib/utils/avatar"
import { toggleLike } from "@/app/(authenticated)/reports/actions"
import type { AdminReportRow } from "@/lib/types/daily-reports"
import type { UserRole } from "@/lib/types/app-shell"

export interface AdminReportTableProps {
  reports: AdminReportRow[]
  totalCount: number
  currentPage: number
  pageSize: number
  currentUserRole?: UserRole
  paginationSlot?: React.ReactNode
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 管理テーブルコンポーネント (Client Component)
 *
 * Manager/Super Admin 向けの日報テーブルビュー。
 * ユーザー名クリックでユーザー詳細に遷移、それ以外のクリックで日報詳細モーダルを表示。
 * Manager ロールの場合はモーダル内でいいねトグルが可能。
 */
export function AdminReportTable({
  reports,
  currentUserRole = "super_admin",
  paginationSlot,
}: AdminReportTableProps) {
  const [selectedReport, setSelectedReport] = useState<AdminReportRow | null>(null)
  const [optimisticReports, toggleOptimistic] = useOptimistic(
    reports,
    (state, reportId: string) =>
      state.map((r) =>
        r.id === reportId ? { ...r, likedByManager: !r.likedByManager } : r
      )
  )

  const handleLikeToggled = useCallback(
    (reportId: string) => {
      // toggleOptimistic is called from within startTransition in the child
      toggleOptimistic(reportId)
      setSelectedReport((prev) =>
        prev?.id === reportId
          ? { ...prev, likedByManager: !prev.likedByManager }
          : prev
      )
    },
    [toggleOptimistic]
  )

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-md">
        <FileText className="size-10 mb-3 opacity-40" />
        <p className="text-sm">日報が見つかりません</p>
      </div>
    )
  }

  const showLike = shouldShowLikeButton(currentUserRole)

  return (
    <>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="h-11 bg-muted">
              <TableHead className="w-[160px] text-[13px] text-muted-foreground">
                ユーザー
              </TableHead>
              <TableHead className="w-[90px] text-[13px] text-muted-foreground">
                日付
              </TableHead>
              <TableHead className="w-[80px] text-[13px] text-muted-foreground">
                学習時間
              </TableHead>
              <TableHead className="text-[13px] text-muted-foreground">
                学習内容
              </TableHead>
              <TableHead className="w-[70px] text-[13px] text-muted-foreground text-center">
                いいね
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticReports.map((report) => {
              const initial = getAvatarInitial(report.userName)
              const color = getAvatarColor(report.id)

              return (
                <TableRow
                  key={report.id}
                  className="h-[52px] cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  {/* ユーザー */}
                  <TableCell>
                    <Link
                      href={currentUserRole === "super_admin" ? `/admin/users/${report.userId}` : `/users/${report.userId}`}
                      className="flex items-center gap-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {initial}
                      </div>
                      <span className="text-sm font-normal truncate hover:underline">
                        {report.userName}
                      </span>
                    </Link>
                  </TableCell>

                  {/* 日付 */}
                  <TableCell className="text-[13px] font-normal tabular-nums">
                    {formatDate(report.reportDate)}
                  </TableCell>

                  {/* 学習時間 */}
                  <TableCell className="text-[13px] font-normal tabular-nums">
                    {report.actualHours}h
                  </TableCell>

                  {/* 学習内容 */}
                  <TableCell className="text-[13px] font-normal">
                    <p className="truncate max-w-[300px]">{report.content}</p>
                  </TableCell>

                  {/* いいね */}
                  <TableCell className="text-center">
                    <Heart
                      className={`size-4 mx-auto ${
                        report.likedByManager
                          ? "text-red-500 fill-red-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* ページネーション */}
        {paginationSlot && (
          <div className="flex items-center justify-between border-t px-4 h-[52px]">
            {paginationSlot}
          </div>
        )}
      </div>

      {/* 日報詳細モーダル */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        {selectedReport && (
          <ReportDetailContent
            report={selectedReport}
            showLike={showLike}
            onLikeToggled={handleLikeToggled}
          />
        )}
      </Dialog>
    </>
  )
}

/**
 * モーダル内コンテンツ（useOptimistic で即時反映）
 */
function ReportDetailContent({
  report,
  showLike,
  onLikeToggled,
}: {
  report: AdminReportRow
  showLike: boolean
  onLikeToggled?: (reportId: string) => void
}) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(report.likedByManager)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const currentLiked = optimisticLiked
    startTransition(async () => {
      setOptimisticLiked(!currentLiked)
      onLikeToggled?.(report.id)

      const formData = new FormData()
      formData.set("reportId", report.id)
      formData.set("liked", String(currentLiked))
      await toggleLike(null, formData)
    })
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>日報詳細</DialogTitle>
        <DialogDescription>
          {report.userName} さんの日報
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        {/* メタ情報 */}
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="size-4" />
            {formatDateFull(report.reportDate)}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-4" />
            {report.actualHours}h
          </span>
          {!showLike && optimisticLiked && (
            <span className="flex items-center gap-1.5 text-red-500">
              <Heart className="size-4 fill-red-500" />
              いいね済み
            </span>
          )}
        </div>

        {/* 学習内容 */}
        <div className="rounded-md border bg-muted/30 p-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {report.content}
          </p>
        </div>

        {/* いいねボタン（Manager のみ） */}
        {showLike && (
          <Button
            type="button"
            variant={optimisticLiked ? "default" : "outline"}
            size="sm"
            disabled={isPending}
            onClick={handleToggle}
            className={
              optimisticLiked
                ? "bg-[#EF4444] text-white hover:bg-[#EF4444]/90 gap-1.5 w-fit"
                : "gap-1.5 w-fit"
            }
          >
            <Heart
              className={`size-4 ${optimisticLiked ? "fill-current" : ""}`}
            />
            <span className="text-xs">
              {optimisticLiked ? "いいね済み" : "いいね"}
            </span>
          </Button>
        )}
      </div>
    </DialogContent>
  )
}
