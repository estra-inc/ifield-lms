/**
 * バージョン管理ページのローディング UI（Skeleton）
 */
export default function ContentVersionsLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      {/* ヘッダー */}
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />

      {/* カード2枚 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-lg border border-border bg-card p-5"
          >
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="mt-3 h-6 w-24 rounded bg-muted" />
            <div className="mt-3 h-4 w-40 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* テーブル */}
      <div className="animate-pulse rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="h-5 w-24 rounded bg-muted" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="ml-auto h-8 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
