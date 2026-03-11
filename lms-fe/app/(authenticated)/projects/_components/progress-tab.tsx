import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { SubmitDialog } from "./submit-dialog"
import { SubmissionHistory } from "./submission-history"
import { DueDateEditDialog } from "./due-date-picker"

/**
 * ProgressTab Server Component
 *
 * 進捗タブのコンテンツを表示する。
 * - 進捗サマリカード（開始日・提出予定日・最新提出日）
 * - 成果物提出ダイアログ（SubmitDialog）
 * - 提出履歴（SubmissionHistory）
 */

interface ProgressTabProps {
  assignmentId: string
  startDate: string
  dueDate: string | null
  latestSubmissionDate: string | null
  latestSubmissionStatus: string | null
  isGrading: boolean
  isArchived: boolean
  currentPage: number
  slug: string
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-"
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date)
}

export function ProgressTab({
  assignmentId,
  startDate,
  dueDate,
  latestSubmissionDate,
  latestSubmissionStatus,
  isGrading,
  isArchived,
  currentPage,
  slug,
}: ProgressTabProps) {
  return (
    <div className="space-y-6">
      {/* 進捗サマリカード */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="font-mono text-xs text-muted-foreground">開始日</p>
              <p className="font-mono text-sm font-medium" data-testid="start-date">
                {formatDate(startDate)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-xs text-muted-foreground">提出予定日</p>
              <DueDateEditDialog assignmentId={assignmentId} dueDate={dueDate} />
            </div>
            <div className="space-y-1">
              <p className="font-mono text-xs text-muted-foreground">最新提出日</p>
              <p className="font-mono text-sm font-medium" data-testid="latest-submission-date">
                {formatDate(latestSubmissionDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 再提出依頼アラート */}
      {latestSubmissionStatus === "rejected" && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                再提出が依頼されています
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                前回の提出が差し戻されました。修正後、再度提出してください。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 提出ダイアログ */}
      <SubmitDialog
        assignmentId={assignmentId}
        isGrading={isGrading}
        isArchived={isArchived}
      />

      {/* 提出履歴 */}
      <div className="space-y-4">
        <h3 className="font-[family-name:var(--font-primary)] text-base font-semibold text-foreground">
          提出履歴
        </h3>
        <SubmissionHistory
          assignmentId={assignmentId}
          currentPage={currentPage}
          slug={slug}
        />
      </div>
    </div>
  )
}
