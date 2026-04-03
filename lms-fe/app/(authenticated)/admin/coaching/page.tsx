import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeftIcon, ChevronRightIcon, CalendarCheck, XIcon, SearchIcon } from "lucide-react"
import { SessionTable } from "./_components/session-table"
import { GoogleCalendarConnections, type CalendarConnection } from "./_components/google-calendar-connections"

const PER_PAGE = 15

type FilterKey = "all" | "scheduled" | "completed" | "cancelled"

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全件" },
  { key: "scheduled", label: "未実施" },
  { key: "completed", label: "実施済み" },
  { key: "cancelled", label: "キャンセル済み" },
]

/** YYYY-MM-DD 形式の妥当性チェック */
function isValidDate(v: string | undefined): v is string {
  if (!v) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v))
}

interface PageProps {
  searchParams: Promise<{
    status?: string
    page?: string
    from?: string
    to?: string
    q?: string
  }>
}

export default async function AdminCoachingPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // --- 認証チェック ---
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // --- Super Admin 権限チェック ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  // --- 統計データ取得（RLS バイパス） ---
  const adminClient = createAdminClient()

  // 累計コーチング付与数: admin_grant の SUM(amount)
  const { data: grantData } = await adminClient
    .from("coaching_credits")
    .select("amount")
    .eq("reason", "admin_grant")

  const totalGranted = grantData?.reduce((sum, row) => sum + row.amount, 0) ?? 0

  // 有効コーチング枠数: 全ユーザー合計残高
  const { data: allCredits } = await adminClient
    .from("coaching_credits")
    .select("amount")

  const totalBalance = allCredits?.reduce((sum, row) => sum + row.amount, 0) ?? 0

  // 実施済みコーチング数
  const { count: completedCount } = await adminClient
    .from("coaching_sessions")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")

  // Google Calendar 連携状況
  const { data: calendarConnections } = await adminClient
    .from("google_calendar_connections")
    .select("admin_id, connected_at")

  // 連携済み管理者のプロフィールを取得
  const connectedAdminIds = (calendarConnections ?? []).map((c) => c.admin_id)
  let calendarConnectionList: CalendarConnection[] = []
  if (connectedAdminIds.length > 0) {
    const { data: connectedProfiles } = await adminClient
      .from("profiles")
      .select("id, full_name, default_genre")
      .in("id", connectedAdminIds)
      .eq("role", "super_admin")

    const connMap = new Map(
      (calendarConnections ?? []).map((c) => [c.admin_id, c.connected_at])
    )
    calendarConnectionList = (connectedProfiles ?? []).map((p) => ({
      adminId: p.id,
      fullName: p.full_name ?? "不明",
      genre: p.default_genre ?? "",
      connectedAt: connMap.get(p.id) ?? "",
    }))
  }

  // --- フィルタ ---
  const statusFilter = (params.status ?? "all") as FilterKey
  const dateFrom = isValidDate(params.from) ? params.from : undefined
  const dateTo = isValidDate(params.to) ? params.to : undefined
  const hasDateFilter = dateFrom || dateTo
  const nameQuery = params.q?.trim() || undefined

  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  // --- 氏名検索: マッチする user_id を先に取得 ---
  let matchedUserIds: string[] | undefined
  if (nameQuery) {
    const { data: matchingProfiles } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("full_name", `%${nameQuery}%`)

    matchedUserIds = matchingProfiles?.map((p) => p.id) ?? []
  }

  // --- セッション一覧取得 ---
  let query = adminClient
    .from("coaching_sessions")
    .select(
      "id, user_id, session_date, start_time, end_time, status, created_at, profiles:user_id(full_name)",
      { count: "exact" }
    )
    .order("session_date", { ascending: false })
    .order("start_time", { ascending: false })

  if (statusFilter === "scheduled") {
    query = query.eq("status", "scheduled")
  } else if (statusFilter === "completed") {
    query = query.eq("status", "completed")
  } else if (statusFilter === "cancelled") {
    query = query.in("status", ["cancelled_by_student", "cancelled_by_admin"])
  }

  if (dateFrom) {
    query = query.gte("session_date", dateFrom)
  }
  if (dateTo) {
    query = query.lte("session_date", dateTo)
  }

  if (matchedUserIds !== undefined) {
    if (matchedUserIds.length > 0) {
      query = query.in("user_id", matchedUserIds)
    } else {
      // 該当ユーザーなし → 空結果を返す
      query = query.eq("user_id", "00000000-0000-0000-0000-000000000000")
    }
  }

  const { data: sessions, count: sessionCount } = await query.range(from, to)

  const totalCount = sessionCount ?? 0
  const totalPages = Math.ceil(totalCount / PER_PAGE)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  /** 共通 URL 構築 */
  function buildHref({ status, page: p }: { status?: FilterKey; page?: number } = {}): string {
    const s = status ?? statusFilter
    const qp = new URLSearchParams()
    if (s !== "all") qp.set("status", s)
    if (dateFrom) qp.set("from", dateFrom)
    if (dateTo) qp.set("to", dateTo)
    if (nameQuery) qp.set("q", nameQuery)
    if (p && p > 1) qp.set("page", String(p))
    const qs = qp.toString()
    return `/admin/coaching${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-primary)] text-2xl font-semibold tracking-tight text-foreground">
          コーチング管理
        </h1>
        <p className="font-[family-name:var(--font-primary)] text-sm text-muted-foreground">
          全受講生のコーチングセッションを管理します
        </p>
      </div>

      {/* 統計カードグリッド */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-[family-name:var(--font-primary)] text-sm font-medium text-muted-foreground">
              累計コーチング付与数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-[family-name:var(--font-secondary)] text-3xl font-bold text-foreground tabular-nums">
              {totalGranted}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-[family-name:var(--font-primary)] text-sm font-medium text-muted-foreground">
              有効コーチング枠数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-[family-name:var(--font-secondary)] text-3xl font-bold text-foreground tabular-nums">
              {totalBalance}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-[family-name:var(--font-primary)] text-sm font-medium text-muted-foreground">
              実施済みコーチング数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-[family-name:var(--font-secondary)] text-3xl font-bold text-foreground tabular-nums">
              {completedCount ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Google Calendar 連携状況 */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-[family-name:var(--font-primary)] text-base font-semibold text-foreground">
            Google Calendar 連携状況
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GoogleCalendarConnections connections={calendarConnectionList} />
        </CardContent>
      </Card>

      {/* セッション一覧セクション */}
      <div className="flex flex-col gap-4">
        <h2 className="font-[family-name:var(--font-primary)] text-lg font-semibold tracking-tight text-foreground">
          セッション一覧
        </h2>

        {/* フィルタ行 */}
        <div className="flex flex-col gap-3">
          {/* 1段目: ステータス + 氏名検索 */}
          <div className="flex flex-wrap items-center gap-4">
            {/* ステータスフィルタ */}
            <div className="flex items-center gap-2">
              {FILTER_OPTIONS.map((opt) => (
                <Button
                  key={opt.key}
                  asChild
                  variant={statusFilter === opt.key ? "default" : "outline"}
                  size="sm"
                  className="font-[family-name:var(--font-primary)] h-8 px-3"
                >
                  <Link href={buildHref({ status: opt.key })}>{opt.label}</Link>
                </Button>
              ))}
            </div>

            {/* 氏名検索 */}
            <form method="GET" action="/admin/coaching" className="flex items-center gap-2">
              {statusFilter !== "all" && (
                <input type="hidden" name="status" value={statusFilter} />
              )}
              {dateFrom && <input type="hidden" name="from" value={dateFrom} />}
              {dateTo && <input type="hidden" name="to" value={dateTo} />}
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  name="q"
                  placeholder="受講生名で検索"
                  defaultValue={nameQuery ?? ""}
                  className="font-[family-name:var(--font-primary)] h-8 w-[200px] pl-8 text-sm"
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="font-[family-name:var(--font-primary)] h-8 px-3"
              >
                検索
              </Button>
              {nameQuery && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="font-[family-name:var(--font-primary)] h-8 px-2 text-muted-foreground"
                >
                  <Link href={(() => {
                    const qp = new URLSearchParams()
                    if (statusFilter !== "all") qp.set("status", statusFilter)
                    if (dateFrom) qp.set("from", dateFrom)
                    if (dateTo) qp.set("to", dateTo)
                    const qs = qp.toString()
                    return `/admin/coaching${qs ? `?${qs}` : ""}`
                  })()}>
                    <XIcon className="size-3.5 mr-1" />
                    解除
                  </Link>
                </Button>
              )}
            </form>
          </div>

          {/* 2段目: 日付期間フィルタ */}
          <form method="GET" action="/admin/coaching" className="flex items-end gap-2">
            {statusFilter !== "all" && (
              <input type="hidden" name="status" value={statusFilter} />
            )}
            {nameQuery && <input type="hidden" name="q" value={nameQuery} />}
            <div className="flex flex-col gap-1">
              <label className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground">
                開始日
              </label>
              <Input
                type="date"
                name="from"
                defaultValue={dateFrom ?? ""}
                className="font-[family-name:var(--font-secondary)] h-8 w-[150px] text-sm"
              />
            </div>
            <span className="font-[family-name:var(--font-primary)] text-sm text-muted-foreground pb-1">〜</span>
            <div className="flex flex-col gap-1">
              <label className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground">
                終了日
              </label>
              <Input
                type="date"
                name="to"
                defaultValue={dateTo ?? ""}
                className="font-[family-name:var(--font-secondary)] h-8 w-[150px] text-sm"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="font-[family-name:var(--font-primary)] h-8 px-3"
            >
              絞り込み
            </Button>
            {hasDateFilter && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="font-[family-name:var(--font-primary)] h-8 px-2 text-muted-foreground"
              >
                <Link href={(() => {
                  const qp = new URLSearchParams()
                  if (statusFilter !== "all") qp.set("status", statusFilter)
                  if (nameQuery) qp.set("q", nameQuery)
                  const qs = qp.toString()
                  return `/admin/coaching${qs ? `?${qs}` : ""}`
                })()}>
                  <XIcon className="size-3.5 mr-1" />
                  日付解除
                </Link>
              </Button>
            )}
          </form>
        </div>

        {sessions && sessions.length > 0 ? (
          <div className="rounded-lg border border-border">
            <SessionTable
              sessions={sessions.map((session) => {
                const userProfile = (session as Record<string, unknown>).profiles as { full_name: string | null } | null
                return {
                  id: session.id,
                  user_id: session.user_id,
                  session_date: session.session_date,
                  start_time: session.start_time,
                  end_time: session.end_time,
                  status: session.status,
                  created_at: session.created_at,
                  userName: userProfile?.full_name ?? "—",
                }
              })}
            />

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 h-[52px]">
                <p className="font-[family-name:var(--font-primary)] text-[13px] text-muted-foreground">
                  全 {totalCount} 件中{" "}
                  {from + 1}-{Math.min(page * PER_PAGE, totalCount)} 件を表示
                </p>
                <div className="flex items-center gap-2">
                  {hasPrev ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="font-[family-name:var(--font-primary)] h-8 px-3"
                    >
                      <Link href={buildHref({ page: page - 1 })}>
                        <ChevronLeftIcon className="size-4 mr-1" />
                        前へ
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-[family-name:var(--font-primary)] h-8 px-3"
                      disabled
                    >
                      <ChevronLeftIcon className="size-4 mr-1" />
                      前へ
                    </Button>
                  )}

                  <span className="font-[family-name:var(--font-secondary)] text-sm text-muted-foreground tabular-nums">
                    {page} / {totalPages}
                  </span>

                  {hasNext ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="font-[family-name:var(--font-primary)] h-8 px-3"
                    >
                      <Link href={buildHref({ page: page + 1 })}>
                        次へ
                        <ChevronRightIcon className="size-4 ml-1" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-[family-name:var(--font-primary)] h-8 px-3"
                      disabled
                    >
                      次へ
                      <ChevronRightIcon className="size-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-lg border border-border">
            <CalendarCheck className="size-10 mb-3 opacity-40" />
            <p className="font-[family-name:var(--font-primary)] text-sm">
              コーチングセッションはありません
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
