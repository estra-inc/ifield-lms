import Link from "next/link"
import { BookOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCachedActiveVersionId } from "@/lib/supabase/cached-queries"

interface SectionQuizButtonProps {
  tutorial: string
  chapter: string
  section: string
  genre: string
}

/**
 * セクション詳細ページの「演習問題に挑戦」ボタン（Server Component）
 *
 * 当該セクションにクイズが存在する場合のみ表示する。
 * 複数クイズがある場合はクイズ選択ページへ、1つの場合は直接クイズページへ遷移する。
 *
 * Requirements: 3.1, 3.2, 5.3
 */
export async function SectionQuizButton({
  tutorial,
  chapter,
  section,
  genre,
}: SectionQuizButtonProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const activeVersionId = await getCachedActiveVersionId()

  if (!activeVersionId) {
    return null
  }

  // セクションに紐づく全クイズを取得
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, slug, title")
    .eq("tutorial", tutorial)
    .eq("chapter", chapter)
    .eq("section", section)
    .eq("genre", genre)
    .eq("version_id", activeVersionId)
    .eq("status", "active")
    .order("slug")

  if (!quizzes || quizzes.length === 0) {
    return null
  }

  const baseQuizPath = `/contents/${tutorial}/${chapter}/${section}/quiz?genre=${genre}`

  // クイズが1つの場合: slug パラメータ付きで直接遷移
  if (quizzes.length === 1) {
    // 最新スコアを取得
    const { data: latestLog } = await supabase
      .from("quiz_logs")
      .select("score, total_questions")
      .eq("user_id", user.id)
      .eq("quiz_id", quizzes[0].id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    return (
      <div className="flex flex-col items-center gap-2 pt-4">
        <Link
          href={`${baseQuizPath}&slug=${quizzes[0].slug}`}
          className="flex items-center gap-2 rounded-lg border border-primary bg-primary/5 px-6 py-3 font-[family-name:var(--font-primary)] text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          <BookOpen className="size-4" />
          演習問題に挑戦
        </Link>
        {latestLog && (
          <p className="font-mono text-xs text-muted-foreground">
            前回スコア: {latestLog.score}/{latestLog.total_questions}
          </p>
        )}
      </div>
    )
  }

  // 複数クイズの場合: クイズ選択ページ（slug なし）へ遷移
  return (
    <div className="flex flex-col items-center gap-2 pt-4">
      <Link
        href={baseQuizPath}
        className="flex items-center gap-2 rounded-lg border border-primary bg-primary/5 px-6 py-3 font-[family-name:var(--font-primary)] text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
      >
        <BookOpen className="size-4" />
        演習問題に挑戦（{quizzes.length}件）
      </Link>
    </div>
  )
}
