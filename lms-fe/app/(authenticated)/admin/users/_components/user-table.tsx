"use client"

import { usePathname, useRouter } from "next/navigation"
import { differenceInDays } from "date-fns"
import { EllipsisIcon, UsersIcon } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { UserListItem } from "@/lib/types/user-management"
import type { UserRole } from "@/lib/types/app-shell"

const ROLE_LABELS: Record<UserRole, string> = {
  user: "受講生",
  manager: "マネージャー",
  super_admin: "スーパー管理者",
}

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  user: "bg-blue-100 text-blue-700 border-blue-200",
  manager: "bg-purple-100 text-purple-700 border-purple-200",
  super_admin: "bg-red-100 text-red-700 border-red-200",
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

function getElapsedDays(dateStr: string): number {
  return differenceInDays(new Date(), new Date(dateStr))
}

function getInitial(fullName: string | null): string {
  if (!fullName) return "?"
  return fullName.charAt(0)
}

interface UserTableProps {
  users: UserListItem[]
  totalCount: number
  page: number
  perPage: number
  paginationSlot?: React.ReactNode
}

export function UserTable({ users, paginationSlot }: UserTableProps) {
  const router = useRouter()
  const pathname = usePathname()

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-md">
        <UsersIcon className="size-10 mb-3 opacity-40" />
        <p className="text-sm">ユーザーが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow className="h-11 bg-muted">
            <TableHead className="w-10 text-center">
              <input type="checkbox" className="size-4 rounded border-border" disabled />
            </TableHead>
            <TableHead className="w-[180px] text-[13px] text-muted-foreground">氏名</TableHead>
            <TableHead className="text-[13px] text-muted-foreground">メールアドレス</TableHead>
            <TableHead className="w-[120px] text-[13px] text-muted-foreground">ロール</TableHead>
            <TableHead className="w-[90px] text-[13px] text-muted-foreground">受講状態</TableHead>
            <TableHead className="w-[120px] text-[13px] text-muted-foreground">作成日</TableHead>
            <TableHead className="w-[90px] text-[13px] text-muted-foreground">経過日数</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="cursor-pointer h-[52px]"
              onClick={() => router.push(`${pathname}/${user.id}`)}
            >
              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" className="size-4 rounded border-border" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8 text-xs">
                    {user.avatarUrl && (
                      <AvatarImage
                        src={user.avatarUrl}
                        alt={user.fullName ?? ""}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {getInitial(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-normal">
                    {user.fullName ?? "未設定"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-[13px] font-normal">
                {user.email}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`rounded-full px-2.5 py-1 text-xs ${ROLE_BADGE_CLASSES[user.role]}`}
                >
                  {ROLE_LABELS[user.role]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    user.isBanned
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-green-100 text-green-700 border-green-200"
                  }`}
                >
                  {user.isBanned ? "無効" : "有効"}
                </Badge>
              </TableCell>
              <TableCell className="text-[13px] font-normal">
                {formatDate(user.createdAt)}
              </TableCell>
              <TableCell className="text-[13px] font-normal tabular-nums">
                {getElapsedDays(user.createdAt)}日
              </TableCell>
              <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                <EllipsisIcon className="size-[18px] text-muted-foreground mx-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* ページネーション（テーブルカード内） */}
      {paginationSlot && (
        <div className="flex items-center justify-between border-t px-4 h-[52px]">
          {paginationSlot}
        </div>
      )}
    </div>
  )
}
