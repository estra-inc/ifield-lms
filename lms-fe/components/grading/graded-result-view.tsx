"use client"

import { useMemo } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CheckCircle2, XCircle, Clock, Loader2, AlertTriangle } from "lucide-react"

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i

function isVideoUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname
    return VIDEO_EXTENSIONS.test(pathname)
  } catch {
    return VIDEO_EXTENSIONS.test(url)
  }
}
import { calculateScore } from "@/lib/utils/grading"
import type { EvaluationCategory, EvaluationState } from "@/lib/types/grading"

export interface GradedResultViewProps {
  status: "submitted" | "grading" | "graded" | "rejected"
  score: number | null
  feedbackComment: string | null
  categories: EvaluationCategory[]
  evaluations: EvaluationState
}

export function GradedResultView({
  status,
  score,
  feedbackComment,
  categories,
  evaluations,
}: GradedResultViewProps) {
  // 未採点/採点中の場合はメッセージ表示
  if (status === "submitted") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="mb-3 h-10 w-10 text-amber-500" />
          <p className="text-lg font-medium text-muted-foreground">
            採点待ち
          </p>
          <p className="mt-1 text-sm text-muted-foreground/80">
            提出物は受理されました。採点完了までお待ちください。
          </p>
        </CardContent>
      </Card>
    )
  }

  if (status === "grading") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="mb-3 h-10 w-10 text-blue-500 animate-spin" />
          <p className="text-lg font-medium text-muted-foreground">
            採点中
          </p>
          <p className="mt-1 text-sm text-muted-foreground/80">
            現在採点作業中です。完了までしばらくお待ちください。
          </p>
        </CardContent>
      </Card>
    )
  }

  // graded / rejected 状態: 採点結果表示
  const isRejected = status === "rejected"
  const scoreResult = calculateScore(categories, evaluations)

  // 大項目ごとにカテゴリをグループ化
  const groupedCategories = new Map<string, EvaluationCategory[]>()
  for (const cat of categories) {
    const existing = groupedCategories.get(cat.category_large) ?? []
    existing.push(cat)
    groupedCategories.set(cat.category_large, existing)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 差し戻しアラート */}
      {isRejected && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              この提出は差し戻されました。以下の採点結果を参考に修正し、再提出してください。
            </p>
          </CardContent>
        </Card>
      )}

      {/* スコア表示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">採点結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums">
              {score ?? scoreResult.totalScore}%
            </span>
            <span className="text-sm text-muted-foreground">
              ({scoreResult.totalOkCount} / {scoreResult.totalItemCount} 項目)
            </span>
          </div>

          {/* 大項目別スコア */}
          {scoreResult.categoryScores.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {scoreResult.categoryScores.map((cs) => (
                <Badge
                  key={cs.categoryLarge}
                  variant="outline"
                  className="text-xs"
                >
                  {cs.categoryLarge}: {cs.okCount}/{cs.totalCount} (
                  {cs.percentage}%)
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* フィードバックコメント */}
      {feedbackComment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">フィードバック</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose-contents prose-contents-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ src, alt, ...props }) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={alt ?? ""}
                      className="my-2 max-w-full rounded"
                      {...props}
                    />
                  ),
                  a: ({ href, children, ...props }) => {
                    if (href && isVideoUrl(href)) {
                      return (
                        <video
                          src={href}
                          controls
                          className="my-2 max-w-[50%] rounded"
                        >
                          <track kind="captions" />
                        </video>
                      )
                    }
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                        {children}
                      </a>
                    )
                  },
                }}
              >
                {feedbackComment}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 詳細チェックリスト（読み取り専用） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">評価詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion
            type="multiple"
            defaultValue={Array.from(groupedCategories.keys())}
          >
            {Array.from(groupedCategories.entries()).map(
              ([largeCat, mediumCats]) => {
                const catScore = scoreResult.categoryScores.find(
                  (cs) => cs.categoryLarge === largeCat
                )

                return (
                  <AccordionItem key={largeCat} value={largeCat}>
                    <AccordionTrigger className="text-base font-semibold">
                      <div className="flex items-center gap-3">
                        <span>{largeCat}</span>
                        {catScore && (
                          <Badge variant="secondary" className="text-xs">
                            {catScore.okCount} / {catScore.totalCount} (
                            {catScore.percentage}%)
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-4 pl-2">
                        {mediumCats.map((medCat) => (
                          <div key={`${largeCat}-${medCat.category_medium}`}>
                            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                              {medCat.category_medium}
                            </h4>
                            <div className="flex flex-col gap-1.5 pl-2">
                              {medCat.items.map((item) => {
                                const isOk = evaluations[item.id] === true
                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-3 px-2 py-1"
                                  >
                                    {isOk ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                                    )}
                                    <span className="text-sm flex-1">
                                      {item.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                      {item.point}pt
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              }
            )}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
