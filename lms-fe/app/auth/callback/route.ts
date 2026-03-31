import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Auth コールバック Route Handler
 *
 * Supabase Auth のコールバック（招待 URL、パスワードリセット）を処理する。
 * URL パラメータの `type` で処理を分岐する。
 *
 * - type=invite: token_hash をセットアップページに引き継ぐ（verifyOtp はセットアップ完了時に実行）
 *   セットアップ完了前にブラウザを閉じても再度リンクからやり直せるようにする
 * - type=recovery: PKCE code または token_hash でセッション確立
 * - code パラメータのみ（type なし）: PKCE フローとして処理
 * - 不正な type: ログインページへリダイレクト
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const origin = new URL(request.url).origin

  const supabase = await createClient()

  // PKCE code が存在する場合は exchangeCodeForSession で処理
  // (Supabase が redirect_to にクエリパラメータを付与する際、type が失われることがある)
  if (code) {
    return handleCodeExchange(supabase, code, type, origin)
  }

  if (type === "invite") {
    return handleInviteCallback(supabase, searchParams, origin)
  }

  if (type === "recovery") {
    return handleRecoveryCallback(supabase, tokenHash, origin)
  }

  return NextResponse.redirect(new URL("/auth/login", origin))
}

/**
 * 招待コールバック処理
 *
 * トークンを消費せず、token_hash をセットアップページに引き継ぐ。
 * セットアップフォーム送信時に verifyOtp を実行することで、
 * ブラウザを閉じても再度リンクからやり直せるようにする。
 */
async function handleInviteCallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  searchParams: URLSearchParams,
  origin: string
) {
  const tokenHash = searchParams.get("token_hash")

  if (!tokenHash) {
    return NextResponse.redirect(new URL("/auth/invite/error", origin))
  }

  // 既にセットアップ完了済みの場合はダッシュボードへ（verifyOtp は呼ばない）
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()

    if (profile?.full_name) {
      return NextResponse.redirect(new URL("/dashboard", origin))
    }
  }

  // token_hash をセットアップページに引き継ぐ（ここでは verifyOtp を呼ばない）
  const setupUrl = new URL("/auth/invite/setup", origin)
  setupUrl.searchParams.set("token_hash", tokenHash)
  return NextResponse.redirect(setupUrl)
}

/**
 * PKCE code 交換処理
 *
 * exchangeCodeForSession で PKCE コードをセッションに交換する。
 * type パラメータに基づきリダイレクト先を決定する。
 */
async function handleCodeExchange(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code: string,
  type: string | null,
  origin: string
) {
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL("/auth/login?error=recovery-failed", origin)
    )
  }

  // recovery の場合はパスワードリセット確認ページへ
  if (type === "recovery") {
    return NextResponse.redirect(
      new URL("/auth/reset-password/confirm", origin)
    )
  }

  // invite の場合は full_name の有無で分岐
  if (type === "invite") {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
      if (!profile?.full_name) {
        return NextResponse.redirect(new URL("/auth/invite/setup", origin))
      }
    }
    return NextResponse.redirect(new URL("/dashboard", origin))
  }

  // type なしの code 交換（recovery として扱う）
  return NextResponse.redirect(
    new URL("/auth/reset-password/confirm", origin)
  )
}

/**
 * パスワードリセットコールバック処理（token_hash フォールバック）
 *
 * PKCE code がない場合に token_hash で verifyOtp を試みる。
 */
async function handleRecoveryCallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tokenHash: string | null,
  origin: string
) {
  if (!tokenHash) {
    return NextResponse.redirect(
      new URL("/auth/login?error=invalid-recovery-link", origin)
    )
  }

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  })

  if (error) {
    return NextResponse.redirect(
      new URL("/auth/login?error=recovery-failed", origin)
    )
  }

  return NextResponse.redirect(
    new URL("/auth/reset-password/confirm", origin)
  )
}
