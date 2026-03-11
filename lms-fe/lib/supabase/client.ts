import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database"

/**
 * ブラウザ用 Supabase クライアントを生成する。
 *
 * Client Components から Cookie ベースで Supabase にアクセスする際に使用する。
 * createBrowserClient は内部でシングルトンキャッシュを行うため、
 * 呼び出しごとに新しいインスタンスは作成されない。
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL が設定されていません。.env.local を確認してください。"
    )
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません。.env.local を確認してください。"
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
