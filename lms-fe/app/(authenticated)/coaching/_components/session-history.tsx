"use client"

import { useState, useTransition } from "react"
import { Loader2, X, Video, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { cancelSession } from "../actions"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as AlertContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export interface SessionItem {
  id: string
  sessionDate: string
  startTime: string
  endTime: string
  genre?: string
  status: string
  googleMeetUrl?: string | null
  createdAt: string
  coachName?: string | null
}

const GENRE_LABELS: Record<string, string> = {
  engineering: "エンジニアリング",
  design: "デザイン",
}

interface SessionHistoryProps {
  sessions: SessionItem[]
  onCancelled: (sessionId: string) => void
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "予約済み", variant: "default" },
  completed: { label: "完了", variant: "secondary" },
  cancelled_by_student: { label: "キャンセル済み", variant: "outline" },
  cancelled_by_admin: { label: "管理者キャンセル", variant: "destructive" },
  no_show: { label: "未出席", variant: "destructive" },
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"]
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = weekdays[date.getDay()]
  return `${m}/${d}（${w}）`
}

function formatDateLabelLong(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"]
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = weekdays[date.getDay()]
  return `${y}年${m}月${d}日（${w}）`
}

function CancelButton({ session, onCancelled }: { session: SessionItem; onCancelled: (sessionId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleConfirm = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("sessionId", session.id)

      const result = await cancelSession(null, formData)

      if (result?.success) {
        setOpen(false)
        toast.success(result.message)
        onCancelled(session.id)
      } else {
        toast.error(result?.message ?? "キャンセルに失敗しました。")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1"
          style={{ color: "var(--destructive)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <X className="size-3.5" />
          キャンセル
        </Button>
      </AlertDialogTrigger>
      <AlertContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>予約をキャンセルしますか？</AlertDialogTitle>
          <AlertDialogDescription>
            以下のコーチング予約をキャンセルします。キャンセルするとコーチング枠が1回分返却されます。
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted-foreground">日付</dt>
            <dd>{formatDateLabel(session.sessionDate)}</dd>
            <dt className="text-muted-foreground">時間</dt>
            <dd>{session.startTime.slice(0, 5)} 〜 {session.endTime.slice(0, 5)}</dd>
          </dl>
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
      </AlertContent>
    </AlertDialog>
  )
}

/** セッション詳細モーダル */
function SessionDetailDialog({
  session,
  open,
  onOpenChange,
}: {
  session: SessionItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const statusInfo = STATUS_LABELS[session.status] ?? { label: session.status, variant: "default" as const }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>予約詳細</DialogTitle>
          <DialogDescription>コーチングセッションの詳細情報</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">ジャンル</dt>
              <dd className="font-medium">{GENRE_LABELS[session.genre ?? "engineering"] ?? session.genre}</dd>
              <dt className="text-muted-foreground">日付</dt>
              <dd className="font-medium">{formatDateLabelLong(session.sessionDate)}</dd>
              <dt className="text-muted-foreground">時間</dt>
              <dd className="font-medium">{session.startTime.slice(0, 5)} 〜 {session.endTime.slice(0, 5)}</dd>
              <dt className="text-muted-foreground">コーチ</dt>
              <dd className="font-medium">{session.coachName ?? "-"}</dd>
              <dt className="text-muted-foreground">ステータス</dt>
              <dd>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </dd>
              <dt className="text-muted-foreground">予約日時</dt>
              <dd className="text-muted-foreground text-xs">
                {new Date(session.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
              </dd>
            </dl>
          </div>

          {/* Google Meet リンク */}
          {session.googleMeetUrl ? (
            <a
              href={session.googleMeetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <Video className="size-5 text-blue-600 shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium">Google Meet で参加</span>
                <span className="text-xs text-muted-foreground truncate">
                  {session.googleMeetUrl}
                </span>
              </div>
              <ExternalLink className="size-4 text-muted-foreground shrink-0 ml-auto" />
            </a>
          ) : (
            <div className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              <Video className="size-5 shrink-0 opacity-40" />
              <span>ビデオ会議リンクはありません</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SessionHistory({ sessions, onCancelled }: SessionHistoryProps) {
  const [detailSession, setDetailSession] = useState<SessionItem | null>(null)

  if (sessions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        予約履歴はありません
      </p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日付</TableHead>
            <TableHead>時間</TableHead>
            <TableHead>ジャンル</TableHead>
            <TableHead>コーチ</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => {
            const statusInfo = STATUS_LABELS[session.status] ?? { label: session.status, variant: "default" as const }
            const isFuture = new Date(`${session.sessionDate}T${session.startTime}`) > new Date()
            const canCancel = session.status === "scheduled" && isFuture

            return (
              <TableRow
                key={session.id}
                className="cursor-pointer"
                onClick={() => setDetailSession(session)}
              >
                <TableCell className="text-[13px]">
                  {formatDateLabel(session.sessionDate)}
                </TableCell>
                <TableCell className="text-[13px]">
                  {session.startTime.slice(0, 5)} 〜 {session.endTime.slice(0, 5)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[11px]">
                    {GENRE_LABELS[session.genre ?? "engineering"] ?? session.genre}
                  </Badge>
                </TableCell>
                <TableCell className="text-[13px]">
                  {session.coachName ?? "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canCancel && (
                    <CancelButton session={session} onCancelled={onCancelled} />
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* 詳細モーダル */}
      <SessionDetailDialog
        session={detailSession ?? sessions[0]}
        open={detailSession !== null}
        onOpenChange={(open) => {
          if (!open) setDetailSession(null)
        }}
      />
    </>
  )
}
