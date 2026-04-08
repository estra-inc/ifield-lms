"use client"

import { useState, useTransition } from "react"
import { Loader2, Info } from "lucide-react"
import { toast } from "sonner"

import { updateUserGenre } from "../../actions"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const GENRE_LABELS: Record<string, string> = {
  engineering: "エンジニアリング",
  design: "デザイン",
}

interface GenreSectionProps {
  userId: string
  defaultGenre: string | null
  /** 受講生に割り当て済みのコーチ（ジャンル別） */
  coachAssignments: { genre: string }[]
}

/**
 * 受講生詳細ページのジャンル表示・編集セクション。
 *
 * Super Admin が受講生の default_genre を変更できる。
 * 受講生本人が教材ページの「デフォルト」設定で書き込む値と同じカラムを更新する。
 */
export function GenreSection({
  userId,
  defaultGenre,
  coachAssignments,
}: GenreSectionProps) {
  const [genre, setGenre] = useState<string | null>(defaultGenre)
  const [isPending, startTransition] = useTransition()

  const handleChange = (next: string) => {
    if (next === genre) return
    const previous = genre
    setGenre(next)
    startTransition(async () => {
      const formData = new FormData()
      formData.set("userId", userId)
      formData.set("genre", next)
      const result = await updateUserGenre(null, formData)
      if (result?.success) {
        toast.success(result.message)
      } else {
        toast.error(result?.message ?? "ジャンルの更新に失敗しました。")
        setGenre(previous)
      }
    })
  }

  // 現在ジャンルにコーチが割り当てられているかチェック
  const showCoachWarning =
    !!genre && !coachAssignments.some((a) => a.genre === genre)

  return (
    <>
      <Separator />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            ジャンル
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="ジャンルについての説明"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[260px]">
                受講生が教材ページで「デフォルト」として設定するのと同じ値です。変更すると次回受講生がアクセスしたときに表示ジャンルが切り替わります。
              </TooltipContent>
            </Tooltip>
          </span>
          {isPending && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <Select
          value={genre ?? undefined}
          onValueChange={handleChange}
          disabled={isPending}
        >
          <SelectTrigger className="h-9 w-full text-[13px]">
            <SelectValue placeholder="未設定" />
          </SelectTrigger>
          <SelectContent position="popper" align="start" sideOffset={4}>
            <SelectItem value="engineering">{GENRE_LABELS.engineering}</SelectItem>
            <SelectItem value="design">{GENRE_LABELS.design}</SelectItem>
          </SelectContent>
        </Select>
        {showCoachWarning && (
          <p className="text-[11px] leading-relaxed text-amber-600">
            ⚠️ この受講生には{GENRE_LABELS[genre!]}担当コーチが割り当てられていません。コーチ割り当てを確認してください。
          </p>
        )}
      </div>
    </>
  )
}
