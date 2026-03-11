import { Suspense } from "react"
import { LoginForm } from "./login-form"

/**
 * ログインページ (Server Component)
 *
 * Server Component ラッパー。LoginForm Client Component をレンダリングする。
 * Suspense で LoginForm を囲み useSearchParams の SSR 境界を提供する。
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
