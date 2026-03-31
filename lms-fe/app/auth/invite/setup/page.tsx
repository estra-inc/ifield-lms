import { InviteSetupForm } from "./invite-setup-form"

/**
 * 招待登録ページ (Server Component)
 *
 * Server Component ラッパー。InviteSetupForm Client Component をレンダリングする。
 * URL の token_hash をフォームに引き継ぐ。
 *
 * - token_hash あり: 招待リンクからの遷移（未認証）
 * - token_hash なし: Middleware 経由のリダイレクト（既存セッションあり）
 */
export default async function InviteSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>
}) {
  const { token_hash } = await searchParams
  return <InviteSetupForm tokenHash={token_hash} />
}
