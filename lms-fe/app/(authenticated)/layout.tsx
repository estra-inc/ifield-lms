import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import { AppShellLayout } from "@/components/app-shell/app-shell-layout"
import type { AppShellUser, UserRole, UserTerm } from "@/lib/types/app-shell"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  // getUserProfile は cache() でリクエスト内重複排除される
  const [profile, cookieStore] = await Promise.all([
    getUserProfile(user.id),
    cookies(),
  ])

  const appUser: AppShellUser = {
    id: user.id,
    fullName: profile?.full_name ?? "",
    role: (profile?.role as UserRole) ?? "user",
    avatarUrl: profile?.avatar_url ?? null,
    currentTerm: (profile?.current_term as UserTerm) ?? null,
  }

  const sidebarState = cookieStore.get("sidebar_state")?.value
  const defaultOpen = sidebarState !== "false"

  return (
    <AppShellLayout user={appUser} defaultOpen={defaultOpen}>
      {children}
    </AppShellLayout>
  )
}
