import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  Inbox,
  XCircle,
} from "lucide-react"
import { RadarChart } from "@/components/grading/radar-chart"
import type { RadarAxisData } from "@/components/grading/radar-chart"

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Manager / Super Admin 向けスキルレポートページ
 *
 * Manager: スコアと達成率の集約結果のみ閲覧可能。
 * Super Admin: 項目レベルの OK/NG 詳細も閲覧可能。
 */
export default async function AdminSkillReportPage({ params }: PageProps) {
  const { id: targetUserId } = await params

  // --- 認証・権限チェック ---
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (
    !currentProfile ||
    (currentProfile.role !== "manager" &&
      currentProfile.role !== "super_admin")
  ) {
    redirect("/dashboard")
  }

  const currentUserRole = currentProfile.role
  const showItemDetails = currentUserRole === "super_admin"

  // --- 対象ユーザー情報取得 ---
  const adminClient = createAdminClient()
  const { data: targetProfile } = await adminClient
    .from("profiles")
    .select("full_name, email")
    .eq("id", targetUserId)
    .single()

  if (!targetProfile) {
    redirect("/admin/users")
  }

  // --- データフェッチ ---
  // Super Admin は adminClient、Manager は supabase（RLS適用）
  const dataClient = showItemDetails ? adminClient : supabase

  const { data: submissions } = await adminClient
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
        user_id,
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
      user_id: string
      project_id: string
      mock_projects: {
        id: string
        title: string
        genre: string
      }
    }
  }

  const typedSubmissions = (submissions ?? []) as unknown as SubmissionRow[]

  // 対象ユーザーの submissions のみフィルタ
  const userSubmissions = typedSubmissions.filter(
    (sub) => sub.project_assignments.user_id === targetUserId
  )

  // 同一案件の最新 graded 結果のみを選択
  const latestByProject = new Map<string, SubmissionRow>()
  for (const sub of userSubmissions) {
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

  // 各案件のレポートデータを構築
  type EvaluationDetail = {
    category_large: string
    category_medium: string
    item_label: string
    point: number
    is_ok: boolean
  }

  type ProjectReportData = {
    projectId: string
    projectTitle: string
    genre: string
    score: number
    gradedAt: string
    submissionId: string
    radarData: RadarAxisData[]
    evaluationDetails: EvaluationDetail[]
  }

  const projectReports: ProjectReportData[] = []

  for (const sub of latestSubmissions) {
    const { data: evaluation } = await adminClient
      .from("project_evaluations")
      .select("id")
      .eq("submission_id", sub.id)
      .eq("status", "finalized")
      .single()

    let radarData: RadarAxisData[] = []
    let evaluationDetails: EvaluationDetail[] = []

    if (evaluation) {
      const { data: details } = await dataClient
        .from("project_evaluation_details")
        .select("category_large, category_medium, item_label, point, is_ok")
        .eq("evaluation_id", evaluation.id)

      const typedDetails = (details ?? []) as unknown as EvaluationDetail[]

      if (typedDetails.length > 0) {
        evaluationDetails = typedDetails

        // category_large ごとに集計
        const categoryMap = new Map<
          string,
          { earned: number; total: number }
        >()
        for (const detail of typedDetails) {
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
      radarData,
      evaluationDetails,
    })
  }

  const isEmpty = projectReports.length === 0

  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {/* 戻るリンク */}
      <Link
        href={`/admin/users/${targetUserId}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        ユーザー詳細に戻る
      </Link>

      {/* ページヘッダー */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          スキルレポート
        </h1>
        <p className="text-sm text-muted-foreground">
          {targetProfile.full_name ?? targetProfile.email} さんのスキル達成状況
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
          {projectReports.map((report) => (
            <Card key={report.projectId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                    {report.projectTitle}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
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

                  <Link
                    href={`/admin/grading/${report.submissionId}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    詳細を見る
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Super Admin: 項目レベルの OK/NG 詳細 */}
                {showItemDetails &&
                  report.evaluationDetails.length > 0 && (
                    <div className="mt-6 border-t pt-4">
                      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                        評価詳細
                      </h3>
                      <EvaluationDetailsAccordion
                        details={report.evaluationDetails}
                      />
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 評価詳細のアコーディオン表示（Super Admin 専用）
 */
function EvaluationDetailsAccordion({
  details,
}: {
  details: {
    category_large: string
    category_medium: string
    item_label: string
    point: number
    is_ok: boolean
  }[]
}) {
  // category_large > category_medium でグループ化
  const grouped = new Map<
    string,
    Map<
      string,
      { item_label: string; point: number; is_ok: boolean }[]
    >
  >()

  for (const detail of details) {
    const largeGroup =
      grouped.get(detail.category_large) ?? new Map()
    const mediumGroup =
      largeGroup.get(detail.category_medium) ?? []
    mediumGroup.push({
      item_label: detail.item_label,
      point: detail.point,
      is_ok: detail.is_ok,
    })
    largeGroup.set(detail.category_medium, mediumGroup)
    grouped.set(detail.category_large, largeGroup)
  }

  return (
    <Accordion
      type="multiple"
      defaultValue={Array.from(grouped.keys())}
    >
      {Array.from(grouped.entries()).map(
        ([largeCat, mediumGroups]) => {
          // 大項目の集計
          let okCount = 0
          let totalCount = 0
          for (const items of mediumGroups.values()) {
            for (const item of items) {
              totalCount++
              if (item.is_ok) okCount++
            }
          }

          return (
            <AccordionItem key={largeCat} value={largeCat}>
              <AccordionTrigger className="text-sm font-semibold">
                <div className="flex items-center gap-3">
                  <span>{largeCat}</span>
                  <Badge variant="secondary" className="text-xs">
                    {okCount} / {totalCount}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3 pl-2">
                  {Array.from(mediumGroups.entries()).map(
                    ([medCat, items]) => (
                      <div key={`${largeCat}-${medCat}`}>
                        <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">
                          {medCat}
                        </h4>
                        <div className="flex flex-col gap-1 pl-2">
                          {items.map((item, idx) => (
                            <div
                              key={`${medCat}-${idx}`}
                              className="flex items-center gap-2 px-1 py-0.5 text-sm"
                            >
                              {item.is_ok ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                              )}
                              <span className="flex-1">
                                {item.item_label}
                              </span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {item.point}pt
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        }
      )}
    </Accordion>
  )
}
