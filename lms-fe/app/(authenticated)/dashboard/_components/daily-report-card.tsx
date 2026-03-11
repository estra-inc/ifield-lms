/**
 * DailyReportCard
 *
 * 今日の日報の入力状況を表示するカード。
 * 入力済みの場合は学習時間と内容サマリー、未入力の場合はCTAを表示。
 * Server Component。
 *
 * Task 4.1
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import Link from "next/link"
import { FileText, ArrowRight, Pencil } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DailyReportStatus } from "@/lib/types/dashboard"

interface DailyReportCardProps {
  status: DailyReportStatus
}

export function DailyReportCard({ status }: DailyReportCardProps) {
  return (
    <Card className="rounded-none border-border shadow-none">
      <CardHeader>
        <CardTitle className="font-[family-name:var(--font-primary)] text-base tracking-tight">
          今日の日報
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status.type === "entered" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span className="font-mono text-sm font-semibold text-foreground">
                {status.totalHours}h
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                学習済み
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {status.entries.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 font-mono text-xs text-muted-foreground"
                >
                  <span className="text-foreground">{entry.actualHours}h</span>
                  <span>{entry.content}</span>
                </div>
              ))}
            </div>
            <Link
              href="/reports"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              日報一覧を見る
              <ArrowRight className="size-3" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <FileText className="size-8 text-muted-foreground/50" />
            <p className="font-[family-name:var(--font-primary)] text-sm text-muted-foreground">
              今日の日報を入力しましょう
            </p>
            <Link
              href="/reports"
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Pencil className="size-3.5" />
              日報を入力する
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
