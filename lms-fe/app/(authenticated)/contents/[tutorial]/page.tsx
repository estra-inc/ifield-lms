import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { getAuthUser, getUserProfile } from "@/lib/supabase/cached-queries"
import { resolveVersionId } from "@/lib/supabase/content-version"
import { ContentBreadcrumb } from "@/app/(authenticated)/contents/_components/content-breadcrumb"

interface TutorialDetailPageProps {
  params: Promise<{
    tutorial: string
  }>
  searchParams: Promise<{ genre?: string; version_id?: string }>
}

/**
 * チュートリアル詳細ページ（Server Component）
 *
 * チャプター/セクション構成を表示し、
 * 各セクションの読了状態をチェックマークで表示する。
 */
export default async function TutorialDetailPage({
  params,
  searchParams,
}: TutorialDetailPageProps) {
  const { tutorial } = await params
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

  // genre パラメータを取得（tutorial slug は genre 間で重複する可能性があるため必須）
  const genre = resolvedSearchParams.genre

  // チュートリアル情報を取得
  let tutorialQuery = supabase
    .from("contents")
    .select("id, title, slug_path, genre")
    .eq("tutorial", tutorial)
    .eq("content_type", "tutorial")
    .eq("version_id", activeVersionId)

  if (genre) {
    tutorialQuery = tutorialQuery.eq("genre", genre)
  }

  const { data: tutorialData } = await tutorialQuery.limit(1).maybeSingle()

  if (!tutorialData) {
    notFound()
  }

  // 以降のクエリでは確定した genre を使用
  const resolvedGenre = tutorialData.genre

  // チャプター一覧を取得
  const { data: chapters } = await supabase
    .from("contents")
    .select("id, title, chapter, slug_path, order")
    .eq("tutorial", tutorial)
    .eq("genre", resolvedGenre)
    .eq("content_type", "chapter")
    .eq("version_id", activeVersionId)
    .order("order")

  // セクション一覧を取得
  const { data: sections } = await supabase
    .from("contents")
    .select("id, title, section, chapter, slug_path, order")
    .eq("tutorial", tutorial)
    .eq("genre", resolvedGenre)
    .eq("content_type", "section")
    .eq("version_id", activeVersionId)
    .order("order")

  // 読了状態を取得（super_admin は閲覧のみなのでスキップ）
  let completedIds = new Set<string>()
  if (!isReadOnly) {
    const sectionIds = (sections ?? []).map((s) => s.id)
    const { data: progressData } = sectionIds.length > 0
      ? await supabase
          .from("content_progress")
          .select("content_id")
          .eq("user_id", user.id)
          .in("content_id", sectionIds)
      : { data: [] }

    completedIds = new Set(
      (progressData ?? []).map((p) => p.content_id)
    )
  }

  const breadcrumbItems = [
    { label: "教材", href: `/contents?genre=${resolvedGenre}` },
  ]

  return (
    <div>
      <ContentBreadcrumb items={breadcrumbItems} currentLabel={tutorialData.title} />

      <div className="px-8 pb-8 space-y-6">
        <h1 className="font-[family-name:var(--font-primary)] text-[22px] font-bold text-foreground">
          {tutorialData.title}
        </h1>

        {/* チャプター / セクション一覧 */}
        <div className="space-y-6">
          {(chapters ?? []).map((chapter) => {
            const chapterSections = (sections ?? []).filter(
              (s) => s.chapter === chapter.chapter
            )

            return (
              <div
                key={chapter.id}
                className="rounded-lg border border-border bg-card p-5"
              >
                <h2 className="font-[family-name:var(--font-primary)] text-base font-semibold text-foreground mb-3">
                  {chapter.title}
                </h2>

                <div className="space-y-1">
                  {chapterSections.map((section) => {
                    const isRead = completedIds.has(section.id)

                    return (
                      <Link
                        key={section.id}
                        href={`/contents/${tutorial}/${section.chapter}/${section.section}?genre=${resolvedGenre}`}
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
            )
          })}
        </div>
      </div>
    </div>
  )
}
