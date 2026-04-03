import Link from "next/link"
import { ArrowLeft, Check } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { TutorialProgressDetail } from "../_lib/progress-detail"

interface ProgressDetailViewProps {
  tutorials: TutorialProgressDetail[]
  backHref: string
  backLabel: string
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ProgressDetailView({
  tutorials,
  backHref,
  backLabel,
}: ProgressDetailViewProps) {
  return (
    <div className="flex flex-col gap-6 px-4 py-4 sm:px-6 md:px-8 md:py-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{backLabel}</h1>
      </div>

      {tutorials.length === 0 ? (
        <p className="py-12 text-center font-mono text-sm text-muted-foreground">
          教材データがありません
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {tutorials.map((tutorial) => (
            <div key={tutorial.slug} className="flex flex-col gap-4">
              {/* チュートリアルヘッダー */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/contents/${tutorial.slug}?genre=${tutorial.genre}`}
                    className="font-[family-name:var(--font-primary)] text-lg font-semibold tracking-tight hover:text-primary hover:underline"
                  >
                    {tutorial.title}
                  </Link>
                  <span className="font-mono text-sm text-muted-foreground">
                    {tutorial.completedCount} / {tutorial.totalCount} セクション
                  </span>
                </div>
                <Progress value={tutorial.percentage} className="h-2" />
              </div>

              {/* セクション一覧 */}
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-2 text-left font-mono text-xs font-medium text-muted-foreground">
                        セクション
                      </th>
                      <th className="px-4 py-2 text-left font-mono text-xs font-medium text-muted-foreground">
                        チャプター
                      </th>
                      <th className="px-4 py-2 text-right font-mono text-xs font-medium text-muted-foreground">
                        ステータス
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tutorial.sections.map((section, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-4 py-3 text-sm">{section.title}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {section.chapterTitle}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {section.completedAt ? (
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                              <Check className="size-3.5 text-green-600" />
                              {formatDateTime(section.completedAt)}
                            </span>
                          ) : (
                            <Badge variant="outline" className="font-mono text-xs">
                              未読
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
