/**
 * 模擬案件詳細ページのローディング UI（タブ付き Skeleton）
 */
export default function ProjectDetailLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      {/* パンくず */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-20 animate-pulse rounded bg-muted" />
        ))}
      </div>

      {/* タイトル + ステータス */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
      </div>

      {/* タブ行 */}
      <div className="flex gap-4 border-b border-border pb-3">
        {["進捗", "要件", "タスク", "履歴", "評価"].map((_, i) => (
          <div key={i} className="h-5 w-14 animate-pulse rounded bg-muted" />
        ))}
      </div>

      {/* コンテンツ */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
