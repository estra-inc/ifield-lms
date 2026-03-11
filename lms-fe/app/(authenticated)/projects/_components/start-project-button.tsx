"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Play, AlertTriangle, Loader2 } from "lucide-react"
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
} from "@/components/ui/dialog"
import { startProject } from "@/app/(authenticated)/projects/actions"

/**
 * StartProjectButton Client Component
 *
 * 着手ボタン + 確認ダイアログ + 提出予定日入力を提供する。
 *
 * Task 7.2
 * Requirements: 2.2, 2.4, 2.5, 2.6, 4.4, 6.6
 */

interface StartProjectButtonProps {
  projectId: string
  currentTerm: string | null
  hasActiveAssignment: boolean
}

export function StartProjectButton({
  projectId,
  currentTerm,
  hasActiveAssignment,
}: StartProjectButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showTermDialog, setShowTermDialog] = useState(false)
  const [showDueDateDialog, setShowDueDateDialog] = useState(false)
  const [dueDate, setDueDate] = useState("")

  const needsConfirmation = currentTerm === "基礎"

  const handleStart = () => {
    if (needsConfirmation) {
      setShowTermDialog(true)
      return
    }

    setShowDueDateDialog(true)
  }

  const handleTermConfirm = () => {
    setShowTermDialog(false)
    setShowDueDateDialog(true)
  }

  const executeStart = () => {
    setShowDueDateDialog(false)
    const dueDateISO = dueDate
      ? new Date(dueDate + "T23:59:59").toISOString()
      : null

    startTransition(async () => {
      const result = await startProject(projectId, dueDateISO)

      if (result.success) {
        if (result.termChanged) {
          toast.success("実践タームに移行しました")
        } else {
          toast.success(result.message)
        }
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      {hasActiveAssignment && (
        <p className="font-mono text-xs text-destructive">
          <AlertTriangle className="mr-1 inline-block size-3.5" />
          他の案件が進行中のため着手できません
        </p>
      )}

      <Button
        onClick={handleStart}
        disabled={hasActiveAssignment || isPending}
        className="gap-2"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Play className="size-4" />
        )}
        着手する
      </Button>

      {/* ターム移行確認ダイアログ */}
      <Dialog open={showTermDialog} onOpenChange={setShowTermDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タームの移行</DialogTitle>
            <DialogDescription>
              模擬案件に着手すると、学習タームが「基礎」から「実践」に自動移行します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTermDialog(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button onClick={handleTermConfirm} disabled={isPending}>
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 提出予定日入力ダイアログ */}
      <Dialog open={showDueDateDialog} onOpenChange={setShowDueDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提出予定日の設定</DialogTitle>
            <DialogDescription>
              案件の提出予定日を設定してください。後から変更することもできます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="due-date-start" className="font-mono text-sm">
              提出予定日
            </Label>
            <Input
              id="due-date-start"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full font-mono"
              data-testid="due-date-start-input"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDueDateDialog(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button onClick={executeStart} disabled={isPending || !dueDate}>
              {isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              着手する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
