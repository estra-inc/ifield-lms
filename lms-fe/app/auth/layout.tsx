/**
 * 認証ページ共通レイアウト
 *
 * /auth 配下の認証ページ共通レイアウトとして機能する。
 * App Shell（サイドバー/ヘッダー）を含まない独立したレイアウト。
 *
 * Server Component として実装（インタラクション不要）。
 * 各画面は children として渡され、ページ側でカード/中央寄せを処理する。
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
