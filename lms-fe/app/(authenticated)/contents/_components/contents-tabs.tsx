import Link from "next/link"

interface ContentsTabsProps {
  activeTab?: string
  genre?: string
}

/**
 * タブ行
 *
 * 「教材」「演習問題」のタブ切替 UI。
 * URL ベースでタブ切替を管理する。
 */
export function ContentsTabs({
  activeTab = "materials",
  genre,
}: ContentsTabsProps = {}) {
  const genreParam = genre ? `&genre=${genre}` : ""
  const isQuizTab = activeTab === "quizzes"

  return (
    <div className="flex items-center border-b border-border">
      <div className="flex gap-0">
        {/* 教材タブ */}
        <Link
          href={`/contents?tab=materials${genreParam}`}
          className={`border-b-2 px-5 py-2.5 font-[family-name:var(--font-primary)] text-sm font-semibold transition-colors ${
            !isQuizTab
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          教材
        </Link>
        {/* 演習問題タブ */}
        <Link
          href={`/contents?tab=quizzes${genreParam}`}
          className={`border-b-2 px-5 py-2.5 font-[family-name:var(--font-primary)] text-sm font-semibold transition-colors ${
            isQuizTab
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          演習問題
        </Link>
      </div>
    </div>
  )
}
