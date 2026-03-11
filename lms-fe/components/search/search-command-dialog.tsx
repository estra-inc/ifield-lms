"use client"

import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command"
import { Skeleton } from "@/components/ui/skeleton"
import { useSearch } from "@/hooks/use-search"
import { SearchResultItem } from "@/components/search/search-result-item"
import type { SearchResult } from "@/lib/types/search"

/**
 * SearchCommandDialog コンポーネント
 *
 * Command Palette 風の検索モーダル。テキスト入力、デバウンス検索、
 * キーボードナビゲーション、結果選択時のページ遷移を統合する。
 *
 * Requirements: 2.3, 2.5, 2.6, 2.7, 2.8, 3.1, 3.5, 3.6, 3.7, 3.8,
 *               4.1-4.7, 5.1, 5.2, 5.3
 */

interface SearchCommandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SearchSkeletons() {
  return (
    <div className="space-y-3 p-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SearchCommandDialog({
  open,
  onOpenChange,
}: SearchCommandDialogProps) {
  const router = useRouter()
  const { query, setQuery, results, isLoading, error } = useSearch()

  const handleSelect = (result: SearchResult) => {
    // セクションページに遷移し、コンテンツ領域までスクロール (Req 5.1, 5.3)
    const url = `/contents/${result.tutorial}/${result.chapter}/${result.section}?genre=${result.genre}#section-content`
    router.push(url)
    onOpenChange(false) // Req 5.2
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // モーダルを閉じるときにクエリをリセット
      setQuery("")
    }
    onOpenChange(nextOpen)
  }

  // 検索状態の判定
  const hasQuery = query.trim().length >= 2
  const showInitial = !hasQuery && !isLoading
  const showLoading = isLoading
  const showResults = !isLoading && hasQuery && results.length > 0
  const showEmpty = !isLoading && hasQuery && results.length === 0 && !error
  const showError = !isLoading && !!error

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="教材検索"
      description="キーワードを入力して教材セクションを検索"
      showCloseButton={false}
      shouldFilter={false}
    >
      <CommandInput
        placeholder="教材を検索..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* shouldFilter={false} 相当: サーバーサイド検索結果を直接表示 */}
        <CommandGroup forceMount>
          {showInitial && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              キーワードを入力して検索
            </p>
          )}

          {showLoading && <SearchSkeletons />}

          {showResults &&
            results.map((result) => (
              <SearchResultItem
                key={result.id}
                result={result}
                onSelect={handleSelect}
              />
            ))}

          {showEmpty && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              検索結果が見つかりませんでした。
              <br />
              別のキーワードで再検索してください。
            </p>
          )}

          {showError && (
            <p className="py-6 text-center text-sm text-destructive">
              {error}
            </p>
          )}
        </CommandGroup>
      </CommandList>

      {/* フッター: キーボード操作ヒント (Req 2.8) */}
      <div className="flex items-center justify-center gap-4 border-t px-3 py-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
            ↑↓
          </kbd>
          ナビゲーション
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
            Enter
          </kbd>
          選択
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">
            Esc
          </kbd>
          閉じる
        </span>
      </div>
    </CommandDialog>
  )
}
