"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Info, AlertTriangle, UserCheck } from "lucide-react"

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { CreditBadge } from "./credit-badge"
import { WeeklyCalendar } from "./weekly-calendar"
import { BookingDialog } from "./booking-dialog"
import { SessionHistory, type SessionItem } from "./session-history"
import type { CoachingGenre, CoachAssignmentStatus } from "@/lib/types/database"

interface AvailableSlot {
  date: string
  startTime: string
  endTime: string
}

interface CoachingPageClientProps {
  initialBalance: number
  initialSessions: SessionItem[]
  genre: CoachingGenre
  coachAssignment: CoachAssignmentStatus
}

export function CoachingPageClient({
  initialBalance,
  initialSessions,
  genre,
  coachAssignment,
}: CoachingPageClientProps) {
  const router = useRouter()
  const [balance, setBalance] = useState(initialBalance)
  const [sessions, setSessions] = useState(initialSessions)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("booking")

  const handleSlotSelect = useCallback((slot: AvailableSlot) => {
    setSelectedSlot(slot)
    setDialogOpen(true)
  }, [])

  const handleBooked = useCallback((googleMeetUrl: string | null, coachName?: string | null) => {
    if (selectedSlot) {
      setSessions((prev) => [
        {
          id: crypto.randomUUID(),
          sessionDate: selectedSlot.date,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          genre,
          status: "scheduled",
          googleMeetUrl,
          createdAt: new Date().toISOString(),
          coachName: coachName ?? null,
        },
        ...prev,
      ])
    }
    setBalance((prev) => prev - 1)
    setActiveTab("history")
    router.refresh()
  }, [router, selectedSlot, genre])

  const handleCancelled = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, status: "cancelled_by_student" } : s
      )
    )
    setBalance((prev) => prev + 1)
    router.refresh()
  }, [router])

  return (
    <>
      {/* 残高バッジ */}
      <div className="flex items-center gap-3">
        <CreditBadge balance={balance} />
        {balance === 0 && (
          <span className="text-sm text-muted-foreground">
            管理者に枠の付与をお問い合わせください
          </span>
        )}
      </div>

      {/* コーチ情報バナー */}
      {coachAssignment.type === "unassigned" && (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            初回予約では全コーチの空き枠から選択できます。予約時に担当コーチが自動的に割り当てられます。
          </AlertDescription>
        </Alert>
      )}
      {coachAssignment.type === "assigned" && (
        <Alert>
          <UserCheck className="size-4" />
          <AlertDescription>
            担当コーチ: <span className="font-medium">{coachAssignment.coach.coachName}</span>
          </AlertDescription>
        </Alert>
      )}
      {coachAssignment.type === "departed" && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            担当コーチ（{coachAssignment.previousCoachName}）は現在対応していません。次回予約時に新しいコーチが割り当てられます。
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="booking">予約する</TabsTrigger>
          <TabsTrigger value="history">予約履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="booking" className="mt-4">
          <WeeklyCalendar genre={genre} onSlotSelect={handleSlotSelect} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <SessionHistory
            sessions={sessions}
            onCancelled={handleCancelled}
          />
        </TabsContent>
      </Tabs>

      {/* 予約確認ダイアログ */}
      <BookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        slot={selectedSlot}
        balance={balance}
        genre={genre}
        coachAssignment={coachAssignment}
        onBooked={handleBooked}
      />
    </>
  )
}
