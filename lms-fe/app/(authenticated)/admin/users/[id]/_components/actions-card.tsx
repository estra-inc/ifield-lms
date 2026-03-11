"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, Check, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { changeUserRole, activateUser } from "../../actions"
import type { UserDetail } from "@/lib/types/user-management"
import type { UserRole } from "@/lib/types/app-shell"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import { DeactivateDialog } from "./deactivate-dialog"
import { DeleteDialog } from "./delete-dialog"

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "user", label: "受講生 (User)" },
  { value: "manager", label: "マネージャー (Manager)" },
  { value: "super_admin", label: "スーパー管理者 (Super Admin)" },
]

interface ActionsCardProps {
  user: UserDetail
  isSelf: boolean
}

export function ActionsCard({ user, isSelf }: ActionsCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentRole, setCurrentRole] = useState<UserRole>(user.role)
  const [isBanned, setIsBanned] = useState(user.isBanned)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleRoleChange = (newRole: string) => {
    if (isSelf && newRole !== "super_admin") {
      if (!window.confirm("自分自身のロールを変更すると、管理画面にアクセスできなくなる可能性があります。続行しますか？")) {
        return
      }
    }
    const previousRole = currentRole
    setCurrentRole(newRole as UserRole)

    startTransition(async () => {
      const formData = new FormData()
      formData.append("userId", user.id)
      formData.append("role", newRole)

      const result = await changeUserRole(null, formData)

      if (result?.success) {
        toast.success(result.message)
      } else {
        setCurrentRole(previousRole)
        toast.error(result?.message ?? "ロールの変更に失敗しました。")
      }
    })
  }

  const handleActivate = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("userId", user.id)

      const result = await activateUser(null, formData)

      if (result?.success) {
        setIsBanned(false)
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result?.message ?? "アカウントの有効化に失敗しました。")
      }
    })
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      {/* タイトル */}
      <p className="text-[15px] font-semibold">アクション</p>

      {/* ロール変更 */}
      <div className="flex items-center justify-between">
        <span className="text-[13px]">ロール変更</span>
        <Select
          value={currentRole}
          onValueChange={handleRoleChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* 無効化 / 有効化 */}
      {isBanned ? (
        <Button
          variant="outline"
          className="h-10 w-full gap-2 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
          onClick={handleActivate}
          disabled={isPending}
        >
          <Check className="size-4" />
          アカウントを有効化
        </Button>
      ) : (
        <Button
          variant="outline"
          className="h-10 w-full gap-2 border-destructive text-destructive hover:bg-destructive/10"
          onClick={() => setDeactivateOpen(true)}
          disabled={isPending}
        >
          <Ban className="size-4" />
          アカウントを無効化
        </Button>
      )}

      <Separator />

      {/* 物理削除 */}
      <Button
        variant="destructive"
        className="h-10 w-full gap-2"
        onClick={() => setDeleteOpen(true)}
        disabled={isPending}
      >
        <Trash2 className="size-4" />
        アカウントを完全に削除
      </Button>

      {/* ダイアログ */}
      <DeactivateDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        userId={user.id}
        userName={user.fullName ?? "未設定"}
        isSelf={isSelf}
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        userId={user.id}
        userName={user.fullName ?? "未設定"}
        isSelf={isSelf}
      />
    </Card>
  )
}
