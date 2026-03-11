"use client"

import { useState, useTransition, useCallback } from "react"
import { Plus, Loader2, Video, ExternalLink, Save, SaveAll } from "lucide-react"
import { toast } from "sonner"

import { grantCoachingCredits, saveSessionNote } from "../../actions"
import { createClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { MarkdownEditor } from "@/components/markdown-editor"

export interface CoachingSessionItem {
  id: string
  sessionDate: string
  startTime: string
  endTime: string
  genre?: string
  status: string
  googleMeetUrl?: string | null
  notes?: string | null
  coachName?: string | null
}

const GENRE_LABELS: Record<string, string> = {
  engineering: "エンジニアリング",
  design: "デザイン",
}

interface CoachingCreditsCardProps {
  userId: string
  balance: number
  sessions: CoachingSessionItem[]
}

const SESSION_STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  scheduled: { label: "予約済み", variant: "default" },
  completed: { label: "完了", variant: "secondary" },
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

/** セッション メモ ドロワー */
function SessionNoteDrawer({
  session,
  open,
  onOpenChange,
  onNoteSaved,
}: {
  session: CoachingSessionItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onNoteSaved: (sessionId: string, notes: string) => void
}) {
  const hasNotes = !!(session.notes && session.notes.trim())
  const [notes, setNotes] = useState(session.notes ?? "")
  const [editorMode, setEditorMode] = useState<"edit" | "preview">(hasNotes ? "preview" : "edit")
  const [isSaving, startSaving] = useTransition()
  const statusInfo = SESSION_STATUS_LABELS[session.status] ?? { label: session.status, variant: "default" as const }

  // セッションが切り替わったらメモとモードをリセット
  const [currentSessionId, setCurrentSessionId] = useState(session.id)
  if (session.id !== currentSessionId) {
    setCurrentSessionId(session.id)
    setNotes(session.notes ?? "")
    const newHasNotes = !!(session.notes && session.notes.trim())
    setEditorMode(newHasNotes ? "preview" : "edit")
  }

  const handleUpload = useCallback(
    async (file: File) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("認証されていません。再度ログインしてください。")
        return null
      }

      const timestamp = Date.now()
      const storagePath = `coaching/${session.id}/${timestamp}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(storagePath, file)

      if (uploadError) {
        toast.error(`アップロードに失敗しました: ${uploadError.message}`)
        return null
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("task-attachments").getPublicUrl(storagePath)

      return publicUrl
    },
    [session.id]
  )

  const handleSave = (closeAfter: boolean) => {
    startSaving(async () => {
      const formData = new FormData()
      formData.append("sessionId", session.id)
      formData.append("notes", notes)

      const result = await saveSessionNote(null, formData)

      if (result?.success) {
        toast.success(result.message)
        onNoteSaved(session.id, notes)
        if (closeAfter) {
          onOpenChange(false)
        }
      } else {
        toast.error(result?.message ?? "メモの保存に失敗しました。")
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>セッション詳細</SheetTitle>
          <SheetDescription>メモの編集・保存ができます</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 shrink-0">
          {/* セッション情報 */}
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
            </dl>
          </div>

          {/* Google Meet リンク */}
          {session.googleMeetUrl && (
            <a
              href={session.googleMeetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border border-border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <Video className="size-5 text-blue-600 shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium">Google Meet</span>
                <span className="text-xs text-muted-foreground truncate">
                  {session.googleMeetUrl}
                </span>
              </div>
              <ExternalLink className="size-4 text-muted-foreground shrink-0 ml-auto" />
            </a>
          )}
        </div>

        {/* メモ（flex-1 で残りの高さを使い、内部でスクロール） */}
        <div className="flex flex-col gap-2 px-4 min-h-0 flex-1">
          <label className="text-sm font-medium shrink-0">メモ</label>
          <MarkdownEditor
            key={currentSessionId}
            value={notes}
            onChange={setNotes}
            placeholder="セッションのメモを入力..."
            disabled={isSaving}
            className="min-h-0 flex-1 flex flex-col [&>:last-child]:overflow-y-auto [&>:last-child]:flex-1"
            onUpload={handleUpload}
            defaultMode={editorMode}
            onModeChange={setEditorMode}
          />
        </div>

        <SheetFooter className={`flex-row justify-end gap-2 border-t pt-4 ${editorMode !== "edit" ? "hidden" : ""}`}>
          <Button
            variant="outline"
            size="sm"
            disabled={isSaving}
            onClick={() => handleSave(false)}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <SaveAll className="size-4" />}
            一時保存
          </Button>
          <Button
            size="sm"
            disabled={isSaving}
            onClick={() => handleSave(true)}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function CoachingCreditsCard({ userId, balance, sessions }: CoachingCreditsCardProps) {
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState("")
  const [currentBalance, setCurrentBalance] = useState(balance)
  const [currentSessions, setCurrentSessions] = useState(sessions)
  const [drawerSession, setDrawerSession] = useState<CoachingSessionItem | null>(null)

  const handleGrant = () => {
    const num = Number(amount)
    if (!num || !Number.isInteger(num)) {
      toast.error("0以外の整数を入力してください。")
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append("userId", userId)
      formData.append("amount", String(num))

      const result = await grantCoachingCredits(null, formData)

      if (result?.success) {
        toast.success(result.message)
        setCurrentBalance((prev) => prev + num)
        setAmount("")
      } else {
        toast.error(result?.message ?? "コーチング枠の付与に失敗しました。")
      }
    })
  }

  const handleNoteSaved = (sessionId: string, notes: string) => {
    setCurrentSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, notes } : s))
    )
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <p className="text-[15px] font-semibold">コーチング枠</p>

      {/* 残高表示 */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-muted-foreground">残り枠数</span>
        <span className="text-2xl font-bold">{currentBalance}</span>
        <span className="text-[13px] text-muted-foreground">回</span>
      </div>

      <Separator />

      {/* 付与・剥奪フォーム */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[13px] text-muted-foreground">枠数</label>
            <Input
              type="number"
              min={-100}
              max={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例: 5 または -3"
              className="mt-1"
              disabled={isPending}
            />
          </div>
          <Button
            onClick={handleGrant}
            disabled={isPending || !amount}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            実行
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          正の値で付与、負の値（例: -3）で剥奪になります。
        </p>
      </div>

      {/* セッション履歴（scheduled / completed のみ） */}
      {currentSessions.length > 0 && (
        <>
          <Separator />
          <p className="text-[13px] text-muted-foreground">直近の履歴</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日付</TableHead>
                <TableHead>時間</TableHead>
                <TableHead>ジャンル</TableHead>
                <TableHead>コーチ</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentSessions.map((session) => {
                const statusInfo = SESSION_STATUS_LABELS[session.status] ?? { label: session.status, variant: "default" as const }
                return (
                  <TableRow
                    key={session.id}
                    className="cursor-pointer"
                    onClick={() => setDrawerSession(session)}
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
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </>
      )}


      {/* メモドロワー */}
      {currentSessions.length > 0 && (
        <SessionNoteDrawer
          session={drawerSession ?? currentSessions[0]}
          open={drawerSession !== null}
          onOpenChange={(open) => {
            if (!open) setDrawerSession(null)
          }}
          onNoteSaved={handleNoteSaved}
        />
      )}
    </Card>
  )
}
