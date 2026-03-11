import { redirect } from "next/navigation"
import { Users, UserCheck, UserX } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { UserListItem } from "@/lib/types/user-management"
import { UserFilters } from "@/app/(authenticated)/admin/users/_components/user-filters"
import { UserTable } from "@/app/(authenticated)/admin/users/_components/user-table"
import { UserPagination } from "@/app/(authenticated)/admin/users/_components/user-pagination"

const PER_PAGE = 10

interface PageProps {
  searchParams: Promise<{
    search?: string
    page?: string
  }>
}

export default async function ManagerUsersPage({ searchParams }: PageProps) {
  const params = await searchParams

  // --- 認証・権限チェック ---
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "manager") {
    redirect("/dashboard")
  }

  // --- フィルタ・ページネーション ---
  const search = params.search ?? ""
  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  // --- データフェッチ（Admin クライアントで RLS バイパス） ---
  const adminClient = createAdminClient()

  // サマリー用: 全受講生データ
  const { data: allUsers } = await adminClient
    .from("profiles")
    .select("id, current_term")
    .eq("role", "user")

  const totalUsers = allUsers?.length ?? 0
  const activeUsers = (allUsers ?? []).filter((u) => u.current_term).length
  const inactiveUsers = totalUsers - activeUsers

  // テーブル用: ページネーション付きクエリ
  let query = adminClient
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, current_term, created_at", {
      count: "exact",
    })
    .eq("role", "user")

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

  query = query.order("created_at", { ascending: false })

  const { data: rows, error, count } = await query.range(from, to)

  if (error) {
    console.error("fetchManagerUsers error:", error.message)
  }

  // --- ban状態の一括取得 ---
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

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      {/* ヘッダー */}
      <div>
        <h1 className="font-[family-name:var(--font-primary)] text-2xl font-bold tracking-[-1px]">
          ユーザー一覧
        </h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {profile.full_name ?? "マネージャー"} さんの管理画面
        </p>
      </div>

      {/* サマリーカード行 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="rounded-none border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="font-[family-name:var(--font-primary)] text-xs font-semibold tracking-wide text-muted-foreground">
              受講生数
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <Users className="mb-1 size-5 text-muted-foreground" />
            <span className="font-[family-name:var(--font-primary)] text-[32px] font-bold text-foreground">
              {totalUsers}
            </span>
            <span className="mb-1 font-mono text-sm text-muted-foreground">名</span>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="font-[family-name:var(--font-primary)] text-xs font-semibold tracking-wide text-muted-foreground">
              受講中
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <UserCheck className="mb-1 size-5 text-emerald-500" />
            <span className="font-[family-name:var(--font-primary)] text-[32px] font-bold text-foreground">
              {activeUsers}
            </span>
            <span className="mb-1 font-mono text-sm text-muted-foreground">名</span>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="font-[family-name:var(--font-primary)] text-xs font-semibold tracking-wide text-muted-foreground">
              未開始
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <UserX className="mb-1 size-5 text-muted-foreground/50" />
            <span className="font-[family-name:var(--font-primary)] text-[32px] font-bold text-foreground">
              {inactiveUsers}
            </span>
            <span className="mb-1 font-mono text-sm text-muted-foreground">名</span>
          </CardContent>
        </Card>
      </div>

      {/* フィルタ + テーブル */}
      <UserFilters showRoleFilter={false} />

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
  )
}
