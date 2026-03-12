/**
 * バージョン詳細ページのローディング UI（タブ付き Skeleton）
 */
export default function ContentVersionDetailLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      {/* 戻るリンク */}
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />

      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
      </div>

      {/* メタ情報 */}
      <div className="flex gap-6">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </div>

      {/* タブ行 */}
      <div className="flex gap-4 border-b border-border pb-3">
        <div className="h-5 w-14 animate-pulse rounded bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      </div>

      {/* テーブル Skeleton */}
      <div className="animate-pulse rounded-lg border border-border bg-card">
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-5 w-12 rounded-full bg-muted" />
              <div className="h-4 w-64 rounded bg-muted" />
              <div className="ml-auto h-4 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
