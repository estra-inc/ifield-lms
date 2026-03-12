/**
 * コーチング予約ページのローディング UI（タブ付き Skeleton）
 */
export default function CoachingLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
      </div>

      {/* タブ行 */}
      <div className="flex gap-4 border-b border-border pb-3">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      </div>

      {/* コンテンツ */}
      <div className="space-y-4">
        {/* 残高カード */}
        <div className="h-[80px] animate-pulse rounded-lg border border-border bg-card p-4">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="mt-3 h-6 w-16 rounded bg-muted" />
        </div>

        {/* カレンダー風 Skeleton */}
        <div className="h-[320px] animate-pulse rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 rounded bg-muted" />
            <div className="flex gap-2">
              <div className="size-8 rounded bg-muted" />
              <div className="size-8 rounded bg-muted" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
