"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ROLE_OPTIONS = [
  { value: "", label: "全て" },
  { value: "user", label: "受講生" },
  { value: "manager", label: "マネージャー" },
  { value: "super_admin", label: "スーパー管理者" },
] as const

const DEBOUNCE_MS = 300

interface UserFiltersProps {
  showRoleFilter?: boolean
}

export function UserFilters({ showRoleFilter = true }: UserFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const currentSearch = searchParams.get("search") ?? ""
  const currentRole = searchParams.get("role") ?? ""

  const [searchValue, setSearchValue] = useState(currentSearch)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // URLパラメータを更新するヘルパー
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
    [router, searchParams, startTransition]
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

  // ロールフィルタの即時更新
  const handleRoleChange = useCallback(
    (value: string) => {
      // Select の "all" 値を空文字に変換
      const role = value === "all" ? "" : value
      updateParams({ role })
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

  // URL のsearchパラメータが外部から変更された場合に同期
  useEffect(() => {
    setSearchValue(currentSearch)
  }, [currentSearch])

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="氏名またはメールアドレスで検索..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {showRoleFilter && (
        <Select
          value={currentRole || "all"}
          onValueChange={handleRoleChange}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ロール" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全て</SelectItem>
            {ROLE_OPTIONS.filter((opt) => opt.value !== "").map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
