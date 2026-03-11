/**
 * クイズページのローディング UI（Skeleton）
 *
 * Requirements: 7.3
 */
export default function QuizLoading() {
  return (
    <div>
      {/* パンくず Skeleton */}
      <div className="flex gap-2 px-8 py-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 w-20 animate-pulse rounded bg-muted" />
        ))}
      </div>

      {/* クイズコンテンツ Skeleton */}
      <div className="px-8 pb-10">
        <div className="rounded-lg border border-border bg-card p-8 space-y-8">
          {/* タイトル Skeleton */}
          <div className="h-8 w-72 animate-pulse rounded bg-muted" />

          {/* 履歴サマリー Skeleton */}
          <div className="flex gap-4">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </div>

          {/* 問題 Skeleton (3問分) */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4">
              {/* 設問番号 + 設問文 */}
              <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              <div className="h-5 w-full animate-pulse rounded bg-muted" />

              {/* 選択肢 */}
              <div className="space-y-2 pl-4">
                {[1, 2, 3, 4].map((j) => (
                  <div
                    key={j}
                    className="h-10 w-full animate-pulse rounded bg-muted"
                  />
                ))}
              </div>
            </div>
          ))}

          {/* 送信ボタン Skeleton */}
          <div className="flex justify-center pt-4">
            <div className="h-12 w-40 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}
