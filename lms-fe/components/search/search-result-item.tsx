"use client"

import { FileText } from "lucide-react"
import { CommandItem } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import type { SearchResult } from "@/lib/types/search"

/**
 * SearchResultItem コンポーネント
 *
 * 検索結果1件を表示する。ファイルアイコン、タイトル、
 * 階層パス（パンくず）、スニペット、スコアバッジを含む。
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

interface SearchResultItemProps {
  result: SearchResult
  onSelect: (result: SearchResult) => void
}

function getScoreBadge(score: number) {
  if (score >= 0.6) {
    return { label: `${score.toFixed(2)}`, className: "bg-green-500/15 text-green-700 border-green-500/25" }
  }
  if (score >= 0.3) {
    return { label: `${score.toFixed(2)}`, className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/25" }
  }
  return { label: `${score.toFixed(2)}`, className: "" }
}

export function SearchResultItem({ result, onSelect }: SearchResultItemProps) {
  const scoreBadge = getScoreBadge(result.score)

  const breadcrumb = [
    result.genreTitle,
    result.tutorialTitle,
    result.chapterTitle,
  ]
    .filter(Boolean)
    .join(" › ")

  return (
    <CommandItem
      value={result.id}
      onSelect={() => onSelect(result)}
      className="flex items-start gap-3 px-3 py-3"
    >
      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{result.title}</span>
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] px-1.5 py-0 ${scoreBadge.className}`}
          >
            {scoreBadge.label}
          </Badge>
        </div>
        {breadcrumb && (
          <span className="truncate text-xs text-muted-foreground">
            {breadcrumb}
          </span>
        )}
        {result.snippet && (
          <p className="line-clamp-2 text-xs text-muted-foreground/70">
            {result.snippet}
          </p>
        )}
      </div>
    </CommandItem>
  )
}
