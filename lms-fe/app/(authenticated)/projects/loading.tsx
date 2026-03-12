/**
 * 模擬案件一覧ページのローディング UI（Skeleton）
 */
export default function ProjectsLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
      </div>

      {/* カードグリッド */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-[160px] animate-pulse rounded-lg border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 rounded bg-muted" />
              <div className="h-5 w-16 rounded-full bg-muted" />
            </div>
            <div className="mt-3 h-4 w-full rounded bg-muted" />
            <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
            <div className="mt-4 h-2 w-full rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
