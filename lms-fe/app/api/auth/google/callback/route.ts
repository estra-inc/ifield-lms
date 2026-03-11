import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createCipheriv, randomBytes } from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * リフレッシュトークンを AES-256-GCM で暗号化する。
 *
 * @param plaintext 暗号化対象のテキスト
 * @param keyHex 環境変数から取得する 64 文字の hex 文字列 (32 バイト)
 * @returns "iv:authTag:ciphertext" 形式の暗号化文字列 (hex エンコード)
 */
function encryptToken(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex")
  const iv = randomBytes(12) // GCM 推奨 IV サイズ: 12 バイト (96 bit)
  const cipher = createCipheriv("aes-256-gcm", key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag().toString("hex")

  // "iv:authTag:ciphertext" 形式で返却
  return `${iv.toString("hex")}:${authTag}:${encrypted}`
}

/**
 * Google OAuth Callback API Route (GET)
 *
 * Google OAuth 認可フロー完了後のコールバックを処理する。
 *
 * 1. クエリパラメータから code と state を取得
 * 2. Cookie に保存した state と照合し CSRF を検証
 * 3. 認可コードをアクセストークン + リフレッシュトークンに交換
 * 4. リフレッシュトークンを AES-256-GCM で暗号化
 * 5. system_integrations テーブルに暗号化トークンと connected_at を保存
 * 6. /settings へリダイレクト（成功時）、または /settings?error=... へリダイレクト（失敗時）
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const baseUrl = request.nextUrl.origin

  // --- state / code パラメータの検証 ---
  if (!code || !state) {
    console.error("Google OAuth callback: Missing code or state parameter")
    return NextResponse.redirect(
      `${baseUrl}/settings?error=missing_params`
    )
  }

  // --- CSRF 検証: Cookie の state と一致するか確認 ---
  const cookieStore = await cookies()
  const storedState = cookieStore.get("google_oauth_state")?.value

  if (!storedState || storedState !== state) {
    console.error("Google OAuth callback: State mismatch (CSRF protection)")
    cookieStore.delete("google_oauth_state")
    return NextResponse.redirect(
      `${baseUrl}/settings?error=invalid_state`
    )
  }

  // state Cookie をクリーンアップ
  cookieStore.delete("google_oauth_state")

  // --- Super Admin 権限確認 ---
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(
      `${baseUrl}/settings?error=unauthenticated`
    )
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "super_admin") {
    return NextResponse.redirect(
      `${baseUrl}/settings?error=unauthorized`
    )
  }

  // --- 環境変数の取得 ---
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  const encryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY

  if (!clientId || !clientSecret || !redirectUri || !encryptionKey) {
    console.error("Google OAuth callback: Missing environment variables")
    return NextResponse.redirect(
      `${baseUrl}/settings?error=config_error`
    )
  }

  // --- 認可コードをトークンに交換 ---
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error("Google OAuth token exchange failed:", errorBody)
      return NextResponse.redirect(
        `${baseUrl}/settings?error=token_exchange_failed`
      )
    }

    const tokenData = await tokenResponse.json()
    const refreshToken = tokenData.refresh_token

    if (!refreshToken) {
      console.error("Google OAuth callback: No refresh_token in response")
      return NextResponse.redirect(
        `${baseUrl}/settings?error=no_refresh_token`
      )
    }

    // --- リフレッシュトークンを暗号化 ---
    const encrypted_refresh_token = encryptToken(refreshToken, encryptionKey)

    // --- system_integrations テーブルに保存 ---
    const adminClient = createAdminClient()
    const { error: dbError } = await adminClient
      .from("system_integrations")
      .update({
        encrypted_refresh_token,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("service_name", "google_calendar")

    if (dbError) {
      console.error("Google OAuth callback: DB update failed:", dbError.message)
      return NextResponse.redirect(
        `${baseUrl}/settings?error=db_error`
      )
    }

    // --- 成功: /settings へリダイレクト ---
    return NextResponse.redirect(`${baseUrl}/settings`)
  } catch (error) {
    console.error("Google OAuth callback: Unexpected error:", error)
    return NextResponse.redirect(
      `${baseUrl}/settings?error=unexpected_error`
    )
  }
}
