"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { adminCancelSession } from "../actions"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type SessionStatus = "scheduled" | "completed" | "cancelled_by_student" | "cancelled_by_admin" | "no_show"

const STATUS_LABELS: Record<SessionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "予約済み", variant: "default" },
  completed: { label: "完了", variant: "secondary" },
  cancelled_by_student: { label: "キャンセル済み", variant: "outline" },
  cancelled_by_admin: { label: "管理者キャンセル", variant: "destructive" },
  no_show: { label: "未出席", variant: "destructive" },
}

export interface AdminSessionRow {
  id: string
  user_id: string
  session_date: string
  start_time: string
  end_time: string
  status: string
  created_at: string
  userName: string
}

interface SessionTableProps {
  sessions: AdminSessionRow[]
}

function CancelModal({
  session,
  open,
  onOpenChange,
}: {
  session: AdminSessionRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [refund, setRefund] = useState(true)

  const handleConfirm = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("sessionId", session.id)
      formData.append("refund", String(refund))

      const result = await adminCancelSession(null, formData)

      if (result?.success) {
        onOpenChange(false)
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result?.message ?? "キャンセルに失敗しました。")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>管理者キャンセル</AlertDialogTitle>
          <AlertDialogDescription>
            以下のコーチングセッションをキャンセルします。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <dt className="font-[family-name:var(--font-primary)] text-muted-foreground">受講生</dt>
            <dd className="font-[family-name:var(--font-primary)]">{session.userName}</dd>
            <dt className="font-[family-name:var(--font-primary)] text-muted-foreground">日付</dt>
            <dd className="font-[family-name:var(--font-secondary)]">
              {new Date(session.session_date + "T00:00:00").toLocaleDateString("ja-JP", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                weekday: "short",
              })}
            </dd>
            <dt className="font-[family-name:var(--font-primary)] text-muted-foreground">時間</dt>
            <dd className="font-[family-name:var(--font-secondary)]">
              {session.start_time.slice(0, 5)} 〜 {session.end_time.slice(0, 5)}
            </dd>
          </dl>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="refund-checkbox"
            checked={refund}
            onCheckedChange={(checked) => setRefund(checked === true)}
          />
          <Label htmlFor="refund-checkbox" className="text-sm font-normal cursor-pointer">
            コーチング枠を1回分返却する
          </Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>戻る</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            キャンセルする
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function SessionTable({ sessions }: SessionTableProps) {
  const [cancelTarget, setCancelTarget] = useState<AdminSessionRow | null>(null)

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="h-11 bg-muted">
            <TableHead className="text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
              受講生
            </TableHead>
            <TableHead className="w-[120px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
              日付
            </TableHead>
            <TableHead className="w-[140px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
              時間
            </TableHead>
            <TableHead className="w-[140px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
              ステータス
            </TableHead>
            <TableHead className="w-[180px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
              予約日時
            </TableHead>
            <TableHead className="w-[100px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => {
            const statusInfo = STATUS_LABELS[session.status as SessionStatus] ?? { label: session.status, variant: "default" as const }
            const canCancel = session.status === "scheduled"

            return (
              <TableRow key={session.id} className="h-[52px]">
                <TableCell className="px-4">
                  <span className="font-[family-name:var(--font-primary)] text-sm text-foreground">
                    {session.userName}
                  </span>
                </TableCell>
                <TableCell className="px-4">
                  <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                    {new Date(session.session_date + "T00:00:00").toLocaleDateString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                      month: "2-digit",
                      day: "2-digit",
                      weekday: "short",
                    })}
                  </span>
                </TableCell>
                <TableCell className="px-4">
                  <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                    {session.start_time.slice(0, 5)} 〜 {session.end_time.slice(0, 5)}
                  </span>
                </TableCell>
                <TableCell className="px-4">
                  <Badge variant={statusInfo.variant}>
                    {statusInfo.label}
                  </Badge>
                </TableCell>
                <TableCell className="px-4">
                  <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                    {new Date(session.created_at).toLocaleString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                    })}
                  </span>
                </TableCell>
                <TableCell className="px-4">
                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-destructive hover:text-destructive font-[family-name:var(--font-primary)]"
                      onClick={() => setCancelTarget(session)}
                    >
                      <X className="size-3.5" />
                      キャンセル
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* キャンセルモーダル */}
      <CancelModal
        session={cancelTarget ?? sessions[0]}
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
      />
    </>
  )
}
