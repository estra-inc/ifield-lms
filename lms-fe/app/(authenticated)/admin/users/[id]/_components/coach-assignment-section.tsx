"use client"

import { useState, useTransition } from "react"
import { Check, ChevronsUpDown, Loader2, UserPlus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { assignCoach } from "../../actions"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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

const GENRE_LABELS: Record<string, string> = {
  engineering: "エンジニアリング",
  design: "デザイン",
}

export interface CoachOption {
  id: string
  fullName: string
  genre: string
}

export interface CoachAssignmentItem {
  genre: string
  coachId: string
  coachName: string
}

interface CoachAssignmentSectionProps {
  userId: string
  assignments: CoachAssignmentItem[]
  coaches: CoachOption[]
  readOnly?: boolean
}

function CoachCombobox({
  coaches,
  value,
  onSelect,
  disabled,
}: {
  coaches: CoachOption[]
  value: string | null
  onSelect: (coach: CoachOption) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = coaches.find((c) => c.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-[13px] h-9"
          disabled={disabled}
        >
          {selected ? selected.fullName : "コーチを選択..."}
          <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="名前で検索..." />
          <CommandList>
            <CommandEmpty>該当するコーチが見つかりません</CommandEmpty>
            <CommandGroup>
              {coaches.map((coach) => (
                <CommandItem
                  key={coach.id}
                  value={coach.fullName}
                  onSelect={() => {
                    onSelect(coach)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={`mr-2 size-4 ${
                      value === coach.id ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  {coach.fullName}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function GenreAssignRow({
  userId,
  genre,
  currentAssignment,
  coaches,
}: {
  userId: string
  genre: string
  currentAssignment: CoachAssignmentItem | undefined
  coaches: CoachOption[]
}) {
  const [selectedCoach, setSelectedCoach] = useState<CoachOption | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const genreCoaches = coaches.filter((c) => c.genre === genre)
  const isChange = !!currentAssignment

  const handleSelect = (coach: CoachOption) => {
    // 同一コーチを選択した場合は何もしない
    if (currentAssignment?.coachId === coach.id) {
      return
    }
    setSelectedCoach(coach)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    if (!selectedCoach) return

    startTransition(async () => {
      const formData = new FormData()
      formData.append("userId", userId)
      formData.append("genre", genre)
      formData.append("coachId", selectedCoach.id)

      const result = await assignCoach(null, formData)

      if (result?.success) {
        toast.success(result.message)
        setConfirmOpen(false)
        setSelectedCoach(null)
      } else {
        toast.error(result?.message ?? "コーチの割り当てに失敗しました。")
        setConfirmOpen(false)
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted-foreground">
          担当コーチ（{GENRE_LABELS[genre] ?? genre}）
        </span>
        {currentAssignment && (
          <span className="text-[13px] font-medium">{currentAssignment.coachName}</span>
        )}
        {!currentAssignment && (
          <span className="text-[13px] text-muted-foreground">未割り当て</span>
        )}
      </div>

      {genreCoaches.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <CoachCombobox
              coaches={genreCoaches}
              value={currentAssignment?.coachId ?? null}
              onSelect={handleSelect}
              disabled={isPending}
            />
          </div>
        </div>
      )}

      {genreCoaches.length === 0 && (
        <p className="text-xs text-muted-foreground">
          このジャンルを担当するコーチが登録されていません
        </p>
      )}

      {/* 確認モーダル */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isChange ? "担当コーチを変更しますか？" : "担当コーチを割り当てますか？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isChange ? (
                <>
                  {GENRE_LABELS[genre]}の担当コーチを{" "}
                  <span className="font-medium text-foreground">{currentAssignment?.coachName}</span>
                  {" → "}
                  <span className="font-medium text-foreground">{selectedCoach?.fullName}</span>
                  {" "}に変更します。
                </>
              ) : (
                <>
                  {GENRE_LABELS[genre]}の担当コーチとして{" "}
                  <span className="font-medium text-foreground">{selectedCoach?.fullName}</span>
                  {" "}を割り当てます。
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={(e) => { e.preventDefault(); handleConfirm() }}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isChange ? (
                <><RefreshCw className="mr-1 size-4" />変更する</>
              ) : (
                <><UserPlus className="mr-1 size-4" />割り当てる</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export function CoachAssignmentSection({
  userId,
  assignments,
  coaches,
  readOnly = false,
}: CoachAssignmentSectionProps) {
  const genres = ["engineering", "design"]

  if (readOnly) {
    return (
      <>
        <Separator />
        {genres.map((genre) => {
          const current = assignments.find((a) => a.genre === genre)
          return (
            <div key={genre} className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">
                担当コーチ（{GENRE_LABELS[genre] ?? genre}）
              </span>
              <span className="text-[13px] font-medium">
                {current?.coachName ?? "未割り当て"}
              </span>
            </div>
          )
        })}
      </>
    )
  }

  return (
    <>
      <Separator />
      {genres.map((genre) => {
        const current = assignments.find((a) => a.genre === genre)
        return (
          <GenreAssignRow
            key={genre}
            userId={userId}
            genre={genre}
            currentAssignment={current}
            coaches={coaches}
          />
        )
      })}
    </>
  )
}
