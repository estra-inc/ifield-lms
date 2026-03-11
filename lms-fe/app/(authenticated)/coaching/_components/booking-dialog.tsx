"use client"

import { useTransition } from "react"
import { Loader2, CalendarCheck } from "lucide-react"
import { toast } from "sonner"

import { bookSession } from "../actions"
import type { CoachingGenre, CoachAssignmentStatus } from "@/lib/types/database"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const GENRE_LABELS: Record<CoachingGenre, string> = {
  engineering: "エンジニアリング",
  design: "デザイン",
}

interface BookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slot: {
    date: string
    startTime: string
    endTime: string
  } | null
  balance: number
  genre: CoachingGenre
  coachAssignment: CoachAssignmentStatus
  onBooked: (googleMeetUrl: string | null, coachName?: string | null) => void
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"]
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = weekdays[date.getDay()]
  return `${m}月${d}日（${w}）`
}

export function BookingDialog({
  open,
  onOpenChange,
  slot,
  balance,
  genre,
  coachAssignment,
  onBooked,
}: BookingDialogProps) {
  const [isPending, startTransition] = useTransition()

  if (!slot) return null

  const handleBook = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("date", slot.date)
      formData.append("startTime", slot.startTime)
      formData.append("endTime", slot.endTime)
      formData.append("genre", genre)

      const result = await bookSession(null, formData)

      if (result?.success) {
        const coachInfo = result.coachName ? `（担当: ${result.coachName}）` : ""
        toast.success(`${result.message}${coachInfo}`)
        onOpenChange(false)
        onBooked(result.googleMeetUrl ?? null, result.coachName ?? null)
      } else {
        toast.error(result?.message ?? "予約に失敗しました。")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="size-5" />
            コーチング予約確認
          </DialogTitle>
          <DialogDescription>
            以下の枠で予約してよろしいですか？
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ジャンル</span>
            <span className="font-medium">{GENRE_LABELS[genre]}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">日付</span>
            <span className="font-medium">{formatDateLabel(slot.date)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">時間</span>
            <span className="font-medium">
              {slot.startTime} 〜 {slot.endTime}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">担当コーチ</span>
            <span className="font-medium">
              {coachAssignment.type === "assigned"
                ? coachAssignment.coach.coachName
                : "自動的に割り当てられます"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">消費枠数</span>
            <span className="font-medium text-red-600">-1 回</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">予約後の残り枠数</span>
            <span className="font-medium">{balance - 1} 回</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button onClick={handleBook} disabled={isPending || balance < 1}>
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            予約する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
