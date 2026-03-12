import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import { resolveVersionId } from "@/lib/supabase/content-version"
import { ContentBreadcrumb } from "@/app/(authenticated)/contents/_components/content-breadcrumb"

interface ChapterDetailPageProps {
  params: Promise<{
    tutorial: string
    chapter: string
  }>
  searchParams: Promise<{ genre?: string; version_id?: string }>
}

/**
 * チャプター詳細ページ（Server Component）
 *
 * チャプター内のセクション一覧を表示し、
 * 各セクションの読了状態をチェックマークで表示する。
 */
export default async function ChapterDetailPage({
  params,
  searchParams,
}: ChapterDetailPageProps) {
  const { tutorial, chapter } = await params
  const resolvedSearchParams = await searchParams
  const { user, supabase } = await getAuthUser()

  if (!user) {
    redirect("/auth/login")
  }

  // ロール取得
  const userProfile = await getUserProfile(user.id)

  const isReadOnly =
    userProfile?.role === "super_admin" || userProfile?.role === "manager"

  // バージョン ID を解決
  const activeVersionId = await resolveVersionId(supabase, resolvedSearchParams)

  if (!activeVersionId) {
    notFound()
  }

  const genre = resolvedSearchParams.genre

  // チャプター情報を取得
  let chapterQuery = supabase
    .from("contents")
    .select("id, title, slug_path, genre, tutorial, chapter")
    .eq("tutorial", tutorial)
    .eq("chapter", chapter)
    .eq("content_type", "chapter")
    .eq("version_id", activeVersionId)

  if (genre) {
    chapterQuery = chapterQuery.eq("genre", genre)
  }

  const { data: chapterData } = await chapterQuery.limit(1).maybeSingle()

  if (!chapterData) {
    notFound()
  }

  const resolvedGenre = chapterData.genre

  // チュートリアル情報（パンくず用）
  const { data: tutorialData } = await supabase
    .from("contents")
    .select("title")
    .eq("tutorial", tutorial)
    .eq("genre", resolvedGenre)
    .eq("content_type", "tutorial")
    .eq("version_id", activeVersionId)
    .limit(1)
    .maybeSingle()

  // セクション一覧を取得
  const { data: sections } = await supabase
    .from("contents")
    .select("id, title, section, chapter, slug_path, order")
    .eq("tutorial", tutorial)
    .eq("chapter", chapter)
    .eq("genre", resolvedGenre)
    .eq("content_type", "section")
    .eq("version_id", activeVersionId)
    .order("order")

  // 読了状態を取得
  let completedIds = new Set<string>()
  if (!isReadOnly) {
    const sectionIds = (sections ?? []).map((s) => s.id)
    const { data: progressData } =
      sectionIds.length > 0
        ? await supabase
            .from("content_progress")
            .select("content_id")
            .eq("user_id", user.id)
            .in("content_id", sectionIds)
        : { data: [] }

    completedIds = new Set((progressData ?? []).map((p) => p.content_id))
  }

  const genreQuery = `?genre=${resolvedGenre}`
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
  ]

  return (
    <div>
      <ContentBreadcrumb
        items={breadcrumbItems}
        currentLabel={chapterData.title}
      />

      <div className="px-8 pb-8 space-y-6">
        <h1 className="font-[family-name:var(--font-primary)] text-[22px] font-bold text-foreground">
          {chapterData.title}
        </h1>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="space-y-1">
            {(sections ?? []).map((section) => {
              const isRead = completedIds.has(section.id)

              return (
                <Link
                  key={section.id}
                  href={`/contents/${tutorial}/${chapter}/${section.section}${genreQuery}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <CheckCircle
                    className={`size-4 shrink-0 ${
                      isRead
                        ? "text-[#22C55E]"
                        : "text-muted-foreground/30"
                    }`}
                    fill={isRead ? "#22C55E" : "transparent"}
                    stroke={isRead ? "white" : "currentColor"}
                  />
                  <span className={isRead ? "text-muted-foreground" : ""}>
                    {section.title}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
