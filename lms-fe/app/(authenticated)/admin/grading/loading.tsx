/**
 * 採点一覧ページのローディング UI（Skeleton）
 */
export default function GradingListLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
      </div>

      {/* カード一覧 */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex animate-pulse items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            <div className="h-5 w-16 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="h-3 w-32 rounded bg-muted" />
            </div>
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-8 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
