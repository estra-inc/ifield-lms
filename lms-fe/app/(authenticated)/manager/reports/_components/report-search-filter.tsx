"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

const DEBOUNCE_MS = 300

/**
 * 検索フィルタコンポーネント (Client Component)
 *
 * ユーザー名での日報フィルタリング入力。
 * useRouter + useSearchParams で URL クエリパラメータを更新する。
 * 既存の admin/users/_components/user-filters.tsx パターンを踏襲。
 */
export function ReportSearchFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const currentSearch = searchParams.get("search") ?? ""
  const [searchValue, setSearchValue] = useState(currentSearch)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // URL パラメータを更新するヘルパー
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())

      // ページをリセット
      params.delete("page")

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams, startTransition]
  )

  // 検索入力のデバウンス処理
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }

      debounceRef.current = setTimeout(() => {
        updateParams({ search: value })
      }, DEBOUNCE_MS)
    },
    [updateParams]
  )

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // URL の search パラメータが外部から変更された場合に同期
  useEffect(() => {
    setSearchValue(currentSearch)
  }, [currentSearch])

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="ユーザー名で検索..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  )
}
