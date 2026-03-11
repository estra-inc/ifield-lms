import type { SupabaseClient } from "@supabase/supabase-js"

export interface SectionProgress {
  title: string
  chapterTitle: string
  completedAt: string | null
}

export interface TutorialProgressDetail {
  title: string
  slug: string
  genre: string
  sections: SectionProgress[]
  completedCount: number
  totalCount: number
  percentage: number
}

/**
 * 教材進捗詳細データを取得する。
 *
 * チュートリアルごとにセクション一覧と読了日時を返す。
 */
export async function fetchProgressDetail(
  client: SupabaseClient,
  userId: string,
  genre: string,
  versionId: string
): Promise<TutorialProgressDetail[]> {
  const [tutorialsResult, chaptersResult, sectionsResult, progressResult] =
    await Promise.all([
      client
        .from("contents")
        .select("tutorial, title, slug_path")
        .eq("genre", genre)
        .eq("content_type", "tutorial")
        .eq("status", "active")
        .eq("version_id", versionId)
        .order("order", { ascending: true }),
      client
        .from("contents")
        .select("chapter, tutorial, title")
        .eq("genre", genre)
        .eq("content_type", "chapter")
        .eq("status", "active")
        .eq("version_id", versionId)
        .order("chapter", { ascending: true }),
      client
        .from("contents")
        .select("id, tutorial, chapter, title")
        .eq("genre", genre)
        .eq("content_type", "section")
        .eq("status", "active")
        .eq("version_id", versionId)
        .order("chapter", { ascending: true })
        .order("order", { ascending: true }),
      client
        .from("content_progress")
        .select("content_id, completed_at")
        .eq("user_id", userId),
    ])

  const tutorials = tutorialsResult.data ?? []
  const chapters = chaptersResult.data ?? []
  const sections = sectionsResult.data ?? []
  const progressRows = progressResult.data ?? []

  // content_id → completed_at のマップ
  const progressMap = new Map<string, string>()
  for (const row of progressRows) {
    progressMap.set(row.content_id, row.completed_at)
  }

  // chapter キー → タイトルのマップ
  const chapterTitleMap = new Map<string, string>()
  for (const ch of chapters) {
    chapterTitleMap.set(`${ch.tutorial}/${ch.chapter}`, ch.title)
  }

  return tutorials.map((t) => {
    const tutSections = sections.filter((s) => s.tutorial === t.tutorial)
    const sectionProgresses: SectionProgress[] = tutSections.map((s) => ({
      title: s.title,
      chapterTitle:
        chapterTitleMap.get(`${s.tutorial}/${s.chapter}`) ?? "",
      completedAt: progressMap.get(s.id) ?? null,
    }))

    const completedCount = sectionProgresses.filter(
      (s) => s.completedAt !== null
    ).length
    const totalCount = sectionProgresses.length

    return {
      title: t.title,
      slug: t.tutorial,
      genre,
      sections: sectionProgresses,
      completedCount,
      totalCount,
      percentage:
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    }
  })
}
