import { redirect } from "next/navigation"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import { createAdminClient } from "@/lib/supabase/admin"
import type { UserListItem } from "@/lib/types/user-management"
import { UserFilters } from "./_components/user-filters"
import { UserTable } from "./_components/user-table"
import { UserPagination } from "./_components/user-pagination"
import { InviteDialog } from "./_components/invite-dialog"

const PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    search?: string
    role?: string
    page?: string
  }>
}

export default async function UsersPage({ searchParams }: PageProps) {
  const params = await searchParams

  // --- 認証・権限チェック ---
  const { user, supabase } = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  // --- フィルタ・ページネーション ---
  const search = params.search ?? ""
  const role = params.role ?? ""
  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  // --- データフェッチ ---
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, current_term, created_at", {
      count: "exact",
    })

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

  if (role && (role === "user" || role === "manager" || role === "super_admin")) {
    query = query.eq("role", role)
  }

  query = query.order("created_at", { ascending: false })

  const { data: rows, error, count } = await query.range(from, to)

  if (error) {
    console.error("fetchUsers error:", error.message)
  }

  // --- ban状態の一括取得 ---
  const adminClient = createAdminClient()
  const { data: authUsers } = await adminClient.auth.admin.listUsers()
  const bannedMap = new Map<string, boolean>()
  if (authUsers?.users) {
    for (const au of authUsers.users) {
      const bannedUntil = au.banned_until ?? null
      bannedMap.set(au.id, !!bannedUntil && new Date(bannedUntil) > new Date())
    }
  }

  const users: UserListItem[] = (rows ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role,
    currentTerm: row.current_term,
    createdAt: row.created_at,
    isBanned: bannedMap.get(row.id) ?? false,
  }))

  const totalCount = count ?? 0

  // --- 有効ユーザーのロール別カウント ---
  const activeUserIds = new Set<string>()
  if (authUsers?.users) {
    for (const au of authUsers.users) {
      if (!bannedMap.get(au.id)) {
        activeUserIds.add(au.id)
      }
    }
  }

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, role")

  let learnerCount = 0
  let managerCount = 0
  let superAdminCount = 0
  for (const p of allProfiles ?? []) {
    if (!activeUserIds.has(p.id)) continue
    if (p.role === "user") learnerCount++
    else if (p.role === "manager") managerCount++
    else if (p.role === "super_admin") superAdminCount++
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            ユーザー管理
          </h1>
          <p className="text-sm text-muted-foreground">
            ユーザーの招待、ロール変更、アカウント管理を行います
          </p>
        </div>
        <InviteDialog />
      </div>

      {/* ロール別カウント */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="font-mono text-xs text-muted-foreground">受講生</p>
          <p className="text-2xl font-bold">{learnerCount}<span className="ml-1 text-sm font-normal text-muted-foreground">人</span></p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="font-mono text-xs text-muted-foreground">マネージャー</p>
          <p className="text-2xl font-bold">{managerCount}<span className="ml-1 text-sm font-normal text-muted-foreground">人</span></p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="font-mono text-xs text-muted-foreground">スーパー管理者</p>
          <p className="text-2xl font-bold">{superAdminCount}<span className="ml-1 text-sm font-normal text-muted-foreground">人</span></p>
        </div>
      </div>

      {/* フィルタ + テーブル */}
      <div className="flex flex-col gap-6">
        <UserFilters />

        <UserTable
          users={users}
          totalCount={totalCount}
          page={page}
          perPage={PER_PAGE}
          paginationSlot={
            <UserPagination
              totalCount={totalCount}
              page={page}
              perPage={PER_PAGE}
            />
          }
        />
      </div>
    </div>
  )
}
