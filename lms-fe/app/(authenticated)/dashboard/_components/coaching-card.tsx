/**
 * CoachingCard
 *
 * コーチングクレジット残高と次回セッション情報を表示するカード。
 * Server Component。
 *
 * Task 4.2
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import Link from "next/link"
import { Calendar, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CoachingData } from "@/lib/types/dashboard"

interface CoachingCardProps {
  data: CoachingData
}

export function CoachingCard({ data }: CoachingCardProps) {
  return (
    <Card className="rounded-none border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-[family-name:var(--font-primary)] text-xs font-semibold tracking-wide text-muted-foreground">
          コーチング
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* クレジット残高 */}
        <div className="flex items-end gap-2">
          <span className="font-[family-name:var(--font-primary)] text-[32px] font-bold text-foreground">
            {data.creditBalance}
          </span>
          <span className="font-[family-name:var(--font-primary)] text-sm text-muted-foreground">
            クレジット残
          </span>
        </div>

        {/* 次回セッション */}
        {data.nextSession ? (
          <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2">
            <Calendar className="size-3.5 text-primary" />
            <span className="font-mono text-xs text-secondary-foreground">
              次回: {data.nextSession.sessionDate} {data.nextSession.startTime} - {data.nextSession.genre}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-sm text-muted-foreground">予約なし</p>
            <Link
              href="/coaching"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              コーチングを予約する
              <ArrowRight className="size-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
