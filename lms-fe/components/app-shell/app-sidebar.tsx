"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { logout } from "@/app/auth/actions/auth"
import type { AppShellUser } from "@/lib/types/app-shell"
import { getMenuItemsForRole, isMenuItemActive } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SidebarFooterMenu } from "@/components/app-shell/sidebar-footer-menu"

export interface AppSidebarProps {
  user: AppShellUser
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const { state, isMobile } = useSidebar()
  const isCollapsed = !isMobile && state === "collapsed"
  const menuItems = getMenuItemsForRole(user.role)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className={cn(
          "h-16 flex-row items-center gap-0 border-b border-sidebar-border",
          isCollapsed ? "justify-center p-0" : "px-4"
        )}
      >
        {isCollapsed ? (
          <Image
            src="/ifield-logo_min.svg"
            alt="i.field"
            width={28}
            height={28}
            className="size-7"
            priority
            unoptimized
          />
        ) : (
          <Image
            src="/ifield-logo_max_whitetext.png"
            alt="i.field"
            width={140}
            height={33}
            className="h-[33px] w-[140px]"
            priority
          />
        )}
      </SidebarHeader>

      {/* SidebarContent: Role-based menu items */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = isMenuItemActive(item.href, pathname)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className="h-auto gap-3 px-3 py-2.5 text-[13px]"
                    >
                      <Link href={item.href}>
                        <item.icon className="!size-[18px]" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-0">
        <SidebarFooterMenu user={user} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
