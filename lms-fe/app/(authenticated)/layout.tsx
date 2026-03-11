import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppShellLayout } from "@/components/app-shell/app-shell-layout"
import type { AppShellUser, UserRole, UserTerm } from "@/lib/types/app-shell"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url, current_term")
    .eq("id", user.id)
    .single()

  const appUser: AppShellUser = {
    id: user.id,
    fullName: profile?.full_name ?? "",
    role: (profile?.role as UserRole) ?? "user",
    avatarUrl: profile?.avatar_url ?? null,
    currentTerm: (profile?.current_term as UserTerm) ?? null,
  }

  const cookieStore = await cookies()
  const sidebarState = cookieStore.get("sidebar_state")?.value
  const defaultOpen = sidebarState !== "false"

  return (
    <AppShellLayout user={appUser} defaultOpen={defaultOpen}>
      {children}
    </AppShellLayout>
  )
}
