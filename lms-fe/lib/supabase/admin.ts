import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

/**
 * Supabase Admin クライアントを生成する。
 *
 * service_role キーを使用して RLS をバイパスする Admin 権限のクライアント。
 * Supabase Auth Admin API（inviteUserByEmail, updateUserById, deleteUser, getUserById）
 * へのアクセスに使用する。
 *
 * **重要**: Server Actions 内でのみ使用すること。
 * クライアントサイドでは絶対に使用しないこと。
 * 環境変数 SUPABASE_SERVICE_ROLE_KEY は NEXT_PUBLIC_ プレフィックスを付けず、
 * サーバーサイドでのみ参照可能にする。
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL が設定されていません。.env.local を確認してください。"
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY が設定されていません。.env.local を確認してください。"
    )
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
