import Link from "next/link"

interface SectionNavigationProps {
  prevSection: { title: string; path: string } | null
  nextSection: { title: string; path: string } | null
  isCompleted: boolean
}

/**
 * セクション間ナビゲーション（前へ/次へ）
 *
 * 読了済みセクションでのみ表示し、未読了では非表示にする。
 */
export function SectionNavigation({
  prevSection,
  nextSection,
  isCompleted,
}: SectionNavigationProps) {
  // 未読了の場合は非表示
  if (!isCompleted) {
    return null
  }

  return (
    <div className="flex items-center justify-between pt-6">
      {prevSection ? (
        <Link
          href={prevSection.path}
          className="rounded-lg border border-border px-4 py-2.5 font-[family-name:var(--font-primary)] text-sm text-foreground transition-colors hover:bg-muted"
        >
          &lt; 前のセクション
        </Link>
      ) : (
        <div />
      )}

      {nextSection ? (
        <Link
          href={nextSection.path}
          className="rounded-lg bg-primary px-4 py-2.5 font-[family-name:var(--font-primary)] text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          次のセクション &gt;
        </Link>
      ) : (
        <div />
      )}
    </div>
  )
}
