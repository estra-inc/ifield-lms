"use client"

/**
 * ダッシュボード エラーバウンダリ
 *
 * Task 6.2
 * 全クエリ失敗時にエラーバウンダリを表示し、リトライを提供する。
 */

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <AlertTriangle className="size-12 text-destructive" />
      <div className="text-center">
        <h2 className="font-[family-name:var(--font-primary)] text-xl font-bold tracking-tight text-foreground">
          データの取得に失敗しました
        </h2>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          ダッシュボードの表示中にエラーが発生しました。しばらく経ってから再度お試しください。
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-none border border-primary bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        再試行
      </button>
    </div>
  )
}
