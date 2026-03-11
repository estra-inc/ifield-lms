"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateDefaultGenre } from "@/app/(authenticated)/contents/actions"

const GENRES = [
  { value: "engineering", label: "エンジニアリング" },
  { value: "design", label: "デザイン" },
] as const

interface GenreSelectProps {
  currentGenre: string
  defaultGenre: string
}

/**
 * ジャンル選択ドロップダウン（Client Component）
 *
 * カスタム DropdownMenu を使用してジャンルを選択する。
 * 選択中のジャンルにはチェックマーク、デフォルトジャンルには「デフォルト」バッジを表示する。
 * 「デフォルト」バッジをクリックすると、そのジャンルをデフォルトに設定する。
 */
export function GenreSelect({ currentGenre, defaultGenre }: GenreSelectProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [localDefault, setLocalDefault] = useState(defaultGenre)

  const currentLabel =
    GENRES.find((g) => g.value === currentGenre)?.label ?? currentGenre

  const handleSelect = (genre: string) => {
    if (genre === currentGenre) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("genre", genre)
    router.push(`/contents?${params.toString()}`)
  }

  const handleSetDefault = async (genre: string) => {
    if (genre === localDefault) return

    setLocalDefault(genre)

    const formData = new FormData()
    formData.set("genre", genre)
    await updateDefaultGenre(null, formData)

    // URL から genre パラメータを除去し、フルリロードで DB のデフォルトが使われるようにする
    router.replace("/contents")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-9 items-center gap-2 rounded-md border border-border bg-transparent px-3 font-[family-name:var(--font-primary)] text-[13px] font-medium text-foreground outline-none hover:bg-muted/50 transition-colors">
          {currentLabel}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[260px] p-1">
        {GENRES.map((genre) => {
          const isSelected = genre.value === currentGenre
          const isDefault = genre.value === localDefault

          return (
            <DropdownMenuItem
              key={genre.value}
              className={`flex items-center justify-between px-3 py-2.5 cursor-pointer ${
                isSelected ? "bg-muted" : ""
              }`}
              onSelect={() => handleSelect(genre.value)}
            >
              <span className="flex items-center gap-2">
                {isSelected ? (
                  <Check className="size-3.5 text-foreground" />
                ) : (
                  <span className="size-3.5" />
                )}
                <span
                  className={`font-[family-name:var(--font-primary)] text-[13px] ${
                    isSelected ? "font-medium" : "font-normal"
                  } text-foreground`}
                >
                  {genre.label}
                </span>
              </span>
              {isDefault ? (
                <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                  デフォルト
                </span>
              ) : (
                <button
                  type="button"
                  className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSetDefault(genre.value)
                  }}
                >
                  デフォルト
                </button>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
