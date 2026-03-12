/**
 * コーチング管理ページのローディング UI（Skeleton）
 */
export default function AdminCoachingLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
        </div>
      </div>

      {/* テーブル */}
      <div className="animate-pulse rounded-lg border border-border bg-card">
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-20 rounded bg-muted" />
              <div className="ml-auto h-5 w-16 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
