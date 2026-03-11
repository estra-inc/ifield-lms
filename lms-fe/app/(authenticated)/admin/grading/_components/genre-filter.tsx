"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

interface GenreFilterProps {
  currentGenre: string
}

const GENRE_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "engineering", label: "エンジニアリング" },
  { value: "design", label: "デザイン" },
] as const

export function GenreFilter({ currentGenre }: GenreFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleGenreChange(genre: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (genre) {
      params.set("genre", genre)
    } else {
      params.delete("genre")
    }
    router.push(`/admin/grading?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">
        ジャンル:
      </span>
      {GENRE_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={currentGenre === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => handleGenreChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
