"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { TriangleAlert, Trash2 } from "lucide-react"

import { deleteUserPermanently } from "../../actions"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  isSelf?: boolean
}

export function DeleteDialog({
  open,
  onOpenChange,
  userId,
  userName,
  isSelf = false,
}: DeleteDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    setError(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.append("userId", userId)

      const result = await deleteUserPermanently(null, formData)

      if (result?.success) {
        onOpenChange(false)
        toast.success(result.message)
        router.push("/admin/users")
      } else {
        setError(result?.message ?? "ユーザーの削除に失敗しました。")
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
            アカウントを完全に削除
          </DialogTitle>
          <DialogDescription>
            この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>

        {/* 警告ボックス */}
        <div className="flex items-start gap-3 rounded-md bg-[#FEF2F2] p-4">
          <TriangleAlert className="size-5 shrink-0 text-destructive" />
          <p className="text-[13px] text-[#991B1B]">
            {userName}{" "}
            のアカウントとすべての関連データを完全に削除します。この操作は不可逆であり、復元することはできません。
            {isSelf && (
              <>
                <br /><br />
                <strong>注意: これはあなた自身のアカウントです。削除すると即座にログアウトされ、二度とログインできなくなります。</strong>
              </>
            )}
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
            {isPending ? "処理中..." : "完全に削除する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
