/**
 * ProjectStatusCard
 *
 * 進行中・直近完了の模擬案件ステータスを一覧表示するカード。
 * Server Component。
 *
 * Task 4.3
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import Link from "next/link"
import { FolderOpen, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ProjectsData, ProjectItem } from "@/lib/types/dashboard"
import type { ProjectStatus } from "@/lib/utils/project-status"

interface ProjectStatusCardProps {
  data: ProjectsData
}

function getStatusBadgeVariant(
  status: ProjectStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "着手済み":
      return "secondary"
    case "提出済み":
      return "default"
    case "採点中":
      return "default"
    case "採点完了":
      return "secondary"
    case "差し戻し":
      return "destructive"
    default:
      return "outline"
  }
}

function ProjectRow({
  project,
  variant = "filled",
}: {
  project: ProjectItem
  variant?: "filled" | "outlined"
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md px-3 py-2.5 ${
        variant === "filled"
          ? "bg-secondary"
          : "border border-border"
      }`}
    >
      <Link
        href={`/projects/${project.projectSlug}`}
        className="font-[family-name:var(--font-primary)] text-[13px] font-medium text-foreground hover:text-primary hover:underline"
      >
        {project.projectTitle}
      </Link>
      <Badge
        variant={getStatusBadgeVariant(project.status)}
        className="shrink-0 text-[11px]"
      >
        {project.status}
      </Badge>
    </div>
  )
}

export function ProjectStatusCard({ data }: ProjectStatusCardProps) {
  const hasActive = data.activeProjects.length > 0
  const hasCompleted = data.recentCompleted.length > 0

  return (
    <Card className="rounded-none border-border shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-[family-name:var(--font-primary)] text-base tracking-tight">
          模擬案件
        </CardTitle>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          一覧を見る
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!hasActive && !hasCompleted ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <FolderOpen className="size-8 text-muted-foreground/50" />
            <p className="font-mono text-sm text-muted-foreground">
              進行中の案件なし
            </p>
          </div>
        ) : (
          <>
            {hasActive && (
              <div className="flex flex-col gap-1">
                <span className="font-[family-name:var(--font-primary)] text-xs font-medium text-muted-foreground">
                  進行中
                </span>
                {data.activeProjects.map((p) => (
                  <ProjectRow key={p.projectSlug} project={p} variant="filled" />
                ))}
              </div>
            )}

            {hasCompleted && (
              <div className="flex flex-col gap-1 border-t border-border pt-3">
                <span className="font-[family-name:var(--font-primary)] text-xs font-medium text-muted-foreground">
                  直近の完了
                </span>
                {data.recentCompleted.map((p) => (
                  <ProjectRow key={p.projectSlug} project={p} variant="outlined" />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
