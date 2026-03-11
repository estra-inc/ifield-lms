import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

/**
 * 認証ページのパス一覧。
 * 認証済みユーザーがアクセスした場合はダッシュボードへリダイレクトする。
 */
export const AUTH_ROUTES = [
  "/auth/login",
  "/auth/reset-password",
  "/auth/invite/error",
]

/**
 * パスワードリセット確認ページ。
 * Supabase がハッシュフラグメントでトークンを返すため、
 * 認証・未認証の両方でアクセスを許可する必要がある。
 * - 未認証: ハッシュフラグメントからクライアントサイドでセッション確立
 * - 認証済み: パスワード変更フォームを表示
 */
const RECOVERY_CONFIRM_ROUTE = "/auth/reset-password/confirm"

/**
 * 招待設定ページのパス。
 * full_name 未設定ユーザーのアクセスを許可する。
 */
export const INVITE_SETUP_ROUTE = "/auth/invite/setup"

/**
 * Next.js Middleware
 *
 * 全リクエストに対して認証状態・招待完了状態を検証し、
 * 適切なルート保護を行う。
 *
 * フロー:
 * 1. updateSession でトークンリフレッシュ + user 取得（単一クライアント）
 * 2. 未認証 → 保護ルートならログインへリダイレクト
 * 3. 認証済み → パスワードリセット確認ページなら通過を許可
 * 4. 認証済み → 認証ページならダッシュボードへリダイレクト
 * 5. profiles テーブルから full_name, graduation_date を取得
 * 6. full_name 未設定 → 招待設定ページへリダイレクト（設定ページ自体は許可）
 * 7. /contents/*, /projects/* パスで graduation_date が過去日付 → ダッシュボードへリダイレクト
 */
export default async function middleware(request: NextRequest) {
  // 1. updateSession でトークンリフレッシュ + user / supabase クライアントを取得
  const { supabaseResponse, user, supabase } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // 認証ページかどうかの判定
  const isAuthRoute =
    AUTH_ROUTES.includes(pathname) || pathname === INVITE_SETUP_ROUTE

  // 2. 未認証ユーザーの処理
  if (!user) {
    // 認証ページへのアクセスは許可
    if (isAuthRoute) {
      return supabaseResponse
    }
    // パスワードリセット確認ページはハッシュフラグメントでトークンが届くため許可
    if (pathname === RECOVERY_CONFIRM_ROUTE) {
      return supabaseResponse
    }
    // 保護ルートへのアクセスはログインページへリダイレクト
    return NextResponse.redirect(new URL("/auth/login", request.nextUrl.origin))
  }

  // 3. 認証済みユーザーがパスワードリセット確認ページにアクセスした場合は許可
  if (pathname === RECOVERY_CONFIRM_ROUTE) {
    return supabaseResponse
  }

  // 4. 認証済みユーザーが認証ページ（ログイン等）にアクセスした場合
  if (AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(
      new URL("/dashboard", request.nextUrl.origin)
    )
  }

  // 5. profiles テーブルから full_name, graduation_date, role を取得
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, graduation_date, role")
    .eq("id", user.id)
    .single()

  // 6. full_name 未設定の場合 → 招待設定ページへリダイレクト
  if (!profile?.full_name) {
    if (pathname === INVITE_SETUP_ROUTE) {
      return supabaseResponse
    }
    return NextResponse.redirect(
      new URL(INVITE_SETUP_ROUTE, request.nextUrl.origin)
    )
  }

  // 7. /contents/*, /projects/* パスで受講期間チェック
  // graduation_date が過去日付の場合はダッシュボードへリダイレクト
  // graduation_date が NULL の場合はアクセスを許可（期間未設定 = 制限なし）
  const isGraduationCheckedPath =
    pathname === "/contents" ||
    pathname.startsWith("/contents/") ||
    pathname === "/projects" ||
    pathname.startsWith("/projects/")

  if (isGraduationCheckedPath && profile.role !== "super_admin") {
    const graduationDate = profile.graduation_date
    if (graduationDate) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const gradDate = new Date(graduationDate + "T00:00:00")
      if (gradDate < today) {
        return NextResponse.redirect(
          new URL("/dashboard", request.nextUrl.origin)
        )
      }
    }
  }

  return supabaseResponse
}

/**
 * Middleware の matcher config。
 * 静的アセットと auth/callback をバイパスする。
 */
export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico (ファビコン)
     * - auth/callback (Supabase Auth コールバック)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|auth/callback|api/admin/sync-curriculums|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
