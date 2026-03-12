/**
 * チャプター詳細ページのローディング UI（Skeleton）
 */
export default function ChapterLoading() {
  return (
    <div>
      {/* パンくず */}
      <div className="flex gap-2 px-8 py-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-20 animate-pulse rounded bg-muted" />
        ))}
      </div>

      <div className="flex gap-0 px-8 pb-10">
        {/* サイドバー */}
        <div className="w-60 shrink-0 pt-6">
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="mt-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-8 w-full animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 space-y-4 pl-8 pt-6">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-12 w-full animate-pulse rounded-lg border border-border bg-card"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
