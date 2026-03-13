import { createClient } from "@/lib/supabase/server"
import { getCachedActiveVersionId } from "@/lib/supabase/cached-queries"
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

  const activeVersionId = await getCachedActiveVersionId()

  if (!activeVersionId) {
    return (
      <div className="py-12 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          演習問題はまだありません。
        </p>
      </div>
    )
  }

  // クイズ一覧とコンテンツタイトル・order を並列取得
  const [quizzesResult, contentsResult] = await Promise.all([
    supabase
      .from("quizzes")
      .select("id, slug, title, genre, tutorial, chapter, section")
      .eq("version_id", activeVersionId)
      .eq("genre", genre)
      .eq("status", "active"),
    supabase
      .from("contents")
      .select("title, tutorial, chapter, section, content_type, order")
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

  // タイトル・order マップ構築
  const titleMap = new Map<string, string>()
  const orderMap = new Map<string, number>()
  if (contents) {
    for (const c of contents) {
      if (c.content_type === "tutorial") {
        titleMap.set(`tutorial:${c.tutorial}`, c.title)
        orderMap.set(`tutorial:${c.tutorial}`, c.order ?? 0)
      } else if (c.content_type === "chapter") {
        titleMap.set(`chapter:${c.tutorial}:${c.chapter}`, c.title)
        orderMap.set(`chapter:${c.tutorial}:${c.chapter}`, c.order ?? 0)
      } else if (c.content_type === "section") {
        titleMap.set(
          `section:${c.tutorial}:${c.chapter}:${c.section}`,
          c.title
        )
        orderMap.set(
          `section:${c.tutorial}:${c.chapter}:${c.section}`,
          c.order ?? 0
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

  // contents の order 値で昇順ソート
  grouped.sort((a, b) =>
    (orderMap.get(`tutorial:${a.tutorial}`) ?? 0) -
    (orderMap.get(`tutorial:${b.tutorial}`) ?? 0)
  )
  for (const tGroup of grouped) {
    tGroup.chapters.sort((a, b) =>
      (orderMap.get(`chapter:${tGroup.tutorial}:${a.chapter}`) ?? 0) -
      (orderMap.get(`chapter:${tGroup.tutorial}:${b.chapter}`) ?? 0)
    )
    for (const cGroup of tGroup.chapters) {
      cGroup.sections.sort((a, b) =>
        (orderMap.get(`section:${tGroup.tutorial}:${cGroup.chapter}:${a.section}`) ?? 0) -
        (orderMap.get(`section:${tGroup.tutorial}:${cGroup.chapter}:${b.section}`) ?? 0)
      )
    }
  }

  return <QuizListClient grouped={grouped} />
}
