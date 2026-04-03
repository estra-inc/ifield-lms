import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { resolveVersionId } from "@/lib/supabase/content-version"
import { ContentBreadcrumb } from "@/app/(authenticated)/contents/_components/content-breadcrumb"
import { QuizClient } from "@/app/(authenticated)/contents/_components/quiz-client"

interface QuizPageProps {
  params: Promise<{
    tutorial: string
    chapter: string
    section: string
  }>
  searchParams: Promise<{ genre?: string; version_id?: string; slug?: string }>
}

/**
 * クイズ解答ページ（Server Component）
 *
 * セクションに紐づくクイズデータと履歴をフェッチし、
 * QuizClient（Client Component）に渡す。
 * slug パラメータでクイズを特定する。未指定で複数ある場合はクイズ選択UIを表示。
 *
 * Requirements: 3.2, 5.4, 7.1, 7.3, 7.5
 */
export default async function QuizPage({
  params,
  searchParams,
}: QuizPageProps) {
  const { tutorial, chapter, section } = await params
  const resolvedSearchParams = await searchParams

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // バージョン ID を解決
  const activeVersionId = await resolveVersionId(supabase, resolvedSearchParams)

  if (!activeVersionId) {
    notFound()
  }

  const genre = resolvedSearchParams.genre
  const slug = resolvedSearchParams.slug

  // セクションに紐づく全クイズを取得
  let quizzesQuery = supabase
    .from("quizzes")
    .select("id, slug, title, questions, genre, tutorial, chapter, section")
    .eq("tutorial", tutorial)
    .eq("chapter", chapter)
    .eq("section", section)
    .eq("version_id", activeVersionId)
    .eq("status", "active")

  if (genre) {
    quizzesQuery = quizzesQuery.eq("genre", genre)
  }

  const { data: quizzes } = await quizzesQuery.order("slug")

  if (!quizzes || quizzes.length === 0) {
    notFound()
  }

  // パンくず用データを取得
  const { data: tutorialData } = await supabase
    .from("contents")
    .select("title")
    .eq("tutorial", tutorial)
    .eq("genre", quizzes[0].genre)
    .eq("content_type", "tutorial")
    .eq("version_id", activeVersionId)
    .limit(1)
    .maybeSingle()

  const { data: chapterData } = await supabase
    .from("contents")
    .select("title")
    .eq("tutorial", tutorial)
    .eq("chapter", chapter)
    .eq("genre", quizzes[0].genre)
    .eq("content_type", "chapter")
    .eq("version_id", activeVersionId)
    .limit(1)
    .maybeSingle()

  const { data: sectionData } = await supabase
    .from("contents")
    .select("title")
    .eq("tutorial", tutorial)
    .eq("chapter", chapter)
    .eq("section", section)
    .eq("genre", quizzes[0].genre)
    .eq("content_type", "section")
    .eq("version_id", activeVersionId)
    .limit(1)
    .maybeSingle()

  const genreQuery = `?genre=${quizzes[0].genre}`
  const backPath = `/contents/${tutorial}/${chapter}/${section}${genreQuery}`

  const breadcrumbItems = [
    { label: "教材", href: `/contents${genreQuery}` },
    ...(tutorialData
      ? [
          {
            label: tutorialData.title,
            href: `/contents/${tutorial}${genreQuery}`,
          },
        ]
      : []),
    ...(chapterData
      ? [
          {
            label: chapterData.title,
            href: `/contents/${tutorial}/${chapter}${genreQuery}`,
          },
        ]
      : []),
    ...(sectionData
      ? [
          {
            label: sectionData.title,
            href: backPath,
          },
        ]
      : []),
  ]

  // クイズの特定: slug 指定あり or クイズが1つの場合は直接表示
  const quiz =
    slug
      ? quizzes.find((q) => q.slug === slug)
      : quizzes.length === 1
        ? quizzes[0]
        : null

  // slug 指定なし & 複数クイズ → クイズ選択 UI を表示
  if (!quiz) {
    // 各クイズの最新スコアを取得
    const quizIds = quizzes.map((q) => q.id)
    const logsMap = new Map<string, { score: number; total: number }>()

    const { data: logs } = await supabase
      .from("quiz_logs")
      .select("quiz_id, score, total_questions, created_at")
      .eq("user_id", user.id)
      .in("quiz_id", quizIds)
      .order("created_at", { ascending: false })

    if (logs) {
      for (const log of logs) {
        if (!logsMap.has(log.quiz_id)) {
          logsMap.set(log.quiz_id, {
            score: log.score,
            total: log.total_questions,
          })
        }
      }
    }

    return (
      <div>
        <ContentBreadcrumb items={breadcrumbItems} currentLabel="演習問題" />

        <div className="px-4 pb-6 sm:px-6 md:px-8 md:pb-8">
          <div className="mx-auto max-w-2xl space-y-6">
            <h1 className="font-[family-name:var(--font-primary)] text-lg font-bold text-foreground">
              演習問題を選択
            </h1>
            <div className="grid gap-4">
              {quizzes.map((q) => {
                const log = logsMap.get(q.id)
                const quizUrl = `/contents/${tutorial}/${chapter}/${section}/quiz${genreQuery}&slug=${q.slug}`
                return (
                  <Link
                    key={q.id}
                    href={quizUrl}
                    className="group flex items-center justify-between rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="size-5 text-primary" />
                      <div>
                        <h2 className="font-[family-name:var(--font-primary)] text-sm font-semibold text-foreground group-hover:text-primary">
                          {q.title}
                        </h2>
                        <p className="font-mono text-xs text-muted-foreground">
                          {q.questions.length}問
                        </p>
                      </div>
                    </div>
                    {log && (
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {log.score}/{log.total}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // クイズが特定されている → 解答 UI を表示
  // 挑戦回数と最高スコアを取得
  const { data: logs } = await supabase
    .from("quiz_logs")
    .select("score, total_questions")
    .eq("user_id", user.id)
    .eq("quiz_id", quiz.id)
    .order("created_at", { ascending: false })

  const history =
    logs && logs.length > 0
      ? {
          attemptCount: logs.length,
          bestScore: Math.max(...logs.map((l) => l.score)),
          bestTotal: logs[0].total_questions,
        }
      : null

  // 同ジャンルの全クイズ（順序付き）を取得し、次のクイズを特定
  const { data: allQuizzes } = await supabase
    .from("quizzes")
    .select("id, slug, title, genre, tutorial, chapter, section")
    .eq("version_id", activeVersionId)
    .eq("genre", quiz.genre)
    .eq("status", "active")
    .order("tutorial")
    .order("chapter")
    .order("section")
    .order("slug")

  let nextQuiz: {
    title: string
    path: string
    label: string
    confirm: string | null
  } | null = null
  if (allQuizzes) {
    const currentIndex = allQuizzes.findIndex((q) => q.id === quiz.id)
    if (currentIndex !== -1 && currentIndex < allQuizzes.length - 1) {
      const next = allQuizzes[currentIndex + 1]
      const isSameTutorial = next.tutorial === tutorial
      const isSameChapter = isSameTutorial && next.chapter === chapter
      const isSameSection = isSameChapter && next.section === section

      let label: string
      let confirm: string | null = null
      if (isSameSection) {
        label = "次の演習問題へ"
      } else if (isSameChapter) {
        label = "次のセクションの演習へ"
      } else if (isSameTutorial) {
        label = "次のチャプターの演習へ"
        confirm = "次の演習問題は異なるチャプターになりますが、続けますか？"
      } else {
        label = "次のチュートリアルの演習へ"
        confirm =
          "次の演習問題は異なるチュートリアルになりますが、続けますか？"
      }

      nextQuiz = {
        title: next.title,
        path: `/contents/${next.tutorial}/${next.chapter}/${next.section}/quiz?genre=${next.genre}&slug=${next.slug}`,
        label,
        confirm,
      }
    }
  }

  return (
    <div>
      <ContentBreadcrumb items={breadcrumbItems} currentLabel="演習問題" />

      <div className="px-4 pb-6 sm:px-6 md:px-8 md:pb-8">
        <QuizClient
          quiz={{
            id: quiz.id,
            title: quiz.title,
            questions: quiz.questions,
          }}
          history={history}
          backPath={backPath}
          genre={quiz.genre}
          nextQuiz={nextQuiz}
        />
      </div>
    </div>
  )
}
