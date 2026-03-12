import { redirect } from "next/navigation"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import { resolveVersionId } from "@/lib/supabase/content-version"
import { ProgressSummaryCards } from "./_components/progress-summary-cards"
import { TutorialCard } from "./_components/tutorial-card"
import { QuizListTab } from "./_components/quiz-list-tab"
import { GenreSelectDynamic as GenreSelect } from "./_components/genre-select-dynamic"
import { UrlTabs } from "@/components/url-tabs"
import {
  calculateTutorialProgress,
  calculateGenreProgressSummary,
  type TutorialWithProgress,
} from "./_lib/progress"

interface ContentsPageProps {
  searchParams: Promise<{ genre?: string; version_id?: string; tab?: string }>
}

/**
 * 教材一覧ページ（Server Component）
 *
 * 進捗サマリーカード + タブ + ジャンルプルダウン + チュートリアルカードグリッドを表示する。
 * URL searchParams でジャンルフィルタリングを管理する。
 */
export default async function ContentsPage({ searchParams }: ContentsPageProps) {
  const { user, supabase } = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  // cache() でリクエスト内重複排除される（layout.tsx と共有）
  const profile = await getUserProfile(user.id)

  const defaultGenre = profile?.default_genre ?? "engineering"
  const isSuperAdmin = profile?.role === "super_admin"
  const isReadOnly = isSuperAdmin || profile?.role === "manager"
  const params = await searchParams
  const selectedGenre = params.genre ?? defaultGenre
  const activeTab = params.tab ?? "materials"
  const genreLabel = selectedGenre === "engineering" ? "エンジニアリング" : "デザイン"

  // バージョン ID を解決
  const activeVersionId = await resolveVersionId(supabase, params)

  // active バージョンが存在しない場合はコンテンツなしとして扱う
  if (!activeVersionId) {
    const emptyTutorials: TutorialWithProgress[] = []
    const summary = calculateGenreProgressSummary(emptyTutorials)

    return (
      <div className="space-y-6 px-8 py-6">
        {!isReadOnly && (
          <ProgressSummaryCards summary={summary} genreLabel={genreLabel} />
        )}
        <UrlTabs
          tabs={[
            { key: "materials", label: "教材" },
            { key: "quizzes", label: "演習問題" },
          ]}
          activeTab={activeTab}
          preserveParams={["genre"]}
        >
          <div className="flex items-center justify-end pb-4">
            <GenreSelect currentGenre={selectedGenre} defaultGenre={defaultGenre} />
          </div>
          {activeTab === "quizzes" ? (
            <QuizListTab genre={selectedGenre} />
          ) : (
            <div className="py-12 text-center">
              <p className="font-mono text-sm text-muted-foreground">
                このジャンルにはまだチュートリアルがありません。
              </p>
            </div>
          )}
        </UrlTabs>
      </div>
    )
  }

  // 全クエリを並列実行
  const [tutorialsResult, allSectionsResult, allChaptersResult, progressResult] = await Promise.all([
    supabase
      .from("contents")
      .select("id, slug_path, title, genre, tutorial")
      .eq("version_id", activeVersionId)
      .eq("content_type", "tutorial")
      .eq("genre", selectedGenre)
      .order("order"),
    supabase
      .from("contents")
      .select("id, tutorial, chapter")
      .eq("version_id", activeVersionId)
      .eq("content_type", "section")
      .eq("genre", selectedGenre),
    supabase
      .from("contents")
      .select("id, tutorial")
      .eq("version_id", activeVersionId)
      .eq("content_type", "chapter")
      .eq("genre", selectedGenre),
    isReadOnly
      ? Promise.resolve({ data: null })
      : supabase
          .from("content_progress")
          .select("content_id")
          .eq("user_id", user.id),
  ])

  const tutorials = tutorialsResult.data
  const allSections = allSectionsResult.data
  const allChapters = allChaptersResult.data
  const completedContentIds = new Set<string>(
    (progressResult.data ?? []).map((p: { content_id: string }) => p.content_id)
  )

  // チュートリアルごとの進捗率を算出
  const tutorialsWithProgress: TutorialWithProgress[] = (tutorials ?? []).map(
    (tutorial) => {
      const sections = (allSections ?? []).filter(
        (s) => s.tutorial === tutorial.tutorial
      )
      const chapters = (allChapters ?? []).filter(
        (c) => c.tutorial === tutorial.tutorial
      )
      const completedCount = sections.filter((s) =>
        completedContentIds.has(s.id)
      ).length

      return {
        id: tutorial.id,
        title: tutorial.title,
        slug_path: tutorial.tutorial,
        genre: tutorial.genre,
        chapterCount: chapters.length,
        sectionCount: sections.length,
        completedSectionCount: completedCount,
        progressPercent: calculateTutorialProgress(
          sections.length,
          completedCount
        ),
      }
    }
  )

  const summary = calculateGenreProgressSummary(tutorialsWithProgress)

  return (
    <div className="space-y-6 px-8 py-6">
      {/* 進捗サマリーカード（super_admin は閲覧モードなので非表示） */}
      {!isReadOnly && (
        <ProgressSummaryCards summary={summary} genreLabel={genreLabel} />
      )}

      {/* タブ + タブコンテンツ */}
      <UrlTabs
        tabs={[
          { key: "materials", label: "教材" },
          { key: "quizzes", label: "演習問題" },
        ]}
        activeTab={activeTab}
        preserveParams={["genre"]}
      >
        {/* フィルタ行: ジャンルプルダウン（右寄せ） */}
        <div className="flex items-center justify-end pb-4">
          <GenreSelect currentGenre={selectedGenre} defaultGenre={defaultGenre} />
        </div>

        {activeTab === "quizzes" ? (
          <QuizListTab genre={selectedGenre} />
        ) : (
          <>
            {tutorialsWithProgress.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {tutorialsWithProgress.map((tutorial) => (
                  <TutorialCard key={tutorial.id} tutorial={tutorial} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="font-mono text-sm text-muted-foreground">
                  このジャンルにはまだチュートリアルがありません。
                </p>
              </div>
            )}
          </>
        )}
      </UrlTabs>
    </div>
  )
}
