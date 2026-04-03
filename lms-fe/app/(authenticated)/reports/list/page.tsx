import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { UserReportList, groupReportsByDate } from "../_components/user-report-list"
import { LoadMoreButton } from "../_components/load-more-button"
import { Button } from "@/components/ui/button"
import type { DailyReportEntry } from "@/lib/types/daily-reports"

const PER_PAGE = 20

interface PageProps {
  searchParams: Promise<{
    cursor?: string
  }>
}

export default async function ReportListPage({ searchParams }: PageProps) {
  const params = await searchParams

  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // cursor-based ページネーション: created_at ベース
  const cursor = params.cursor

  let query = supabase
    .from("daily_reports")
    .select("id, report_date, actual_hours, content, liked_by_manager, created_at")
    .order("created_at", { ascending: false })
    .limit(PER_PAGE)

  if (cursor) {
    query = query.lt("created_at", cursor)
  }

  const { data: rows, error } = await query

  if (error) {
    console.error("fetchUserReports error:", error.message)
  }

  // snake_case → camelCase 変換
  const entries: DailyReportEntry[] = (rows ?? []).map((row) => ({
    id: row.id,
    reportDate: row.report_date,
    actualHours: row.actual_hours,
    content: row.content,
    likedByManager: row.liked_by_manager,
    createdAt: row.created_at,
  }))

  // 日付ごとにグループ化
  const groups = groupReportsByDate(entries)

  // 次の cursor を計算
  const hasNextPage = (rows ?? []).length === PER_PAGE
  const nextCursor = hasNextPage && rows && rows.length > 0
    ? rows[rows.length - 1].created_at
    : null

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">日報一覧</h1>
          <p className="text-sm text-muted-foreground">
            これまでの学習記録を振り返りましょう
          </p>
        </div>
        <Button asChild>
          <Link href="/reports">
            <Plus className="size-4" />
            新しい日報
          </Link>
        </Button>
      </div>

      {/* 日報一覧 */}
      <UserReportList groups={groups} nextCursor={nextCursor} />

      {/* もっと見るボタン */}
      {nextCursor && (
        <LoadMoreButton nextCursor={nextCursor} basePath="/reports/list" />
      )}
    </div>
  )
}
