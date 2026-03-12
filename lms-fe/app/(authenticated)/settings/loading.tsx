/**
 * 設定ページのローディング UI（タブ付き Skeleton）
 */
export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 md:px-8">
      {/* ヘッダー */}
      <div className="flex flex-col gap-1">
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      </div>

      {/* タブ行 */}
      <div className="flex gap-4 border-b border-border pb-3">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      </div>

      {/* タブコンテンツ */}
      <div className="mt-2 max-w-2xl space-y-6">
        {/* アバター行 */}
        <div className="flex items-center gap-4">
          <div className="size-16 animate-pulse rounded-full bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        </div>

        {/* フォームフィールド */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          </div>
        ))}

        {/* 保存ボタン */}
        <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  )
}
