/**
 * 教材詳細ページのローディング UI（Skeleton）
 */
export default function ContentDetailLoading() {
  return (
    <div>
      {/* パンくず Skeleton */}
      <div className="flex gap-2 px-8 py-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-20 animate-pulse rounded bg-muted" />
        ))}
      </div>

      {/* メインレイアウト */}
      <div className="flex gap-0 px-8 pb-10">
        {/* サイドバー Skeleton */}
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

        {/* メインコンテンツ Skeleton */}
        <div className="flex-1 space-y-6 pl-8 pt-6">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
