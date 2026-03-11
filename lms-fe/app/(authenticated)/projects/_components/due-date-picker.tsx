"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { updateDueDate } from "@/app/(authenticated)/projects/actions"

/**
 * DueDateEditDialog Client Component
 *
 * 提出予定日の表示と、モーダルダイアログによる変更機能を提供する。
 * 変更時に「コーチに確認しましたか？」の確認文言を表示する。
 */

interface DueDateEditDialogProps {
  assignmentId: string
  dueDate: string | null
}

function toDateInputValue(dateString: string | null): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-"
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date)
}

export function DueDateEditDialog({
  assignmentId,
  dueDate,
}: DueDateEditDialogProps) {
  const [open, setOpen] = useState(false)
  const [editValue, setEditValue] = useState(toDateInputValue(dueDate))
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      setEditValue(toDateInputValue(dueDate))
    }
  }

  const handleSave = () => {
    const newDueDate = editValue
      ? new Date(editValue + "T23:59:59").toISOString()
      : null

    startTransition(async () => {
      const result = await updateDueDate(assignmentId, newDueDate)
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <p className="font-mono text-sm font-medium" data-testid="due-date">
        {formatDate(dueDate)}
      </p>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            data-testid="due-date-edit-button"
          >
            <Pencil className="size-3" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提出予定日の変更</DialogTitle>
            <DialogDescription className="sr-only">
              提出予定日を変更するダイアログです。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
              <p className="font-mono text-sm font-medium text-amber-800 dark:text-amber-200" data-testid="coach-confirmation">
                コーチに確認しましたか？
              </p>
              <p className="mt-1 font-mono text-xs text-amber-700 dark:text-amber-300">
                提出予定日を変更する場合は、事前にコーチへ相談してください。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="due-date-edit" className="font-mono text-sm">
                提出予定日
              </Label>
              <Input
                id="due-date-edit"
                type="date"
                value={editValue}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setEditValue(e.target.value)}
                disabled={isPending}
                className="w-full font-mono"
                data-testid="due-date-edit-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={isPending || !editValue}>
              変更する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
