import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { ChevronRight } from "lucide-react"

/**
 * SubmissionHistory Server Component
 *
 * 提出履歴タブ（ページネーション付き）。
 * 過去の全提出を5件ごとのページネーション付きリストで表示する。
 *
 * Task 9.1
 * Requirements: 7.1, 7.2, 7.3
 */

const PAGE_SIZE = 5

type SubmissionStatus = "submitted" | "grading" | "graded" | "rejected"

/**
 * ステータスの日本語ラベルマッピング
 */
const STATUS_LABELS: Record<SubmissionStatus, string> = {
  submitted: "提出済み",
  grading: "採点中",
  graded: "採点完了",
  rejected: "差し戻し",
}

/**
 * ステータスのバッジバリアントマッピング
 */
function getStatusBadgeVariant(
  status: SubmissionStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "submitted":
      return "outline"
    case "grading":
      return "secondary"
    case "graded":
      return "default"
    case "rejected":
      return "destructive"
    default:
      return "outline"
  }
}

/**
 * 日本語ロケールで日時をフォーマットする
 */
function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

interface SubmissionHistoryProps {
  assignmentId: string
  currentPage: number
  slug: string
}

export async function SubmissionHistory({
  assignmentId,
  currentPage,
  slug,
}: SubmissionHistoryProps) {
  const supabase = await createClient()

  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: submissions, count, error } = await supabase
    .from("project_submissions")
    .select("id, assignment_id, github_url, status, score, result_data, created_at, updated_at", {
      count: "exact",
    })
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false })
    .range(from, to)

  // エラーまたはデータなしの場合は空状態を表示
  if (error || !submissions || submissions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="font-mono text-sm text-muted-foreground">
          まだ提出がありません
        </p>
      </div>
    )
  }

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* 提出リスト */}
      <div className="space-y-3">
        {submissions.map((submission) => (
          <Link
            key={submission.id}
            href={`/projects/${slug}/submissions/${submission.id}`}
            className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <span className="font-mono text-sm text-primary truncate">
                  {submission.github_url}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(submission.created_at)}
                  </span>
                  {submission.score != null && (
                    <span className="font-mono text-xs font-medium">
                      {submission.score}点
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={getStatusBadgeVariant(submission.status as SubmissionStatus)}
                  className="text-[10px]"
                >
                  {STATUS_LABELS[submission.status as SubmissionStatus] ?? submission.status}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1">
          {/* 前のページ */}
          {currentPage > 1 && (
            <Link
              href={`/projects/${slug}?tab=history&page=${currentPage - 1}`}
              className="rounded border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              前へ
            </Link>
          )}

          {/* ページ番号 */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Link
              key={page}
              href={`/projects/${slug}?tab=history&page=${page}`}
              className={`rounded border px-3 py-1.5 font-mono text-xs transition-colors ${
                page === currentPage
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {page}
            </Link>
          ))}

          {/* 次のページ */}
          {currentPage < totalPages && (
            <Link
              href={`/projects/${slug}?tab=history&page=${currentPage + 1}`}
              className="rounded border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              次へ
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
