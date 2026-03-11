"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SearchTrigger } from "@/components/search/search-trigger"
import type { UserRole } from "@/lib/types/app-shell"

export interface AppHeaderProps {
  pageTitle: string
  userRole?: UserRole
}

export function AppHeader({ pageTitle, userRole }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-lg font-semibold tracking-tight text-foreground" style={{ letterSpacing: "-1px" }}>
        {pageTitle}
      </h1>

      {/* 中央: 検索トリガー（User ロールのみ） */}
      <div className="flex-1 flex justify-center">
        {userRole && <SearchTrigger userRole={userRole} />}
      </div>

      {/* 右: スペーサー */}
      <div className="w-40" />
    </header>
  )
}
