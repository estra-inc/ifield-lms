import { ResetConfirmForm } from "./reset-confirm-form"

/**
 * パスワードリセット確認ページ (Server Component)
 *
 * Server Component ラッパー。ResetConfirmForm Client Component をレンダリングする。
 * Auth Callback Route Handler でセッション確立後にリダイレクトされる。
 */
export default function ResetPasswordConfirmPage() {
  return <ResetConfirmForm />
}
