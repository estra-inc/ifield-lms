import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/types/database"

/**
 * サーバー用 Supabase クライアントを生成する。
 *
 * Server Components、Server Actions、Route Handlers から
 * Cookie ベースで Supabase にアクセスする際に使用する。
 *
 * Server Components からの呼び出し時は Cookie の書き込みが不可能だが、
 * setAll 内の try-catch で安全に無視される。
 * Middleware がトークンリフレッシュを担保するため問題ない。
 */
export async function createClient() {
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

  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components からの呼び出し時は Cookie の書き込みが不可。
          // Middleware の updateSession がトークンリフレッシュを担保するため、
          // ここでのエラーは安全に無視できる。
        }
      },
    },
  })
}
