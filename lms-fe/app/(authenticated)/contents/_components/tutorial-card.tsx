import Link from "next/link"
import type { TutorialWithProgress } from "@/app/(authenticated)/contents/_lib/progress"

interface TutorialCardProps {
  tutorial: TutorialWithProgress
}

/**
 * チュートリアルカード
 *
 * タイトル、チャプター数・セクション数、進捗率をプログレスバー付きで表示する。
 * 進捗状態に応じたバリエーション: 未着手(#6B7280)、進行中(#00B0EC)、完了(#22C55E)
 */
export function TutorialCard({ tutorial }: TutorialCardProps) {
  const isCompleted = tutorial.progressPercent === 100
  const isNotStarted = tutorial.completedSectionCount === 0

  const progressColor = isCompleted
    ? "#22C55E"
    : isNotStarted
      ? "#6B7280"
      : "#00B0EC"

  const progressLabel = isCompleted
    ? "完了!"
    : isNotStarted
      ? "未着手"
      : `進捗 ${tutorial.progressPercent}%`

  return (
    <Link
      href={`/contents/${tutorial.slug_path}?genre=${tutorial.genre}`}
      className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-col gap-3">
        {/* タイトル */}
        <h3 className="font-[family-name:var(--font-primary)] text-[15px] font-semibold text-foreground">
          {tutorial.title}
        </h3>

        {/* メタ情報 */}
        <p className="font-mono text-xs text-muted-foreground">
          {tutorial.chapterCount}チャプター・{tutorial.sectionCount}セクション
        </p>

        {/* 進捗表示 */}
        <div className="flex flex-col gap-1.5">
          <p
            className="font-mono text-[11px] font-semibold"
            style={{ color: progressColor }}
          >
            {progressLabel}
          </p>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${tutorial.progressPercent}%`,
                backgroundColor: progressColor,
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
