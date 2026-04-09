/**
 * Slack メンション解決ロジック
 *
 * 担当コーチの slack_user_id を取得し、メンション文字列を組み立てる。
 * 未登録・取得失敗時は @here でフォールバックする。
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

/** Slack の `@here` メンション文字列 */
export const HERE_MENTION = "<!here>"

/**
 * 担当コーチの Slack User ID を取得し、Slack メンション文字列を返す。
 *
 * - 登録済み: `<@U01ABCDEF>`
 * - coach_id が null / profile 取得失敗 / slack_user_id 未登録 のいずれかの場合: `<!here>`
 *
 * 例外は投げない。失敗時は警告ログを出した上で常に有効なメンション文字列を返す。
 */
export async function resolveCoachMention(
  client: SupabaseClient<Database>,
  coachId: string | null
): Promise<string> {
  if (!coachId) {
    console.warn("[notifications] coachId is null, falling back to @here")
    return HERE_MENTION
  }

  const { data, error } = await client
    .from("profiles")
    .select("slack_user_id")
    .eq("id", coachId)
    .single()

  if (error || !data) {
    console.error(
      "[notifications] failed to fetch coach profile:",
      error?.message ?? "unknown error"
    )
    return HERE_MENTION
  }

  if (!data.slack_user_id) {
    return HERE_MENTION
  }

  return `<@${data.slack_user_id}>`
}
