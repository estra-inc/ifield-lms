import { redirect } from "next/navigation"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import {
  deriveProjectStatus,
  isProjectActive,
  type ProjectStatusInput,
  type ProjectStatus,
} from "@/lib/utils/project-status"
import { ProjectCard } from "./_components/project-card"
import { ProjectGenreSelectDynamic as GenreSelect } from "./_components/project-genre-select-dynamic"

/**
 * 模擬案件一覧ページ（Server Component）
 *
 * active ステータスの全案件を order 昇順で表示する。
 * ジャンルフィルタ、着手状況バッジを含む。
 *
 * Task 5.1
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10
 */

interface ProjectsPageProps {
  searchParams: Promise<{ genre?: string }>
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const { user, supabase } = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  // ユーザーのデフォルトジャンルとロールを取得
  const profile = await getUserProfile(user.id)

  const defaultGenre = profile?.default_genre ?? "engineering"
  const isSuperAdmin = profile?.role === "super_admin"
  const isReadOnly = isSuperAdmin || profile?.role === "manager"
  const params = await searchParams
  const selectedGenre = (params.genre === "design" ? "design" : params.genre === "engineering" ? "engineering" : defaultGenre) as "engineering" | "design"

  // 模擬案件を取得
  // super_admin は active のみ閲覧。受講生は active + archived（着手済み）。
  let projectsQuery = supabase
    .from("mock_projects")
    .select("id, slug, title, description, genre, order, status")
    .eq("genre", selectedGenre)

  if (isReadOnly) {
    projectsQuery = projectsQuery.eq("status", "active")
  }

  const { data: projects } = await projectsQuery.order("order")

  // super_admin はステータス導出不要（閲覧のみ）
  let projectsWithStatus: {
    id: string
    slug: string
    title: string
    description: string | null
    projectStatus: ProjectStatus
    isArchived: boolean
  }[]

  if (isReadOnly) {
    projectsWithStatus = (projects ?? []).map((project) => ({
      ...project,
      projectStatus: "未着手" as ProjectStatus,
      isArchived: false,
    }))
  } else {
    // ユーザーの assignment を取得
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select("id, project_id, status")
      .eq("user_id", user.id)

    // 各 assignment の最新 submission を取得
    const assignmentIds = (assignments ?? []).map((a) => a.id)
    let submissions: { id: string; assignment_id: string; status: string }[] = []

    if (assignmentIds.length > 0) {
      const { data: subs } = await supabase
        .from("project_submissions")
        .select("id, assignment_id, status, created_at")
        .in("assignment_id", assignmentIds)
        .order("created_at", { ascending: false })

      submissions = subs ?? []
    }

    // assignment ごとの最新 submission をマップ化
    const latestSubmissionMap = new Map<
      string,
      { id: string; status: string }
    >()
    for (const sub of submissions) {
      if (!latestSubmissionMap.has(sub.assignment_id)) {
        latestSubmissionMap.set(sub.assignment_id, {
          id: sub.id,
          status: sub.status,
        })
      }
    }

    // project_id -> assignment マップ
    const assignmentMap = new Map(
      (assignments ?? []).map((a) => [a.project_id, a])
    )

    // 各案件の着手状況を導出
    projectsWithStatus = (projects ?? [])
      .map((project) => {
        const assignment = assignmentMap.get(project.id) ?? null
        const latestSubmission = assignment
          ? latestSubmissionMap.get(assignment.id) ?? null
          : null

        const input: ProjectStatusInput = {
          assignment: assignment
            ? { id: assignment.id, status: assignment.status }
            : null,
          latestSubmission,
        }

        const projectStatus = deriveProjectStatus(input)
        const isArchived = project.status === "archived"

        return {
          ...project,
          projectStatus,
          isArchived,
          hasAssignment: !!assignment,
        }
      })
      // archived かつ未着手の案件を除外 (Req 1.7)
      .filter((p) => !(p.isArchived && !("hasAssignment" in p && p.hasAssignment)))
  }

  return (
    <div className="min-w-0 space-y-6 px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-primary)] text-xl font-bold tracking-tight text-foreground">
          模擬案件
        </h1>
        <GenreSelect
          currentGenre={selectedGenre}
          defaultGenre={defaultGenre}
        />
      </div>

      {/* 案件カードグリッド */}
      {projectsWithStatus.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectsWithStatus.map((project) => (
            <ProjectCard
              key={project.id}
              slug={project.slug}
              genre={selectedGenre}
              title={project.title}
              description={project.description}
              status={project.projectStatus}
              isArchived={project.isArchived}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            このジャンルにはまだ模擬案件がありません。
          </p>
        </div>
      )}
    </div>
  )
}
