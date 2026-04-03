import { redirect } from "next/navigation"
import Link from "next/link"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import { createAdminClient } from "@/lib/supabase/admin"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardList, Clock, ExternalLink, FileText, Inbox } from "lucide-react"
import { GenreFilter } from "./_components/genre-filter"

interface PageProps {
  searchParams: Promise<{
    genre?: string
  }>
}

/** 提出物リスト表示用の型 */
interface SubmissionListItem {
  id: string
  studentName: string
  projectTitle: string
  submittedAt: string
  status: "submitted" | "grading"
  genre: string
}

export default async function GradingListPage({ searchParams }: PageProps) {
  const params = await searchParams

  // --- 認証・権限チェック ---
  const { user } = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  // --- データフェッチ ---
  const adminClient = createAdminClient()
  const genre = params.genre ?? ""

  let query = adminClient
    .from("project_submissions")
    .select(
      `
      id,
      submission_url,
      status,
      created_at,
      assignment:project_assignments!inner (
        user:profiles!inner (
          full_name
        ),
        project:mock_projects!inner (
          title,
          genre
        )
      )
    `
    )
    .in("status", ["submitted", "grading"])
    .order("created_at", { ascending: true })

  const { data: rows, error } = await query

  if (error) {
    console.error("fetchPendingSubmissions error:", error.message)
  }

  // ジャンルフィルタ（JOIN 後にアプリ層でフィルタ）
  type SubmissionRow = {
    id: string
    submission_url: string | null
    status: string
    created_at: string
    assignment: {
      user: { full_name: string | null }
      project: { title: string; genre: string }
    }
  }

  const typedRows = (rows ?? []) as unknown as SubmissionRow[]

  const filteredRows =
    genre && (genre === "engineering" || genre === "design")
      ? typedRows.filter((row) => row.assignment.project.genre === genre)
      : typedRows

  const submissions: SubmissionListItem[] = filteredRows.map((row) => ({
    id: row.id,
    studentName: row.assignment.user.full_name ?? "名前未設定",
    projectTitle: row.assignment.project.title,
    submittedAt: row.created_at,
    status: row.status as "submitted" | "grading",
    genre: row.assignment.project.genre,
  }))

  // サマリー集計
  const submittedCount = submissions.filter((s) => s.status === "submitted").length
  const gradingCount = submissions.filter((s) => s.status === "grading").length
  const totalPending = submissions.length

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="font-[family-name:var(--font-primary)] text-xl md:text-2xl font-bold tracking-[-1px]">
          採点管理
        </h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          採点待ちの模擬案件提出物を確認し、採点作業を行います
        </p>
      </div>

      {/* サマリーカード行 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="font-[family-name:var(--font-primary)] text-xs font-semibold tracking-wide text-muted-foreground">
              未採点
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <Inbox className="mb-1 size-5 text-amber-500" />
            <span className="font-[family-name:var(--font-primary)] text-[32px] font-bold text-foreground">
              {submittedCount}
            </span>
            <span className="mb-1 font-mono text-sm text-muted-foreground">件</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="font-[family-name:var(--font-primary)] text-xs font-semibold tracking-wide text-muted-foreground">
              採点中
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <Clock className="mb-1 size-5 text-blue-500" />
            <span className="font-[family-name:var(--font-primary)] text-[32px] font-bold text-foreground">
              {gradingCount}
            </span>
            <span className="mb-1 font-mono text-sm text-muted-foreground">件</span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="font-[family-name:var(--font-primary)] text-xs font-semibold tracking-wide text-muted-foreground">
              合計
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-2">
            <ClipboardList className="mb-1 size-5 text-muted-foreground" />
            <span className="font-[family-name:var(--font-primary)] text-[32px] font-bold text-foreground">
              {totalPending}
            </span>
            <span className="mb-1 font-mono text-sm text-muted-foreground">件</span>
          </CardContent>
        </Card>
      </div>

      {/* ジャンルフィルタ */}
      <GenreFilter currentGenre={genre} />

      {/* 提出物リスト */}
      {submissions.length === 0 ? (
        <Card className="border-border shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              未採点の提出はありません
            </p>
            <p className="mt-1 text-sm text-muted-foreground/80">
              新しい提出があると、ここに表示されます
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {submissions.map((submission) => (
            <Link
              key={submission.id}
              href={`/admin/grading/${submission.id}`}
              className="group block"
            >
              <Card className="border-border shadow-none transition-colors group-hover:border-primary/30">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {submission.projectTitle}
                        </span>
                        <StatusBadge status={submission.status} />
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{submission.studentName}</span>
                        <span className="text-muted-foreground/40">|</span>
                        <span>
                          {new Date(submission.submittedAt).toLocaleDateString(
                            "ja-JP",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden sm:inline">詳細</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: "submitted" | "grading" }) {
  if (status === "submitted") {
    return (
      <Badge variant="outline" className="border-amber-500/50 text-amber-600">
        未採点
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-blue-500/50 text-blue-600">
      採点中
    </Badge>
  )
}
