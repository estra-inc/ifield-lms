"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SubmitForm } from "./submit-form"

/**
 * SubmitDialog Client Component
 *
 * 「成果物を提出する」ボタンを表示し、クリックでダイアログを開く。
 * ダイアログ内に SubmitForm を配置し、提出成功時にダイアログを閉じて画面をリフレッシュする。
 */

interface SubmitDialogProps {
  assignmentId: string
  isGrading: boolean
  isArchived: boolean
}

export function SubmitDialog({
  assignmentId,
  isGrading,
  isArchived,
}: SubmitDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const isDisabled = isGrading || isArchived

  const handleSuccess = () => {
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={isDisabled} className="gap-2">
          <Send className="size-4" />
          成果物を提出する
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>成果物提出</DialogTitle>
          <DialogDescription>
            URLまたはファイルを添付して成果物を提出してください。
          </DialogDescription>
        </DialogHeader>
        <SubmitForm
          assignmentId={assignmentId}
          isGrading={isGrading}
          isArchived={isArchived}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}
