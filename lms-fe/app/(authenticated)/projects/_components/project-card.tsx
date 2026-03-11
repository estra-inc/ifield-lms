import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { ProjectStatus } from "@/lib/utils/project-status"

/**
 * ProjectCard
 *
 * 模擬案件カード。タイトル、概要（description）、着手状況バッジを表示する。
 *
 * Task 5.1
 * Requirements: 1.2, 1.10
 */

interface ProjectCardProps {
  slug: string
  title: string
  description: string | null
  status: ProjectStatus
  isArchived: boolean
}

/**
 * 着手状況バッジのバリアントマッピング
 */
function getStatusBadgeVariant(
  status: ProjectStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "未着手":
      return "outline"
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

export function ProjectCard({
  slug,
  title,
  description,
  status,
  isArchived,
}: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${slug}`}
      className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-col gap-3">
        {/* タイトル行 */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-[family-name:var(--font-primary)] text-[15px] font-semibold text-foreground">
            {title}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {isArchived && (
              <Badge variant="outline" className="text-[10px]">
                アーカイブ
              </Badge>
            )}
            <Badge variant={getStatusBadgeVariant(status)} className="text-[10px]">
              {status}
            </Badge>
          </div>
        </div>

        {/* 概要 */}
        {description && (
          <p className="line-clamp-2 font-mono text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </Link>
  )
}
