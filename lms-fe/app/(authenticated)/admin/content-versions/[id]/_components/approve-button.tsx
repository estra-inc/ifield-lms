"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CircleCheckIcon, Loader2Icon } from "lucide-react"

import { approveVersion } from "../../_actions/approve-version"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

interface ChangesSummary {
  added: number
  updated: number
  deleted: number
}

interface ApproveButtonProps {
  versionId: string
  changesSummary: ChangesSummary | null
}

/**
 * 承認ボタンと確認ダイアログの Client Component
 *
 * バージョン詳細ページに配置される。ボタン押下で AlertDialog を表示し、
 * 確認後に approveVersion Server Action を実行する。
 *
 * Requirements: 8.3, 8.4, 5.1, 5.4
 */
export function ApproveButton({
  versionId,
  changesSummary,
}: ApproveButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const handleApprove = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("versionId", versionId)

      const result = await approveVersion(null, formData)

      if (result?.success) {
        setOpen(false)
        toast.success(result.message)
        router.push("/admin/content-versions")
      } else {
        toast.error(result?.message ?? "承認処理に失敗しました。")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button className="rounded-none font-[family-name:var(--font-primary)]">
          <CircleCheckIcon className="size-4 mr-1" />
          承認して公開
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-none">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-[family-name:var(--font-primary)]">
            コンテンツを公開しますか？
          </AlertDialogTitle>
          <AlertDialogDescription className="font-[family-name:var(--font-primary)]">
            この操作により、draft バージョンが active に昇格し、受講生に公開されます。
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* 変更サマリー表示 */}
        {changesSummary && (
          <div className="flex flex-wrap gap-2 py-2">
            {changesSummary.added > 0 && (
              <Badge className="rounded-none bg-green-100 text-green-800 hover:bg-green-100">
                +{changesSummary.added}件 追加
              </Badge>
            )}
            {changesSummary.updated > 0 && (
              <Badge className="rounded-none bg-blue-100 text-blue-800 hover:bg-blue-100">
                {changesSummary.updated}件 更新
              </Badge>
            )}
            {changesSummary.deleted > 0 && (
              <Badge className="rounded-none bg-red-100 text-red-800 hover:bg-red-100">
                {changesSummary.deleted}件 削除
              </Badge>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            className="rounded-none font-[family-name:var(--font-primary)]"
            disabled={isPending}
          >
            キャンセル
          </AlertDialogCancel>
          <Button
            className="rounded-none font-[family-name:var(--font-primary)]"
            onClick={handleApprove}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2Icon className="size-4 mr-1 animate-spin" />
                処理中...
              </>
            ) : (
              "承認して公開する"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
