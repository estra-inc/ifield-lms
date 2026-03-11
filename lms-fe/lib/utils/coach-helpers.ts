import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, CoachingGenre } from "@/lib/types/database"

export interface ActiveCoach {
  id: string
  fullName: string
  genre: string
}

/**
 * 有効なコーチ一覧を取得する。
 *
 * 「有効」の条件:
 * - role が super_admin
 * - default_genre が設定済み（genre 引数があればその genre に一致）
 * - Supabase Auth で ban されていない
 *
 * super_admin の人数は少数なので、全員の ban ステータスを並列チェックしても問題ない。
 */
export async function getActiveCoaches(
  adminClient: SupabaseClient<Database>,
  genre?: CoachingGenre
): Promise<ActiveCoach[]> {
  let query = adminClient
    .from("profiles")
    .select("id, full_name, default_genre")
    .eq("role", "super_admin")
    .not("default_genre", "is", null)

  if (genre) {
    query = query.eq("default_genre", genre)
  }

  const { data: coaches } = await query
  if (!coaches || coaches.length === 0) return []

  // 並列で ban チェック
  const results = await Promise.all(
    coaches.map(async (coach) => {
      const { data } = await adminClient.auth.admin.getUserById(coach.id)
      const bannedUntil = data?.user?.banned_until ?? null
      const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()
      return { coach, isBanned }
    })
  )

  return results
    .filter((r) => !r.isBanned)
    .map((r) => ({
      id: r.coach.id,
      fullName: r.coach.full_name ?? "不明",
      genre: r.coach.default_genre!,
    }))
}

/**
 * 特定のコーチが有効かどうかを判定する。
 *
 * 「有効」の条件:
 * - profile が存在する
 * - role が super_admin
 * - default_genre が指定ジャンルと一致
 * - Supabase Auth で ban されていない
 */
export async function isCoachActive(
  adminClient: SupabaseClient<Database>,
  coachId: string,
  genre: CoachingGenre
): Promise<{ active: boolean; fullName: string | null }> {
  const { data: coachProfile } = await adminClient
    .from("profiles")
    .select("id, full_name, role, default_genre")
    .eq("id", coachId)
    .single()

  if (
    !coachProfile ||
    coachProfile.role !== "super_admin" ||
    coachProfile.default_genre !== genre
  ) {
    return { active: false, fullName: coachProfile?.full_name ?? null }
  }

  // ban チェック
  const { data } = await adminClient.auth.admin.getUserById(coachId)
  const bannedUntil = data?.user?.banned_until ?? null
  const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()

  return { active: !isBanned, fullName: coachProfile.full_name }
}
