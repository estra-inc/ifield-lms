/**
 * ProjectAssignmentsCard
 *
 * マネージャー/スーパー管理者向け: 受講生の模擬案件の提出履歴を表示するカード。
 * 「採点中」と「採点済み（採点完了・差し戻し含む）」の2セクションに分けて表示する。
 * Server Component。
 */

import Link from "next/link"
import { FolderOpen } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface SubmissionRow {
  submissionId: string
  projectTitle: string
  genre: string
  status: "submitted" | "grading" | "graded" | "rejected"
  score: number | null
  createdAt: string
}

interface ProjectAssignmentsCardProps {
  submissions: SubmissionRow[]
  gradingBasePath?: string
}

const GENRE_LABELS: Record<string, string> = {
  engineering: "Engineering",
  design: "Design",
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "提出済み",
  grading: "採点中",
  graded: "採点完了",
  rejected: "差し戻し",
}

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "grading":
    case "submitted":
      return "default"
    case "graded":
      return "secondary"
    case "rejected":
      return "destructive"
    default:
      return "outline"
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`
}

function SubmissionTable({ rows, gradingBasePath }: { rows: SubmissionRow[]; gradingBasePath: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">案件名</TableHead>
          <TableHead className="w-[100px] text-xs">ジャンル</TableHead>
          <TableHead className="w-[100px] text-xs">ステータス</TableHead>
          <TableHead className="w-[100px] text-xs">提出日</TableHead>
          <TableHead className="w-[80px] text-right text-xs">スコア</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.submissionId} className="cursor-pointer hover:bg-muted/50">
            <TableCell className="text-[13px] font-medium">
              <Link href={`${gradingBasePath}/${s.submissionId}`} className="block hover:text-primary hover:underline">
                {s.projectTitle}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[11px]">
                {GENRE_LABELS[s.genre] ?? s.genre}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={getStatusBadgeVariant(s.status)}
                className="text-[11px]"
              >
                {STATUS_LABELS[s.status] ?? s.status}
              </Badge>
            </TableCell>
            <TableCell className="text-[13px] text-muted-foreground">
              {formatDate(s.createdAt)}
            </TableCell>
            <TableCell className="text-right font-mono text-[13px]">
              {s.score !== null ? `${s.score}点` : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function ProjectAssignmentsCard({
  submissions,
  gradingBasePath = "/admin/grading",
}: ProjectAssignmentsCardProps) {
  if (submissions.length === 0) {
    return (
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="text-base font-bold tracking-tight">模擬案件</h3>
        <div className="flex flex-col items-center gap-3 py-6">
          <FolderOpen className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            提出履歴はありません
          </p>
        </div>
      </Card>
    )
  }

  // 統計算出
  const submissionCount = submissions.length
  const rejectedCount = submissions.filter((s) => s.status === "rejected").length
  const gradedCount = submissions.filter((s) => s.status === "graded").length
  const gradedScores = submissions
    .filter((s) => s.status === "graded" && s.score !== null)
    .map((s) => s.score!)
  const bestScore = gradedScores.length > 0 ? Math.max(...gradedScores) : null

  // 採点中（submitted, grading）
  const inProgress = submissions.filter(
    (s) => s.status === "submitted" || s.status === "grading"
  )

  // 採点済み（graded, rejected）— 新しい順
  const completed = submissions.filter(
    (s) => s.status === "graded" || s.status === "rejected"
  )

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h3 className="text-base font-bold tracking-tight">模擬案件</h3>

      {/* 提出統計 */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-4">
        <div className="space-y-1">
          <p className="font-mono text-xs text-muted-foreground">提出回数</p>
          <p className="font-mono text-sm font-medium">{submissionCount}</p>
        </div>
        <div className="space-y-1">
          <p className="font-mono text-xs text-muted-foreground">差し戻し数</p>
          <p className="font-mono text-sm font-medium">{rejectedCount}</p>
        </div>
        <div className="space-y-1">
          <p className="font-mono text-xs text-muted-foreground">採点完了数</p>
          <p className="font-mono text-sm font-medium">{gradedCount}</p>
        </div>
        <div className="space-y-1">
          <p className="font-mono text-xs text-muted-foreground">最高得点</p>
          <p className="font-mono text-sm font-medium">
            {bestScore !== null ? `${bestScore}点` : "-"}
          </p>
        </div>
      </div>

      {/* 採点中セクション */}
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-muted-foreground">
          採点中
        </h4>
        {inProgress.length > 0 ? (
          <SubmissionTable rows={inProgress} gradingBasePath={gradingBasePath} />
        ) : (
          <p className="py-3 text-center text-sm text-muted-foreground">
            現在採点中の提出物はありません
          </p>
        )}
      </div>

      {/* 採点済みセクション */}
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-muted-foreground">
          採点済み
        </h4>
        {completed.length > 0 ? (
          <SubmissionTable rows={completed} gradingBasePath={gradingBasePath} />
        ) : (
          <p className="py-3 text-center text-sm text-muted-foreground">
            採点済みの提出物はありません
          </p>
        )}
      </div>
    </Card>
  )
}
