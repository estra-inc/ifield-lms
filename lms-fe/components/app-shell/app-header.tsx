"use client"

import { CircleHelp } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SearchTrigger } from "@/components/search/search-trigger"
import type { UserRole } from "@/lib/types/app-shell"

const MANUAL_URLS: Record<UserRole, string> = {
  user: "https://estra-inc.notion.site/LMS-329588be215b807aaa1bce5cfb10799a",
  manager: "https://estra-inc.notion.site/LMS-329588be215b807aaa1bce5cfb10799a",
  super_admin: "https://estra-inc.notion.site/LMS-329588be215b80d982b3e66f4d47e610?pvs=74",
}

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

      {/* 右: 操作マニュアルリンク */}
      {userRole && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" asChild>
              <a href={MANUAL_URLS[userRole]} target="_blank" rel="noopener noreferrer">
                <CircleHelp className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">ヘルプ</span>
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>操作マニュアルを開く</TooltipContent>
        </Tooltip>
      )}
    </header>
  )
}
