import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { AdminReportTable } from "./_components/admin-report-table"
import { ReportSearchFilter } from "./_components/report-search-filter"
import { ReportPagination } from "./_components/report-pagination"
import type { AdminReportRow } from "@/lib/types/daily-reports"
import type { UserRole } from "@/lib/types/app-shell"

const PER_PAGE = 20

interface PageProps {
  searchParams: Promise<{
    search?: string
    page?: string
  }>
}

export default async function ManagerReportsPage({ searchParams }: PageProps) {
  const params = await searchParams

  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // ロール検証（Manager / Super Admin のみ）
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "manager" && profile.role !== "super_admin")) {
    redirect("/dashboard")
  }

  // フィルタ・ページネーション
  const search = params.search ?? ""
  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  // Admin クライアント（RLS バイパス: profiles テーブルへのアクセス用）
  const adminSupabase = createAdminClient()

  // ユーザー名検索: 先に profiles から該当ユーザーIDを取得
  let matchedUserIds: string[] | null = null
  if (search) {
    const { data: matchedProfiles } = await adminSupabase
      .from("profiles")
      .select("id")
      .ilike("full_name", `%${search}%`)

    matchedUserIds = (matchedProfiles ?? []).map((p) => p.id)
  }

  // データフェッチ
  let query = supabase
    .from("daily_reports")
    .select(`
      id,
      user_id,
      report_date,
      actual_hours,
      content,
      liked_by_manager,
      created_at
    `, { count: "exact" })
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (matchedUserIds !== null) {
    if (matchedUserIds.length === 0) {
      // 該当ユーザーなし → 空結果を返す
      query = query.in("user_id", ["__no_match__"])
    } else {
      query = query.in("user_id", matchedUserIds)
    }
  }

  const { data: rows, error, count } = await query.range(from, to)

  if (error) {
    console.error("fetchAdminReports error:", error.message)
  }

  // ユーザー名を別途取得（Admin クライアントで RLS バイパス）
  const userIds = [...new Set((rows ?? []).map((r) => r.user_id))]
  const nameMap = new Map<string, string>()

  if (userIds.length > 0) {
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds)

    for (const p of profiles ?? []) {
      nameMap.set(p.id, p.full_name ?? "未設定")
    }
  }

  // snake_case -> camelCase 変換
  const reports: AdminReportRow[] = (rows ?? []).map((row) => {
    return {
      id: row.id,
      userId: row.user_id,
      userName: nameMap.get(row.user_id) ?? "不明",
      avatarUrl: null,
      reportDate: row.report_date,
      actualHours: row.actual_hours,
      content: row.content,
      likedByManager: row.liked_by_manager,
    }
  })

  const totalCount = count ?? 0

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          日報
        </h1>
        <p className="text-sm text-muted-foreground">
          受講生の日報を一覧で確認できます
        </p>
      </div>

      {/* フィルタ + テーブル */}
      <div className="flex flex-col gap-6">
        <ReportSearchFilter />

        <AdminReportTable
          reports={reports}
          totalCount={totalCount}
          currentPage={page}
          pageSize={PER_PAGE}
          currentUserRole={profile.role as UserRole}
          paginationSlot={
            <ReportPagination
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
