import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/types/database"
import type { SupabaseClient, User } from "@supabase/supabase-js"

export interface UpdateSessionResult {
  supabaseResponse: NextResponse
  user: User | null
  supabase: SupabaseClient<Database>
}

/**
 * Middleware 内でセッショントークンのリフレッシュと Cookie 更新を行う。
 *
 * リクエストごとに呼び出され、期限切れのアクセストークンを自動的にリフレッシュし、
 * 更新された Cookie をリクエストとレスポンスの両方に設定する。
 *
 * supabase クライアントと user を返すことで、Middleware 側での
 * 二重 getUser() 呼び出しを防ぎ、Cookie の一貫性を保つ。
 *
 * 重要: getSession() は使用しない。getUser() で JWT 署名をサーバーサイド検証する。
 *
 * @param request Next.js の NextRequest オブジェクト
 * @returns セッション情報を含む NextResponse、user、supabase クライアント
 */
export async function updateSession(
  request: NextRequest
): Promise<UpdateSessionResult> {
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

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // リクエスト側の Cookie を更新（Server Components が最新 Cookie を読めるようにする）
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        // 新しい NextResponse を生成（更新されたリクエスト Cookie を含む）
        supabaseResponse = NextResponse.next({
          request,
        })
        // レスポンス側の Cookie を更新（ブラウザに反映される）
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser() で JWT 署名をサーバーサイド検証し、トークンリフレッシュをトリガーする。
  // getSession() は JWT 再検証を保証しないため使用禁止。
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user, supabase }
}
