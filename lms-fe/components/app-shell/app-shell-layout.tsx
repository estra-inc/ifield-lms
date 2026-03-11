"use client"

import { usePathname } from "next/navigation"

import type { AppShellUser } from "@/lib/types/app-shell"
import { resolvePageTitle } from "@/config/navigation"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-shell/app-sidebar"
import { AppHeader } from "@/components/app-shell/app-header"

export interface AppShellLayoutProps {
  user: AppShellUser
  defaultOpen?: boolean
  children: React.ReactNode
}

export function AppShellLayout({
  user,
  defaultOpen = true,
  children,
}: AppShellLayoutProps) {
  const pathname = usePathname()
  const pageTitle = resolvePageTitle(user.role, pathname)

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "15rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar user={user} />
      <SidebarInset className="h-svh overflow-hidden">
        <AppHeader pageTitle={pageTitle} userRole={user.role} />
        <main className="min-w-0 flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
