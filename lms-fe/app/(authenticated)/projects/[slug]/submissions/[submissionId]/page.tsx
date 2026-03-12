import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { normalizeEvaluationItems } from "@/lib/utils/grading"
import { GradedResultView } from "@/components/grading/graded-result-view"
import type { EvaluationState } from "@/lib/types/grading"

interface PageProps {
  params: Promise<{ slug: string; submissionId: string }>
}

export default async function SubmissionDetailPage({ params }: PageProps) {
  const { slug, submissionId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // submission を取得（自分の提出物のみ RLS で制限される）
  const { data: submission, error } = await supabase
    .from("project_submissions")
    .select(
      `
      id,
      submission_url,
      submission_files,
      status,
      score,
      feedback_comment,
      created_at,
      assignment_id,
      project_assignments!inner (
        user_id,
        mock_projects!inner (
          title,
          slug,
          evaluation_items
        )
      )
    `
    )
    .eq("id", submissionId)
    .single()

  if (error || !submission) {
    notFound()
  }

  type SubmissionData = {
    id: string
    submission_url: string | null
    submission_files: { name: string; url: string }[] | null
    status: string
    score: number | null
    feedback_comment: string | null
    created_at: string
    assignment_id: string
    project_assignments: {
      user_id: string
      mock_projects: {
        title: string
        slug: string
        evaluation_items: unknown[]
      }
    }
  }

  const typed = submission as unknown as SubmissionData

  // slug の整合性チェック
  if (typed.project_assignments.mock_projects.slug !== slug) {
    notFound()
  }

  // 採点結果データを取得
  let evaluations: EvaluationState = {}
  const categories = normalizeEvaluationItems(
    typed.project_assignments.mock_projects.evaluation_items
  )

  if (typed.status === "graded" || typed.status === "rejected") {
    // finalized の evaluation_details を取得
    const { data: evaluation } = await supabase
      .from("project_evaluations")
      .select("id")
      .eq("submission_id", submissionId)
      .eq("status", "finalized")
      .single()

    if (evaluation) {
      const { data: details } = await supabase
        .from("project_evaluation_details")
        .select("item_id, is_ok")
        .eq("evaluation_id", evaluation.id)

      if (details) {
        for (const d of details) {
          evaluations[d.item_id] = d.is_ok
        }
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString))
  }

  return (
    <div className="min-w-0 space-y-6 px-8 py-6">
      <Link
        href={`/projects/${slug}?tab=history`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        提出履歴に戻る
      </Link>

      <div className="space-y-1">
        <h1 className="font-[family-name:var(--font-primary)] text-xl font-bold tracking-tight text-foreground">
          提出詳細
        </h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{formatDate(typed.created_at)}</span>
          <Badge
            variant={
              typed.status === "graded"
                ? "default"
                : typed.status === "grading"
                  ? "secondary"
                  : typed.status === "rejected"
                    ? "destructive"
                    : "outline"
            }
            className="text-[10px]"
          >
            {typed.status === "submitted"
              ? "提出済み"
              : typed.status === "grading"
                ? "採点中"
                : typed.status === "graded"
                  ? "採点完了"
                  : typed.status === "rejected"
                    ? "差し戻し"
                    : typed.status}
          </Badge>
        </div>
        {typed.submission_url && (
          <div className="pt-1">
            <p className="font-mono text-xs text-muted-foreground mb-1">リンク</p>
            <ol className="list-decimal pl-5 space-y-1">
              {typed.submission_url.split("\n").filter(Boolean).map((url, i) => (
                <li key={i} className="font-mono text-sm">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline break-all"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
        {typed.submission_files && typed.submission_files.length > 0 && (
          <div className="pt-1">
            <p className="font-mono text-xs text-muted-foreground mb-1">ファイル</p>
            <ol className="list-decimal pl-5 space-y-1">
              {typed.submission_files.map((file, i) => (
                <li key={i} className="font-mono text-sm">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {file.name}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <GradedResultView
        status={typed.status as "submitted" | "grading" | "graded" | "rejected"}
        score={typed.score}
        feedbackComment={typed.feedback_comment}
        categories={categories}
        evaluations={evaluations}
      />
    </div>
  )
}
