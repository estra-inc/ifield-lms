"use client"

import Link from "next/link"
import { LogOut, User } from "lucide-react"

import type { AppShellUser } from "@/lib/types/app-shell"
import { useSidebar } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface SidebarUserProps {
  user: AppShellUser
  onLogout: () => void
}

function getUserInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function getRoleLabel(role: AppShellUser["role"]): string {
  switch (role) {
    case "user":
      return "受講生"
    case "manager":
      return "マネージャー"
    case "super_admin":
      return "スーパー管理者"
  }
}

export function SidebarFooterMenu({ user, onLogout }: SidebarUserProps) {
  const { isMobile, state } = useSidebar()
  const isCollapsed = !isMobile && state === "collapsed"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center text-left text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            isCollapsed ? "justify-center py-3" : "gap-3 px-4 py-3"
          )}
          data-testid="sidebar-footer-trigger"
        >
          <Avatar className={cn("shrink-0", isCollapsed ? "size-7" : "size-9")}>
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.fullName} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {getUserInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[13px] font-medium text-sidebar-foreground">
                {user.fullName}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-sidebar-muted">
                {getRoleLabel(user.role)}
                {user.role === "user" && user.currentTerm && (
                  <span className="bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-medium text-sidebar-primary-foreground">
                    {user.currentTerm}
                  </span>
                )}
              </span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="end"
        className="w-56"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5 p-2">
          <span className="text-[13px] font-medium">{user.fullName}</span>
          <span className="text-[11px] font-normal text-muted-foreground">
            {getRoleLabel(user.role)}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <User className="mr-2 size-4" />
              <span>プロフィール</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
            <LogOut className="mr-2 size-4" />
            <span>ログアウト</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
