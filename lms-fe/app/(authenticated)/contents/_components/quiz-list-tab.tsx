import { createClient } from "@/lib/supabase/server"
import { getActiveVersionId } from "@/lib/supabase/content-version"
import {
  QuizListClient,
  type GroupedTutorial,
} from "./quiz-list-client"

interface QuizListTabProps {
  genre: string
}

/**
 * 演習問題タブの一覧表示（Server Component）
 *
 * active バージョンの全クイズをツリー形式で一覧表示する。
 * チュートリアル → チャプター → セクション → クイズ の階層構造。
 * quiz_logs（スコア情報）はトグル展開時に Client 側で遅延取得する。
 *
 * Requirements: 3.3, 5.5
 */
export async function QuizListTab({ genre }: QuizListTabProps) {
  const supabase = await createClient()

  const activeVersionId = await getActiveVersionId(supabase)

  if (!activeVersionId) {
    return (
      <div className="py-12 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          演習問題はまだありません。
        </p>
      </div>
    )
  }

  // クイズ一覧とコンテンツタイトルを並列取得
  const [quizzesResult, contentsResult] = await Promise.all([
    supabase
      .from("quizzes")
      .select("id, slug, title, genre, tutorial, chapter, section")
      .eq("version_id", activeVersionId)
      .eq("genre", genre)
      .eq("status", "active")
      .order("tutorial")
      .order("chapter")
      .order("section")
      .order("slug"),
    supabase
      .from("contents")
      .select("title, tutorial, chapter, section, content_type")
      .eq("version_id", activeVersionId)
      .eq("genre", genre)
      .in("content_type", ["tutorial", "chapter", "section"]),
  ])

  const quizzes = quizzesResult.data
  const contents = contentsResult.data

  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          このジャンルにはまだ演習問題がありません。
        </p>
      </div>
    )
  }

  // タイトルマップ構築
  const titleMap = new Map<string, string>()
  if (contents) {
    for (const c of contents) {
      if (c.content_type === "tutorial") {
        titleMap.set(`tutorial:${c.tutorial}`, c.title)
      } else if (c.content_type === "chapter") {
        titleMap.set(`chapter:${c.tutorial}:${c.chapter}`, c.title)
      } else if (c.content_type === "section") {
        titleMap.set(
          `section:${c.tutorial}:${c.chapter}:${c.section}`,
          c.title
        )
      }
    }
  }

  // 階層グルーピング
  const grouped: GroupedTutorial[] = []
  for (const quiz of quizzes) {
    const tutorialTitle =
      titleMap.get(`tutorial:${quiz.tutorial}`) ?? quiz.tutorial
    const chapterTitle =
      titleMap.get(`chapter:${quiz.tutorial}:${quiz.chapter}`) ?? quiz.chapter
    const sectionTitle =
      titleMap.get(
        `section:${quiz.tutorial}:${quiz.chapter}:${quiz.section}`
      ) ?? quiz.section

    let tGroup = grouped.find((g) => g.tutorial === quiz.tutorial)
    if (!tGroup) {
      tGroup = {
        tutorial: quiz.tutorial,
        tutorialTitle,
        chapters: [],
        quizIds: [],
      }
      grouped.push(tGroup)
    }
    tGroup.quizIds.push(quiz.id)

    let cGroup = tGroup.chapters.find((c) => c.chapter === quiz.chapter)
    if (!cGroup) {
      cGroup = { chapter: quiz.chapter, chapterTitle, sections: [] }
      tGroup.chapters.push(cGroup)
    }

    let sGroup = cGroup.sections.find((s) => s.section === quiz.section)
    if (!sGroup) {
      sGroup = { section: quiz.section, sectionTitle, quizzes: [] }
      cGroup.sections.push(sGroup)
    }

    sGroup.quizzes.push(quiz)
  }

  return <QuizListClient grouped={grouped} />
}
