"use client"

import { useState } from "react"
import { Heart, Clock, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import type { DailyReportEntry } from "@/lib/types/daily-reports"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditReportDialog } from "./edit-report-dialog"
import { DeleteReportDialog } from "./delete-report-dialog"

export interface ReportEntryCardProps {
  entry: DailyReportEntry
}

/**
 * 日報エントリカード (Client Component)
 *
 * 各エントリの学習時間、学習内容、いいね状態を表示する。
 * 左にアクセントバーを配置する Pencil デザイン準拠のカードレイアウト。
 * 三点メニューから編集・削除が可能。
 */
export function ReportEntryCard({ entry }: ReportEntryCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <div className="flex border bg-card shadow-sm">
        {/* 左アクセントバー */}
        <div
          className={`w-1 shrink-0 ${
            entry.likedByManager ? "bg-red-500" : "bg-primary"
          }`}
        />

        <div className="flex flex-1 flex-col gap-2 p-4">
          {/* 上部: 学習時間 + いいね状態 + メニュー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">
                {entry.actualHours}h
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {entry.likedByManager ? (
                <>
                  <Heart className="size-4 fill-red-500 text-red-500" />
                  <span className="text-xs text-red-500 font-medium">
                    いいね済み
                  </span>
                </>
              ) : (
                <Heart className="size-4 text-muted-foreground" />
              )}

              {/* 三点メニュー */}
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 ml-1"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">メニューを開く</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setMenuOpen(false)
                      // DropdownMenu のクローズアニメーション完了後に Dialog を開く
                      requestAnimationFrame(() => setEditOpen(true))
                    }}
                  >
                    <Pencil className="size-4" />
                    編集
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      setMenuOpen(false)
                      requestAnimationFrame(() => setDeleteOpen(true))
                    }}
                  >
                    <Trash2 className="size-4" />
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 学習内容 */}
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {entry.content}
          </p>
        </div>
      </div>

      {/* ダイアログ群（カードの外に配置して z-index 問題を回避） */}
      <EditReportDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        entry={entry}
      />
      <DeleteReportDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entry={entry}
      />
    </>
  )
}
