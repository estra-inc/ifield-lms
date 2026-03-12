import { redirect } from "next/navigation"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { ProfileTab } from "./_components/profile-tab"
import type { UserRole } from "@/lib/types/app-shell"
import { AccountTab } from "./_components/account-tab"
import { GoogleCalendarSection } from "./_components/google-calendar-section"
import { BusinessHoursSection } from "./_components/business-hours-section"

/**
 * 設定ページ (Server Component)
 *
 * - 認証確認を行い、未認証時はログインページにリダイレクト
 * - profiles テーブルからユーザー情報をフェッチ
 * - shadcn/ui Tabs で「プロフィール」「アカウント」（+ Super Admin の場合「システム設定」）を表示
 * - フェッチしたデータを各タブコンポーネントに props として渡す
 */
export default async function SettingsPage() {
  // --- 認証チェック ---
  const { user, supabase } = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  // --- プロフィール情報フェッチ ---
  const profile = await getUserProfile(user.id)

  if (!profile) {
    redirect("/auth/login")
  }

  const nameParts = profile.full_name?.split(" ") ?? []
  const resolvedProfile = {
    last_name: nameParts[0] ?? "",
    first_name: nameParts.slice(1).join(" ") ?? "",
    full_name: profile.full_name ?? "",
    avatar_url: profile.avatar_url,
    role: profile.role,
    default_genre: profile.default_genre ?? null,
  }

  const isSuperAdmin = resolvedProfile.role === "super_admin"

  // --- Super Admin の場合、system_integrations データもフェッチ ---
  let systemIntegration = null
  if (isSuperAdmin) {
    const { data } = await supabase
      .from("system_integrations")
      .select("*")
      .eq("service_name", "google_calendar")
      .single()

    systemIntegration = data
  }

  // --- ユーザー情報の構築 ---
  const userProfile = {
    userId: user.id,
    lastName: resolvedProfile.last_name,
    firstName: resolvedProfile.first_name,
    fullName: resolvedProfile.full_name,
    email: user.email ?? "",
    avatarUrl: resolvedProfile.avatar_url,
    role: resolvedProfile.role as UserRole,
    defaultGenre: resolvedProfile.default_genre,
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 md:px-8">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
        <p className="text-sm text-muted-foreground">
          プロフィールやアカウント情報を管理します
        </p>
      </div>

      {/* タブコンテンツ */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="profile">プロフィール</TabsTrigger>
          <TabsTrigger value="account">アカウント</TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="system">システム設定</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab userProfile={userProfile} />
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <AccountTab />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="system" className="mt-6">
            <div className="flex flex-col gap-4 max-w-3xl">
              <GoogleCalendarSection
                isConnected={!!systemIntegration?.connected_at}
                connectedAt={systemIntegration?.connected_at ?? null}
              />
              <BusinessHoursSection
                initialBusinessHours={
                  systemIntegration?.business_hours ?? null
                }
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
