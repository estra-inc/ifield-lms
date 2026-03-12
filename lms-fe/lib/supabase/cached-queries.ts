import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { unstable_cache } from "next/cache"

/**
 * リクエストスコープでキャッシュされた認証ユーザー取得。
 * layout.tsx と page.tsx の両方から呼んでも1回のみ実行される。
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { user, supabase }
})

/**
 * リクエストスコープでキャッシュされたプロフィール取得。
 * 同一リクエスト内で複数回呼んでも1回のみ実行される。
 */
export const getUserProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, avatar_url, role, current_term, default_genre, created_at, graduation_date"
    )
    .eq("id", userId)
    .single()
  return profile
})

/**
 * active バージョン ID の取得（unstable_cache で60秒キャッシュ）。
 * バージョン承認時のみ変更されるため、短期キャッシュで十分。
 * admin client を使用するため RLS の影響なし。
 */
export const getCachedActiveVersionId = unstable_cache(
  async (): Promise<string | null> => {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from("content_versions")
      .select("id")
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (error || !data) return null
    return data.id
  },
  ["active-version-id"],
  { revalidate: 60, tags: ["active-version-id"] }
)
