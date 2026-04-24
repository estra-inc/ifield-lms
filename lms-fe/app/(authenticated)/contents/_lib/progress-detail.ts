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
        .select("chapter, tutorial, title, order")
        .eq("genre", genre)
        .eq("content_type", "chapter")
        .eq("status", "active")
        .eq("version_id", versionId)
        .order("order", { ascending: true }),
      client
        .from("contents")
        .select("id, tutorial, chapter, title, order")
        .eq("genre", genre)
        .eq("content_type", "section")
        .eq("status", "active")
        .eq("version_id", versionId)
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

  // chapter キー → タイトル / order のマップ
  // chapter カラムは "chapter-10" のような文字列のため、文字列ソートでは
  // chapter-1 → chapter-10 → chapter-2 の順になってしまう。
  // 数値カラム order でソートするために map を構築する。
  const chapterTitleMap = new Map<string, string>()
  const chapterOrderMap = new Map<string, number>()
  for (const ch of chapters) {
    const key = `${ch.tutorial}/${ch.chapter}`
    chapterTitleMap.set(key, ch.title)
    chapterOrderMap.set(key, ch.order ?? 0)
  }

  return tutorials.map((t) => {
    const tutSections = sections
      .filter((s) => s.tutorial === t.tutorial)
      .sort((a, b) => {
        const ao = chapterOrderMap.get(`${a.tutorial}/${a.chapter}`) ?? 0
        const bo = chapterOrderMap.get(`${b.tutorial}/${b.chapter}`) ?? 0
        if (ao !== bo) return ao - bo
        return (a.order ?? 0) - (b.order ?? 0)
      })
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
