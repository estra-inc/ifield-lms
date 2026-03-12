"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Unlink } from "lucide-react"
import { toast } from "sonner"

import { adminDisconnectGoogleCalendar } from "../actions"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

export interface CalendarConnection {
  adminId: string
  fullName: string
  genre: string
  connectedAt: string
}

interface GoogleCalendarConnectionsProps {
  connections: CalendarConnection[]
}

const GENRE_LABELS: Record<string, string> = {
  engineering: "エンジニアリング",
  design: "デザイン",
}

export function GoogleCalendarConnections({ connections }: GoogleCalendarConnectionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [disconnectTarget, setDisconnectTarget] = useState<CalendarConnection | null>(null)

  // ジャンルごとにグルーピング
  const grouped = new Map<string, CalendarConnection[]>()
  for (const conn of connections) {
    const genre = conn.genre || "未設定"
    const list = grouped.get(genre) ?? []
    list.push(conn)
    grouped.set(genre, list)
  }

  const handleDisconnect = () => {
    if (!disconnectTarget) return
    startTransition(async () => {
      const result = await adminDisconnectGoogleCalendar(disconnectTarget.adminId)
      if (result.success) {
        setDisconnectTarget(null)
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  if (connections.length === 0) {
    return (
      <p className="font-[family-name:var(--font-primary)] text-sm text-muted-foreground">
        Google Calendar を連携しているコーチはいません
      </p>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {Array.from(grouped.entries()).map(([genre, conns]) => (
          <div key={genre} className="flex flex-col gap-2">
            <h4 className="font-[family-name:var(--font-primary)] text-sm font-medium text-muted-foreground">
              {GENRE_LABELS[genre] ?? genre}
            </h4>
            <div className="flex flex-col gap-1.5">
              {conns.map((conn) => (
                <div
                  key={conn.adminId}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-[family-name:var(--font-primary)] text-sm text-foreground">
                      {conn.fullName}
                    </span>
                    <Badge variant="secondary" className="text-[11px]">
                      連携中
                    </Badge>
                    <span className="font-[family-name:var(--font-secondary)] text-xs text-muted-foreground">
                      {new Date(conn.connectedAt).toLocaleDateString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                      {" 連携"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-destructive hover:text-destructive font-[family-name:var(--font-primary)]"
                    onClick={() => setDisconnectTarget(conn)}
                  >
                    <Unlink className="size-3.5" />
                    解除
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 解除確認モーダル */}
      <AlertDialog
        open={disconnectTarget !== null}
        onOpenChange={(open) => { if (!open) setDisconnectTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Google Calendar 連携解除</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectTarget?.fullName} の Google Calendar 連携を解除します。
              このコーチの空き枠がコーチング予約画面に表示されなくなります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>戻る</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault()
                handleDisconnect()
              }}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              解除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
