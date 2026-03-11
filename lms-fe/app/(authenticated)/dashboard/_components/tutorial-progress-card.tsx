/**
 * TutorialProgressCard
 *
 * チュートリアルごとの教材完了率をプログレスバー一覧で表示するカード。
 * Server Component。
 *
 * Task 3.2
 * Requirements: 3.1, 3.3, 3.4, 3.5
 */

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { TutorialProgressItem } from "@/lib/types/dashboard"

interface TutorialProgressCardProps {
  items: TutorialProgressItem[]
  defaultGenre: string | null
  progressHref?: string
}

export function TutorialProgressCard({
  items,
  defaultGenre,
  progressHref = "/contents/progress",
}: TutorialProgressCardProps) {
  return (
    <Card className="border-border shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-[family-name:var(--font-primary)] text-base tracking-tight">
          教材進捗
        </CardTitle>
        {items.length > 0 && (
          <Link
            href={progressHref}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            すべて見る
            <ArrowRight className="size-3" />
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {defaultGenre === null ? (
          <p className="font-mono text-sm text-muted-foreground">
            ジャンルが設定されていません
          </p>
        ) : items.length === 0 ? (
          <p className="font-mono text-sm text-muted-foreground">教材なし</p>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.tutorialSlug} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/contents/${item.tutorialSlug}?genre=${item.genre}`}
                    className="font-[family-name:var(--font-primary)] text-sm font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {item.tutorialTitle}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.completedSections} / {item.totalSections} セクション
                  </span>
                </div>
                <Progress value={item.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
