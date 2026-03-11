"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { SearchCommandDialog } from "@/components/search/search-command-dialog"
import type { UserRole } from "@/lib/types/app-shell"

/**
 * SearchTrigger コンポーネント
 *
 * ヘッダーに配置する検索バー型トリガー。クリックまたは
 * Cmd+K / Ctrl+K でSearchCommandDialogを開く。
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

interface SearchTriggerProps {
  userRole: UserRole
}

export function SearchTrigger({ userRole }: SearchTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMac, setIsMac] = useState(false)

  // OS判定 + グローバルキーボードショートカット登録 (Req 2.4)
  useEffect(() => {
    // User ロール以外はショートカットを登録しない
    if (userRole !== "user") return

    setIsMac(navigator.platform.toUpperCase().includes("MAC"))

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [userRole])

  // User ロールのみ表示
  if (userRole !== "user") {
    return null
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-[600px] items-center gap-2 rounded-lg bg-muted px-3 h-9 transition-colors hover:bg-muted/80"
      >
        <Search className="size-4 text-muted-foreground" />
        <span className="flex-1 text-left font-mono text-[13px] text-muted-foreground">
          教材を検索...
        </span>
        <kbd className="pointer-events-none hidden select-none items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground sm:flex">
          {isMac ? "⌘" : "Ctrl+"}K
        </kbd>
      </button>

      <SearchCommandDialog open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
