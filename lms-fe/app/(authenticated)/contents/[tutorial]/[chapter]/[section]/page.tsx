import { notFound, redirect } from "next/navigation"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import { resolveVersionId } from "@/lib/supabase/content-version"
import { renderMarkdown } from "@/lib/markdown/render-markdown"
import { ContentBreadcrumb } from "@/app/(authenticated)/contents/_components/content-breadcrumb"
import { TableOfContentsClient } from "@/app/(authenticated)/contents/_components/table-of-contents-client"
import { SectionNavigation } from "@/app/(authenticated)/contents/_components/section-navigation"
import { ReadCompleteButton } from "@/app/(authenticated)/contents/_components/read-complete-button"
import { SectionQuizButton } from "@/app/(authenticated)/contents/_components/section-quiz-button"

interface ContentDetailPageProps {
  params: Promise<{
    tutorial: string
    chapter: string
    section: string
  }>
  searchParams: Promise<{ genre?: string; version_id?: string }>
}

/**
 * 教材セクション詳細ページ（Server Component）
 *
 * パンくずリスト + サイドバー ToC + Markdown コンテンツ + ナビゲーション + 読了ボタンを表示する。
 */
export default async function ContentDetailPage({
  params,
  searchParams,
}: ContentDetailPageProps) {
  const { tutorial, chapter, section } = await params
  const resolvedSearchParams = await searchParams

  const { user, supabase } = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  // ロール取得
  const userProfile = await getUserProfile(user.id)

  const isSuperAdmin = userProfile?.role === "super_admin"
  const isReadOnly = isSuperAdmin || userProfile?.role === "manager"

  // バージョン ID を解決（version_id パラメータ指定時は Super Admin のみプレビュー可能）
  const activeVersionId = await resolveVersionId(supabase, resolvedSearchParams)

  // active バージョンが存在しない場合はコンテンツなしとして扱う
  if (!activeVersionId) {
    notFound()
  }

  // セクションコンテンツを取得
  const genre = resolvedSearchParams.genre
  let sectionQuery = supabase
    .from("contents")
    .select("*")
    .eq("tutorial", tutorial)
    .eq("chapter", chapter)
    .eq("section", section)
    .eq("version_id", activeVersionId)
    .eq("content_type", "section")

  if (genre) {
    sectionQuery = sectionQuery.eq("genre", genre)
  }

  const { data: content } = await sectionQuery.limit(1).maybeSingle()

  if (!content) {
    notFound()
  }

  // パンくずリスト用のデータを取得
  const { data: tutorialData } = await supabase
    .from("contents")
    .select("title, slug_path")
    .eq("tutorial", tutorial)
    .eq("genre", content.genre)
    .eq("content_type", "tutorial")
    .eq("version_id", activeVersionId)
    .limit(1)
    .maybeSingle()

  const { data: chapterData } = await supabase
    .from("contents")
    .select("title, slug_path")
    .eq("tutorial", tutorial)
    .eq("chapter", chapter)
    .eq("genre", content.genre)
    .eq("content_type", "chapter")
    .eq("version_id", activeVersionId)
    .limit(1)
    .maybeSingle()

  // 同一チャプター内のセクション一覧を取得（ナビゲーション用）
  const { data: siblings } = await supabase
    .from("contents")
    .select("id, title, slug_path, section, chapter, order")
    .eq("tutorial", tutorial)
    .eq("chapter", chapter)
    .eq("genre", content.genre)
    .eq("content_type", "section")
    .eq("version_id", activeVersionId)
    .order("order")

  const currentIndex = (siblings ?? []).findIndex(
    (s) => s.section === section
  )
  const genreQuery = `?genre=${content.genre}`
  const prevSection =
    currentIndex > 0
      ? {
          title: siblings![currentIndex - 1].title,
          path: `/contents/${tutorial}/${siblings![currentIndex - 1].chapter}/${siblings![currentIndex - 1].section}${genreQuery}`,
        }
      : null
  const nextSection =
    currentIndex < (siblings?.length ?? 0) - 1
      ? {
          title: siblings![currentIndex + 1].title,
          path: `/contents/${tutorial}/${siblings![currentIndex + 1].chapter}/${siblings![currentIndex + 1].section}${genreQuery}`,
        }
      : null

  // 読了状態を取得（閲覧専用ロールはスキップ）
  let isCompleted = false
  if (!isReadOnly) {
    const { data: progress } = await supabase
      .from("content_progress")
      .select("id")
      .eq("user_id", user.id)
      .eq("content_id", content.id)
      .maybeSingle()

    isCompleted = !!progress
  }

  // Markdown レンダリングと ToC 抽出
  const { content: renderedContent, tocItems } = await renderMarkdown(
    content.body ?? ""
  )

  // パンくずアイテムの構築
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
  ]

  const chapterListPath = `/contents/${tutorial}`

  return (
    <div>
      {/* パンくずリスト */}
      <ContentBreadcrumb items={breadcrumbItems} currentLabel={content.title} />

      {/* メインレイアウト */}
      <div className="flex gap-0 px-4 pb-6 sm:px-6 md:px-8 md:pb-8">
        {/* サイドバー目次 */}
        {tocItems.length > 0 && (
          <TableOfContentsClient tocItems={tocItems} />
        )}

        {/* メインコンテンツ */}
        <div className="w-0 flex-1 pl-8 pt-6">
          <div className="rounded-lg border border-border bg-card p-8 space-y-8">
            {/* セクションタイトル */}
            <h1
              id="section-content"
              className="font-[family-name:var(--font-primary)] text-[22px] font-bold text-foreground scroll-mt-20"
            >
              {content.title}
            </h1>

            {/* Markdown コンテンツ */}
            {renderedContent}

            {/* セクション間ナビゲーション */}
            <SectionNavigation
              prevSection={prevSection}
              nextSection={nextSection}
              isCompleted={isCompleted}
            />

            {/* 読了ボタン（閲覧専用ロールは非表示） */}
            {!isReadOnly && (
              <ReadCompleteButton
                contentId={content.id}
                isCompleted={isCompleted}
                sectionTitle={content.title}
                hasNextSection={!!nextSection}
                nextSectionPath={nextSection?.path ?? null}
                chapterListPath={chapterListPath}
              />
            )}

            {/* 演習問題ボタン（クイズが存在するセクションのみ表示） */}
            <SectionQuizButton
              tutorial={tutorial}
              chapter={chapter}
              section={section}
              genre={content.genre}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
