"use client"

import { useTransition, useState } from "react"
import { toast } from "sonner"

import { TriangleAlert, Trash2 } from "lucide-react"

import { deleteDailyReport } from "@/app/(authenticated)/reports/actions"
import type { DailyReportEntry } from "@/lib/types/daily-reports"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: DailyReportEntry
}

export function DeleteReportDialog({
  open,
  onOpenChange,
  entry,
}: DeleteReportDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    setError(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append("reportId", entry.id)

      const result = await deleteDailyReport(null, formData)

      if (result?.success) {
        onOpenChange(false)
        toast.success(result.message)
      } else {
        setError(result?.message ?? "日報の削除に失敗しました。")
      }
    })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) {
      onOpenChange(nextOpen)
      if (!nextOpen) {
        setError(null)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-destructive">
            日報を削除
          </DialogTitle>
          <DialogDescription>
            この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>

        {/* 警告ボックス */}
        <div className="flex items-start gap-3 rounded-md bg-[#FEF2F2] p-4">
          <TriangleAlert className="size-5 shrink-0 text-destructive" />
          <p className="text-[13px] text-[#991B1B]">
            {entry.reportDate} の日報（学習時間: {entry.actualHours}h）を削除します。この操作は不可逆であり、復元することはできません。
          </p>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            onClick={handleConfirm}
            disabled={isPending}
          >
            <Trash2 className="size-4" />
            {isPending ? "削除中..." : "削除する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
