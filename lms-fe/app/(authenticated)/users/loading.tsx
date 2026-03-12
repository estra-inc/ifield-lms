/**
 * ユーザー一覧ページ（Manager）のローディング UI（Skeleton）
 */
export default function ManagerUsersLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      {/* ヘッダー */}
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[90px] animate-pulse rounded-lg border border-border bg-card p-4"
          >
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="mt-3 h-7 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* 検索 */}
      <div className="h-10 w-64 animate-pulse rounded-md bg-muted" />

      {/* テーブル */}
      <div className="animate-pulse rounded-lg border border-border bg-card">
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="size-8 rounded-full bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="ml-auto h-5 w-16 rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
