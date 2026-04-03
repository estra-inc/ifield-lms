import Link from "next/link"
import type { GenreProgressSummary } from "@/app/(authenticated)/contents/_lib/progress"

interface ProgressSummaryCardsProps {
  summary: GenreProgressSummary
  genreLabel: string
}

/**
 * 進捗サマリーカード（3カード構成）
 *
 * 選択中のジャンルに連動した進捗データを表示する。
 * - ジャンル進捗: セクション完了率
 * - 完了チュートリアル: チュートリアル完了数
 * - 学習中: 現在学習中のチュートリアルと直接リンク
 */
export function ProgressSummaryCards({
  summary,
  genreLabel,
}: ProgressSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* ジャンル進捗カード */}
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="font-mono text-xs text-muted-foreground">
          {genreLabel} 進捗
        </p>
        <p className="mt-2 font-[family-name:var(--font-primary)] text-[28px] font-bold text-foreground">
          {Math.round(summary.progressPercent)}%
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {summary.completedSections} / {summary.totalSections} セクション完了
        </p>
      </div>

      {/* 完了チュートリアルカード */}
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="font-mono text-xs text-muted-foreground">
          完了チュートリアル
        </p>
        <p className="mt-2 font-[family-name:var(--font-primary)] text-[28px] font-bold text-foreground">
          {summary.completedTutorials} / {summary.totalTutorials}
        </p>
        {summary.completedTutorials > 0 && (
          <p className="mt-1 font-mono text-[11px] text-[#22C55E]">
            {summary.completedTutorials} 件完了済み
          </p>
        )}
      </div>

      {/* 学習中カード */}
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="font-mono text-xs text-muted-foreground">学習中</p>
        {summary.currentTutorial ? (
          <>
            <p className="mt-2 font-[family-name:var(--font-primary)] text-base font-semibold text-foreground">
              {summary.currentTutorial.title}
            </p>
            <p className="mt-1 font-mono text-[11px] text-primary">
              進捗 {summary.currentTutorial.progressPercent}%
            </p>
            {summary.currentSectionPath && (
              <Link
                href={summary.currentSectionPath}
                className="mt-2 inline-block font-mono text-xs font-semibold text-primary hover:underline"
              >
                続きから学習する &rarr;
              </Link>
            )}
          </>
        ) : (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            現在学習中のチュートリアルはありません
          </p>
        )}
      </div>
    </div>
  )
}
