/**
 * ユーザー進捗詳細ページ（Admin）のローディング UI（Skeleton）
 */
export default function AdminUserProgressLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      {/* 戻るリンク */}
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />

      {/* ヘッダー */}
      <div className="h-7 w-40 animate-pulse rounded bg-muted" />

      {/* チュートリアルセクション */}
      {[1, 2, 3].map((t) => (
        <div
          key={t}
          className="animate-pulse rounded-lg border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-muted" />
          <div className="mt-4 space-y-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center justify-between py-1">
                <div className="h-4 w-56 rounded bg-muted" />
                <div className="h-4 w-28 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
