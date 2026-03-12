/**
 * ダッシュボードのローディング UI（Skeleton）
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* ヘッダー */}
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      {/* 上段カード 3列 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[160px] animate-pulse rounded-lg border border-border bg-card p-5"
          >
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-4 h-8 w-20 rounded bg-muted" />
            <div className="mt-3 h-2 w-full rounded-full bg-muted" />
            <div className="mt-3 h-3 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* 下段 2:1 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="h-[280px] animate-pulse rounded-lg border border-border bg-card p-5">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="mt-2 h-2 w-full rounded-full bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[80px] animate-pulse rounded-lg border border-border bg-card p-4"
            >
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-3 h-4 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
