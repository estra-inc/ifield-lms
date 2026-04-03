import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Calendar,
  ChevronRight,
  FileText,
  Inbox,
} from "lucide-react"
import { RadarChart } from "@/components/grading/radar-chart"
import type { RadarAxisData } from "@/components/grading/radar-chart"

/**
 * 受講生向けスキルレポートページ
 *
 * graded 済みの全案件のスコアを集約し、案件ごとにレーダーチャートで表示する。
 * category_large を軸として自動導出し、案件ごとの達成率を算出する。
 */
export default async function StudentSkillReportPage() {
  // --- 認証チェック ---
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // --- データフェッチ ---
  // 自身の graded 済み submissions を取得
  const { data: submissions } = await supabase
    .from("project_submissions")
    .select(
      `
      id,
      score,
      status,
      updated_at,
      assignment_id,
      project_assignments!inner (
        id,
        project_id,
        mock_projects!inner (
          id,
          title,
          genre
        )
      )
    `
    )
    .eq("status", "graded")
    .order("updated_at", { ascending: false })

  type SubmissionRow = {
    id: string
    score: number | null
    status: string
    updated_at: string
    assignment_id: string
    project_assignments: {
      id: string
      project_id: string
      mock_projects: {
        id: string
        title: string
        genre: string
      }
    }
  }

  const typedSubmissions = (submissions ?? []) as unknown as SubmissionRow[]

  // 同一案件の最新 graded 結果のみを選択
  const latestByProject = new Map<string, SubmissionRow>()
  for (const sub of typedSubmissions) {
    const projectId = sub.project_assignments.mock_projects.id
    const existing = latestByProject.get(projectId)
    if (
      !existing ||
      new Date(sub.updated_at) > new Date(existing.updated_at)
    ) {
      latestByProject.set(projectId, sub)
    }
  }

  const latestSubmissions = Array.from(latestByProject.values())

  // 各案件の evaluation_details を取得してレーダーチャートデータを構築
  type ProjectReportData = {
    projectId: string
    projectTitle: string
    genre: string
    score: number
    gradedAt: string
    submissionId: string
    assignmentId: string
    radarData: RadarAxisData[]
  }

  const projectReports: ProjectReportData[] = []

  for (const sub of latestSubmissions) {
    // evaluation_details を取得
    const { data: evaluation } = await supabase
      .from("project_evaluations")
      .select("id")
      .eq("submission_id", sub.id)
      .eq("status", "finalized")
      .single()

    let radarData: RadarAxisData[] = []

    if (evaluation) {
      const { data: details } = await supabase
        .from("project_evaluation_details")
        .select("category_large, point, is_ok")
        .eq("evaluation_id", evaluation.id)

      if (details && details.length > 0) {
        // category_large ごとに集計
        const categoryMap = new Map<
          string,
          { earned: number; total: number }
        >()
        for (const detail of details) {
          const existing = categoryMap.get(detail.category_large) ?? {
            earned: 0,
            total: 0,
          }
          existing.total += detail.point
          if (detail.is_ok) {
            existing.earned += detail.point
          }
          categoryMap.set(detail.category_large, existing)
        }

        radarData = Array.from(categoryMap.entries()).map(
          ([axis, data]) => ({
            axis,
            value:
              data.total > 0
                ? Math.round((data.earned / data.total) * 100)
                : 0,
            fullMark: 100,
          })
        )
      }
    }

    projectReports.push({
      projectId: sub.project_assignments.mock_projects.id,
      projectTitle: sub.project_assignments.mock_projects.title,
      genre: sub.project_assignments.mock_projects.genre,
      score: sub.score ?? 0,
      gradedAt: sub.updated_at,
      submissionId: sub.id,
      assignmentId: sub.project_assignments.id,
      radarData,
    })
  }

  // 空状態チェック
  const isEmpty = projectReports.length === 0

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
          スキルレポート
        </h1>
        <p className="text-sm text-muted-foreground">
          模擬案件の採点結果に基づくスキル達成状況を確認できます
        </p>
      </div>

      {isEmpty ? (
        /* 空状態 */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              まだ採点済みの案件がありません
            </p>
            <p className="mt-1 text-sm text-muted-foreground/80">
              模擬案件の採点が完了すると、ここにスキルレポートが表示されます
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {/* 案件ごとのレーダーチャート + 詳細 */}
          {projectReports.map((report) => (
            <Card key={report.projectId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    {report.projectTitle}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="text-xs"
                  >
                    {report.genre === "engineering"
                      ? "Engineering"
                      : "Design"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* レーダーチャート */}
                {report.radarData.length > 0 && (
                  <div className="mb-6">
                    <RadarChart data={report.radarData} />
                  </div>
                )}

                {/* スコアと採点日 */}
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tabular-nums">
                        {report.score}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        スコア
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(report.gradedAt).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* 詳細へのリンク */}
                  <Link
                    href={`/projects/${report.assignmentId}/submissions/${report.submissionId}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    詳細を見る
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
