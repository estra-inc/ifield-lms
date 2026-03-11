import { InviteSetupForm } from "./invite-setup-form"

/**
 * 招待登録ページ (Server Component)
 *
 * Server Component ラッパー。InviteSetupForm Client Component をレンダリングする。
 * Middleware が未認証ユーザーのアクセスをブロック。
 * 認証済み + full_name 設定済みの場合は /dashboard へリダイレクト。
 */
export default function InviteSetupPage() {
  return <InviteSetupForm />
}
