import { redirect } from "next/navigation"
import Link from "next/link"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChevronLeftIcon, ChevronRightIcon, HistoryIcon } from "lucide-react"

/**
 * バージョン管理ダッシュボードページ（Server Component）
 *
 * 現在の active バージョン情報と未承認の draft バージョン情報を表示する。
 * バージョン履歴一覧テーブルを含む。
 * Super Admin のみアクセス可能。
 *
 * Requirements: 8.1, 8.2, 4.3
 */

const PER_PAGE = 10

/** ステータスバッジの設定 */
const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; className: string; variant?: "outline" }
> = {
  draft: {
    label: "draft",
    className: "bg-yellow-500 text-white hover:bg-yellow-500",
  },
  active: {
    label: "active",
    className: "bg-green-600 text-white hover:bg-green-600",
  },
  archived: {
    label: "archived",
    className: "",
    variant: "outline",
  },
}

/** 変更サマリーを表示用文字列に変換 */
function formatChangesSummary(
  summary: { added: number; updated: number; deleted: number } | null
): string {
  if (!summary) return "\u2014"
  const parts: string[] = []
  if (summary.added > 0) parts.push(`+${summary.added}`)
  if (summary.updated > 0) parts.push(`~${summary.updated}`)
  if (summary.deleted > 0) parts.push(`-${summary.deleted}`)
  return parts.length > 0 ? parts.join(" ") : "\u2014"
}

interface PageProps {
  searchParams: Promise<{
    page?: string
  }>
}

