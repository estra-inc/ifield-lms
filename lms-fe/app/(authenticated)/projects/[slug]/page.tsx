import React from "react"
import { redirect, notFound } from "next/navigation"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import {
  deriveProjectStatus,
  type ProjectStatusInput,
} from "@/lib/utils/project-status"
import { renderMarkdown } from "@/lib/markdown/render-markdown"
import { normalizeEvaluationItems } from "@/lib/utils/grading"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { TabNavigation, type TabKey } from "../_components/tab-navigation"
import { StartProjectButton } from "../_components/start-project-button"
import { ProgressTab } from "../_components/progress-tab"
import { TasksTab } from "../_components/tasks-tab"
import { SubmissionHistory } from "../_components/submission-history"

/**
 * 模擬案件詳細ページ（Server Component）
 *
 * slug パラメータで案件を特定し、Lock/Unlock 状態に応じて表示を分岐する。
 * Super Admin は閲覧モードで要件・評価項目を直接表示する。
 *
 * Task 6.1
 * Requirements: 2.1, 2.3, 2.7, 3.2, 3.4, 10.1, 10.2, 10.3
 */

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string; page?: string; genre?: string }>
}

const VALID_TABS: TabKey[] = ["progress", "requirements", "tasks", "history", "evaluation"]

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { user, supabase } = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { slug } = await params
  const { tab, page, genre: genreParam } = await searchParams

  // ユーザーのプロファイル取得（current_term, role）
  const profile = await getUserProfile(user.id)

  const isSuperAdmin = profile?.role === "super_admin"
  const isReadOnly = isSuperAdmin || profile?.role === "manager"

  // 案件をslugで取得（genre で絞り込み: URL パラメータ → ユーザーのデフォルトジャンル）
  const targetGenre = (genreParam || profile?.default_genre || "engineering") as "engineering" | "design"
  const { data: project, error: projectError } = await supabase
    .from("mock_projects")
    .select("id, slug, title, description, requirements, evaluation_items, genre, status")
    .eq("slug", slug)
    .eq("genre", targetGenre)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // --- 閲覧専用ロール（Super Admin / Manager）: 要件 + 評価項目をタブ表示 ---
  if (isReadOnly) {
    const adminTabs: { key: TabKey; label: string }[] = [
      { key: "requirements", label: "案件要件" },
      { key: "evaluation", label: "評価項目" },
    ]
    const adminActiveTab: TabKey =
      tab === "evaluation" ? "evaluation" : "requirements"

    let renderedRequirements: React.ReactNode = null
    if (project.requirements) {
      const { content: rendered } = await renderMarkdown(project.requirements)
      renderedRequirements = rendered
    }

    const categories = normalizeEvaluationItems(
      (project.evaluation_items ?? []) as unknown[]
    )

    // 大項目ごとにグループ化
    const groupedCategories = new Map<
      string,
      { category_medium: string; items: { id: string; label: string; point: number }[] }[]
    >()
    for (const cat of categories) {
      const existing = groupedCategories.get(cat.category_large) ?? []
      existing.push(cat)
      groupedCategories.set(cat.category_large, existing)
    }

    return (
      <div className="min-w-0 space-y-6 px-8 py-6">
        {/* ヘッダー */}
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-primary)] text-xl font-bold tracking-tight text-foreground">
            {project.title}
          </h1>
          {project.description && (
            <p className="font-mono text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>

        {/* タブ + タブコンテンツ */}
        <TabNavigation activeTab={adminActiveTab} tabs={adminTabs}>
          {adminActiveTab === "requirements" && (
            <div className="space-y-4">
              <h2 className="font-[family-name:var(--font-primary)] text-lg font-semibold text-foreground">
                案件要件
              </h2>
              {renderedRequirements ? (
                <div className="min-w-0 overflow-x-auto rounded-lg border border-border bg-card p-6">
                  {renderedRequirements}
                </div>
              ) : (
                <p className="font-mono text-sm text-muted-foreground">
                  要件は設定されていません。
                </p>
              )}
            </div>
          )}

          {adminActiveTab === "evaluation" && (
            <div className="space-y-4">
              <h2 className="font-[family-name:var(--font-primary)] text-lg font-semibold text-foreground">
                評価項目
              </h2>
              {categories.length > 0 ? (
                <div className="rounded-lg border border-border bg-card p-6">
                  <Accordion
                    type="multiple"
                    defaultValue={Array.from(groupedCategories.keys())}
                  >
                    {Array.from(groupedCategories.entries()).map(
                      ([largeCat, mediumCats]) => {
                        const totalItems = mediumCats.reduce(
                          (sum, mc) => sum + mc.items.length,
                          0
                        )
                        const totalPoints = mediumCats.reduce(
                          (sum, mc) =>
                            sum + mc.items.reduce((s, item) => s + item.point, 0),
                          0
                        )

                        return (
                          <AccordionItem key={largeCat} value={largeCat}>
                            <AccordionTrigger className="text-base font-semibold">
                              <div className="flex items-center gap-3">
                                <span>{largeCat}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {totalItems}項目 / {totalPoints}pt
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="flex flex-col gap-4 pl-2">
                                {mediumCats.map((medCat) => (
                                  <div
                                    key={`${largeCat}-${medCat.category_medium}`}
                                  >
                                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                                      {medCat.category_medium}
                                    </h4>
                                    <div className="flex flex-col gap-1.5 pl-2">
                                      {medCat.items.map((item) => (
                                        <div
                                          key={item.id}
                                          className="flex items-center gap-3 px-2 py-1"
                                        >
                                          <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                                          <span className="flex-1 text-sm">
                                            {item.label}
                                          </span>
                                          <span className="text-xs text-muted-foreground tabular-nums">
                                            {item.point}pt
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        )
                      }
                    )}
                  </Accordion>
                </div>
              ) : (
                <p className="font-mono text-sm text-muted-foreground">
                  評価項目は設定されていません。
                </p>
              )}
            </div>
          )}
        </TabNavigation>
      </div>
    )
  }

  // --- 受講生向け: 既存ロジック ---

  // この案件の assignment を取得
  const { data: assignment } = await supabase
    .from("project_assignments")
    .select("id, status, created_at, due_date")
    .eq("user_id", user.id)
    .eq("project_id", project.id)
    .single()

  // 全 submissions を取得（統計算出用）
  let allSubmissions: { id: string; status: string; score: number | null; created_at: string }[] = []
  let latestSubmission: { id: string; status: string; created_at: string } | null = null
  if (assignment) {
    const { data: subs } = await supabase
      .from("project_submissions")
      .select("id, status, score, created_at")
      .eq("assignment_id", assignment.id)
      .order("created_at", { ascending: false })

    allSubmissions = subs ?? []
    if (allSubmissions.length > 0) {
      latestSubmission = allSubmissions[0]
    }
  }

  // 提出統計
  const submissionCount = allSubmissions.length
  const rejectedCount = allSubmissions.filter((s) => s.status === "rejected").length
  const gradedCount = allSubmissions.filter((s) => s.status === "graded").length
  const gradedScores = allSubmissions
    .filter((s) => s.status === "graded" && s.score !== null)
    .map((s) => s.score!)
  const bestScore = gradedScores.length > 0 ? Math.max(...gradedScores) : null

  // 着手状況を導出
  const statusInput: ProjectStatusInput = {
    assignment: assignment
      ? { id: assignment.id, status: assignment.status }
      : null,
    latestSubmission,
  }
  const projectStatus = deriveProjectStatus(statusInput)

  // Lock/Unlock 判定
  const isLocked = !assignment
  const activeTab: TabKey = VALID_TABS.includes(tab as TabKey)
    ? (tab as TabKey)
    : "progress"
  const isArchived = project.status === "archived"

  // 案件要件の Markdown レンダリング（Unlock 状態かつ requirements がある場合のみ）
  let renderedRequirements: React.ReactNode = null
  if (!isLocked && project.requirements) {
    const { content: rendered } = await renderMarkdown(project.requirements)
    renderedRequirements = rendered
  }

  // 評価項目の準備（Unlock 状態のみ）
  const categories = !isLocked
    ? normalizeEvaluationItems((project.evaluation_items ?? []) as unknown[])
    : []

  const groupedCategories = new Map<
    string,
    { category_medium: string; items: { id: string; label: string; point: number }[] }[]
  >()
  for (const cat of categories) {
    const existing = groupedCategories.get(cat.category_large) ?? []
    existing.push(cat)
    groupedCategories.set(cat.category_large, existing)
  }

  return (
    <div className="min-w-0 space-y-6 px-8 py-6">
      {/* ヘッダー */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {isArchived && (
            <Badge variant="outline" className="text-[10px]">
              アーカイブ
            </Badge>
          )}
        </div>
        <h1 className="font-[family-name:var(--font-primary)] text-xl font-bold tracking-tight text-foreground">
          {project.title}
        </h1>
        {project.description && (
          <p className="font-mono text-sm text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>

      {isLocked ? (
        /* Lock 状態: タイトル + 概要 + 着手ボタン */
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="font-mono text-sm text-muted-foreground">
              この案件に着手すると、要件の詳細を確認できます。
            </p>
          </div>
          <StartProjectButton
            projectId={project.id}
            currentTerm={profile?.current_term ?? null}
          />
        </div>
      ) : (
        /* Unlock 状態: タブ構成 */
        <div className="space-y-6">
          <TabNavigation activeTab={activeTab}>
            {activeTab === "progress" && (
              <ProgressTab
                assignmentId={assignment!.id}
                startDate={assignment!.created_at}
                dueDate={assignment!.due_date ?? null}
                latestSubmissionDate={latestSubmission?.created_at ?? null}
                latestSubmissionStatus={latestSubmission?.status ?? null}
                isGrading={latestSubmission?.status === "grading"}
                isArchived={isArchived}
                currentPage={Math.max(1, parseInt(page ?? "1", 10) || 1)}
                slug={slug}
                submissionCount={submissionCount}
                rejectedCount={rejectedCount}
                gradedCount={gradedCount}
                bestScore={bestScore}
              />
            )}

            {activeTab === "requirements" && (
              <div className="space-y-4">
                <h2 className="font-[family-name:var(--font-primary)] text-lg font-semibold text-foreground">
                  案件要件
                </h2>
                {renderedRequirements ? (
                  <div className="min-w-0 overflow-x-auto rounded-lg border border-border bg-card p-6">
                    {renderedRequirements}
                  </div>
                ) : (
                  <p className="font-mono text-sm text-muted-foreground">
                    要件は設定されていません。
                  </p>
                )}
              </div>
            )}

            {activeTab === "evaluation" && (
              <div className="space-y-4">
                <h2 className="font-[family-name:var(--font-primary)] text-lg font-semibold text-foreground">
                  評価項目
                </h2>
                {categories.length > 0 ? (
                  <>
                    {/* カテゴリ概要テーブル */}
                    <div className="overflow-x-auto rounded-lg border border-border bg-card">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">カテゴリ</th>
                            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">項目数</th>
                            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">配点</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(groupedCategories.entries()).map(([largeCat, mediumCats]) => {
                            const itemCount = mediumCats.reduce((sum, mc) => sum + mc.items.length, 0)
                            const points = mediumCats.reduce(
                              (sum, mc) => sum + mc.items.reduce((s, item) => s + item.point, 0),
                              0
                            )
                            return (
                              <tr key={largeCat} className="border-b border-border last:border-b-0">
                                <td className="px-4 py-2.5 font-medium">{largeCat}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{itemCount}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{points}pt</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border bg-muted/30">
                            <td className="px-4 py-2.5 font-semibold">合計</td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                              {Array.from(groupedCategories.values()).reduce(
                                (sum, mcs) => sum + mcs.reduce((s, mc) => s + mc.items.length, 0), 0
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                              {Array.from(groupedCategories.values()).reduce(
                                (sum, mcs) => sum + mcs.reduce((s, mc) => s + mc.items.reduce((p, item) => p + item.point, 0), 0), 0
                              )}pt
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                  <div className="rounded-lg border border-border bg-card p-6">
                    <Accordion
                      type="multiple"
                      defaultValue={Array.from(groupedCategories.keys())}
                    >
                      {Array.from(groupedCategories.entries()).map(
                        ([largeCat, mediumCats]) => {
                          const totalItems = mediumCats.reduce(
                            (sum, mc) => sum + mc.items.length,
                            0
                          )
                          const totalPoints = mediumCats.reduce(
                            (sum, mc) =>
                              sum + mc.items.reduce((s, item) => s + item.point, 0),
                            0
                          )

                          return (
                            <AccordionItem key={largeCat} value={largeCat}>
                              <AccordionTrigger className="text-base font-semibold">
                                <div className="flex items-center gap-3">
                                  <span>{largeCat}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {totalItems}項目 / {totalPoints}pt
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="flex flex-col gap-4 pl-2">
                                  {mediumCats.map((medCat) => (
                                    <div
                                      key={`${largeCat}-${medCat.category_medium}`}
                                    >
                                      <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                                        {medCat.category_medium}
                                      </h4>
                                      <div className="flex flex-col gap-1.5 pl-2">
                                        {medCat.items.map((item) => (
                                          <div
                                            key={item.id}
                                            className="flex items-center gap-3 px-2 py-1"
                                          >
                                            <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                                            <span className="flex-1 text-sm">
                                              {item.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                              {item.point}pt
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        }
                      )}
                    </Accordion>
                  </div>
                  </>
                ) : (
                  <p className="font-mono text-sm text-muted-foreground">
                    評価項目は設定されていません。
                  </p>
                )}
              </div>
            )}

            {activeTab === "tasks" && (
              <TasksTab
                assignmentId={assignment!.id}
                userRole={profile?.role ?? "user"}
                userId={user.id}
              />
            )}

            {activeTab === "history" && (
              <div className="space-y-4">
                <h2 className="font-[family-name:var(--font-primary)] text-lg font-semibold text-foreground">
                  提出履歴
                </h2>
                <SubmissionHistory
                  assignmentId={assignment!.id}
                  currentPage={Math.max(1, parseInt(page ?? "1", 10) || 1)}
                  slug={slug}
                />
              </div>
            )}
          </TabNavigation>
        </div>
      )}
    </div>
  )
}
