/**
 * 教材一覧ページのローディング UI（Skeleton）
 */
export default function ContentsLoading() {
  return (
    <div className="p-6 px-8 space-y-6">
      {/* 進捗サマリーカード Skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-lg border border-border bg-card p-5"
          >
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="mt-4 h-8 w-16 rounded bg-muted" />
            <div className="mt-3 h-3 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* タブ行 Skeleton */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex gap-4">
          <div className="h-5 w-12 rounded bg-muted" />
          <div className="h-5 w-16 rounded bg-muted" />
        </div>
        <div className="h-9 w-40 rounded-lg bg-muted" />
      </div>

      {/* カードグリッド Skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-[130px] animate-pulse rounded-lg border border-border bg-card p-5"
          >
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="mt-3 h-3 w-40 rounded bg-muted" />
            <div className="mt-4 h-3 w-20 rounded bg-muted" />
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