export default async function ContentVersionsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  const { user, supabase } = await getAuthUser()

  // --- 認証チェック ---
  if (!user) {
    redirect("/auth/login")
  }

  // --- Super Admin 権限チェック ---
  const profile = await getUserProfile(user.id)

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  // --- データフェッチ ---
  // active バージョンを取得
  const { data: activeVersion } = await supabase
    .from("content_versions")
    .select("id, commit_hash, commit_message, status, synced_at, changes_summary, approved_by, approved_at")
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  // draft バージョンを取得
  const { data: draftVersion } = await supabase
    .from("content_versions")
    .select("id, commit_hash, commit_message, status, synced_at, changes_summary, changed_paths, quiz_changes_summary, mock_project_changes_summary")
    .eq("status", "draft")
    .limit(1)
    .maybeSingle()

  // changes_summary の型安全な取得
  type ChangesSummary = { added: number; updated: number; deleted: number }
  const draftSummary = draftVersion?.changes_summary as ChangesSummary | null
  const draftQuizSummary = draftVersion?.quiz_changes_summary as ChangesSummary | null
  const draftMockProjectSummary = draftVersion?.mock_project_changes_summary as ChangesSummary | null

  // --- バージョン履歴一覧の取得 ---
  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PER_PAGE
  const to = from + PER_PAGE - 1

  const { data: historyVersions, count: historyCount } = await supabase
    .from("content_versions")
    .select(
      "id, commit_hash, commit_message, status, synced_at, changes_summary, approved_by, approved_at, created_at, profiles:approved_by(full_name)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to)

  const totalCount = historyCount ?? 0
  const totalPages = Math.ceil(totalCount / PER_PAGE)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-primary)] text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          バージョン管理
        </h1>
        <p className="font-[family-name:var(--font-primary)] text-sm text-muted-foreground">
          コンテンツバージョンの確認と承認を行います
        </p>
      </div>

      {/* バージョンカードグリッド */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Active バージョンカード */}
        <Card className="border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <CardTitle className="font-[family-name:var(--font-primary)] text-base">
                公開中バージョン
              </CardTitle>
              <Badge className="bg-green-600 text-white hover:bg-green-600">
                active
              </Badge>
            </div>
            <CardDescription className="font-[family-name:var(--font-primary)]">
              現在受講生に公開されているバージョン
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeVersion ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground uppercase tracking-wider">
                    コミットハッシュ
                  </span>
                  <code className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                    {activeVersion.commit_hash.slice(0, 7)}
                  </code>
                </div>
                {activeVersion.commit_message && (
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground uppercase tracking-wider shrink-0">
                      コミットメッセージ
                    </span>
                    <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground truncate">
                      {activeVersion.commit_message}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground uppercase tracking-wider">
                    同期日時
                  </span>
                  <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                    {new Date(activeVersion.synced_at).toLocaleString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="font-[family-name:var(--font-primary)] text-sm text-muted-foreground">
                公開中のバージョンはありません
              </p>
            )}
          </CardContent>
        </Card>

        {/* Draft バージョンカード */}
        <Card className="border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <CardTitle className="font-[family-name:var(--font-primary)] text-base">
                未承認バージョン
              </CardTitle>
              {draftVersion && (
                <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">
                  draft
                </Badge>
              )}
            </div>
            <CardDescription className="font-[family-name:var(--font-primary)]">
              承認待ちの変更内容
            </CardDescription>
          </CardHeader>
          <CardContent>
            {draftVersion ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground uppercase tracking-wider">
                      コミットハッシュ
                    </span>
                    <code className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                      {draftVersion.commit_hash.slice(0, 7)}
                    </code>
                  </div>
                  {draftVersion.commit_message && (
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground uppercase tracking-wider shrink-0">
                        コミットメッセージ
                      </span>
                      <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground truncate">
                        {draftVersion.commit_message}
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between">
                    <span className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground uppercase tracking-wider">
                      同期日時
                    </span>
                    <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                      {new Date(draftVersion.synced_at).toLocaleString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                      })}
                    </span>
                  </div>
                </div>

                {/* ディレクトリ別変更サマリー */}
                {(draftSummary || draftQuizSummary || draftMockProjectSummary) && (
                  <div className="flex flex-col gap-2">
                    {[
                      { label: "教材", summary: draftSummary },
                      { label: "演習問題", summary: draftQuizSummary },
                      { label: "模擬案件", summary: draftMockProjectSummary },
                    ].map(({ label, summary }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground w-16 shrink-0">
                          {label}
                        </span>
                        <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                          {formatChangesSummary(summary)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex gap-3 pt-2">
                  <Button
                    asChild
                    variant="outline"
                    className="font-[family-name:var(--font-primary)]"
                  >
                    <Link href={`/admin/content-versions/${draftVersion.id}`}>
                      変更を確認
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="font-[family-name:var(--font-primary)]"
                  >
                    <Link href={`/admin/content-versions/${draftVersion.id}`}>
                      承認して公開
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="font-[family-name:var(--font-primary)] text-sm text-muted-foreground">
                未承認の変更はありません
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* バージョン履歴セクション */}
      <div className="flex flex-col gap-4">
        <h2 className="font-[family-name:var(--font-primary)] text-lg font-semibold tracking-tight text-foreground">
          バージョン履歴
        </h2>

        {historyVersions && historyVersions.length > 0 ? (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="h-11 bg-muted">
                  <TableHead className="w-[120px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
                    コミットハッシュ
                  </TableHead>
                  <TableHead className="text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
                    コミットメッセージ
                  </TableHead>
                  <TableHead className="w-[100px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
                    ステータス
                  </TableHead>
                  <TableHead className="w-[140px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
                    変更サマリー
                  </TableHead>
                  <TableHead className="w-[180px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
                    同期日時
                  </TableHead>
                  <TableHead className="w-[120px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
                    承認者
                  </TableHead>
                  <TableHead className="w-[40px]">
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyVersions.map((version) => {
                  const summary = version.changes_summary as {
                    added: number
                    updated: number
                    deleted: number
                  } | null
                  const badgeConfig =
                    STATUS_BADGE_CONFIG[version.status] ?? STATUS_BADGE_CONFIG.archived
                  const approverProfile = version.profiles as {
                    full_name: string | null
                  } | null
                  const approverName = approverProfile?.full_name ?? "\u2014"

                  const detailHref = `/admin/content-versions/${version.id}`

                  return (
                    <TableRow key={version.id} className="h-[52px] hover:bg-muted/50 cursor-pointer">
                      <TableCell className="p-0">
                        <Link href={detailHref} className="flex items-center px-4 h-[52px]">
                          <code className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                            {version.commit_hash.slice(0, 7)}
                          </code>
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={detailHref} className="flex items-center px-4 h-[52px]">
                          <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground line-clamp-1">
                            {version.commit_message || "\u2014"}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={detailHref} className="flex items-center px-4 h-[52px]">
                          <Badge
                            variant={badgeConfig.variant ?? "default"}
                            className={badgeConfig.className}
                          >
                            {badgeConfig.label}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={detailHref} className="flex items-center px-4 h-[52px]">
                          <span className="font-[family-name:var(--font-secondary)] text-sm text-muted-foreground">
                            {formatChangesSummary(summary)}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={detailHref} className="flex items-center px-4 h-[52px]">
                          <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                            {new Date(version.synced_at).toLocaleString("ja-JP", {
                              timeZone: "Asia/Tokyo",
                            })}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={detailHref} className="flex items-center px-4 h-[52px]">
                          <span className="font-[family-name:var(--font-primary)] text-sm text-foreground">
                            {approverName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="p-0">
                        <Link href={detailHref} className="flex items-center justify-center px-2 h-[52px]">
                          <ChevronRightIcon className="size-4 text-muted-foreground" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

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
                      <Link
                        href={
                          page - 1 <= 1
                            ? "/admin/content-versions"
                            : `/admin/content-versions?page=${page - 1}`
                        }
                      >
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
                      <Link
                        href={`/admin/content-versions?page=${page + 1}`}
                      >
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
            <HistoryIcon className="size-10 mb-3 opacity-40" />
            <p className="font-[family-name:var(--font-primary)] text-sm">
              バージョン履歴はありません
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
