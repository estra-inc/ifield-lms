"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { BookOpen, ChevronRight, ArrowRight, Trophy, Loader2 } from "lucide-react"
import {
  fetchQuizLogs,
  type QuizLogSummary,
} from "@/app/(authenticated)/contents/actions-quiz"

type QuizItem = {
  id: string
  slug: string
  title: string
  genre: string
  tutorial: string
  chapter: string
  section: string
}

type GroupedSection = {
  section: string
  sectionTitle: string
  quizzes: QuizItem[]
}

type GroupedChapter = {
  chapter: string
  chapterTitle: string
  sections: GroupedSection[]
}

export type GroupedTutorial = {
  tutorial: string
  tutorialTitle: string
  chapters: GroupedChapter[]
  quizIds: string[]
}

interface QuizListClientProps {
  grouped: GroupedTutorial[]
}

export function QuizListClient({ grouped }: QuizListClientProps) {
  const [openTutorials, setOpenTutorials] = useState<Set<string>>(new Set())
  const [logsCache, setLogsCache] = useState<
    Record<string, Record<string, QuizLogSummary>>
  >({})
  const [loadingTutorials, setLoadingTutorials] = useState<Set<string>>(
    new Set()
  )

  const toggleTutorial = useCallback(
    async (tutorialSlug: string, quizIds: string[]) => {
      setOpenTutorials((prev) => {
        const next = new Set(prev)
        if (next.has(tutorialSlug)) {
          next.delete(tutorialSlug)
          return next
        }
        next.add(tutorialSlug)
        return next
      })

      // 既にキャッシュ済みならスキップ
      if (logsCache[tutorialSlug]) return

      setLoadingTutorials((prev) => new Set(prev).add(tutorialSlug))
      try {
        const logs = await fetchQuizLogs(quizIds)
        setLogsCache((prev) => ({ ...prev, [tutorialSlug]: logs }))
      } finally {
        setLoadingTutorials((prev) => {
          const next = new Set(prev)
          next.delete(tutorialSlug)
          return next
        })
      }
    },
    [logsCache]
  )

  return (
    <div className="space-y-2">
      {grouped.map((tGroup) => {
        const isOpen = openTutorials.has(tGroup.tutorial)
        const isLoading = loadingTutorials.has(tGroup.tutorial)
        const logs = logsCache[tGroup.tutorial] ?? {}

        return (
          <div
            key={tGroup.tutorial}
            className="rounded-lg border border-border bg-card"
          >
            {/* チュートリアルヘッダー */}
            <button
              onClick={() =>
                toggleTutorial(tGroup.tutorial, tGroup.quizIds)
              }
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left font-[family-name:var(--font-primary)] text-sm font-semibold text-foreground select-none"
            >
              <ChevronRight
                className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
              <span className="font-mono text-xs text-muted-foreground">
                {tGroup.tutorial}:
              </span>
              {tGroup.tutorialTitle}
              {isLoading && (
                <Loader2 className="ml-auto size-3.5 shrink-0 animate-spin text-muted-foreground" />
              )}
            </button>

            {/* 展開コンテンツ */}
            {isOpen && (
              <div className="space-y-1 pb-2 pl-4 pr-2">
                {tGroup.chapters.map((cGroup) => (
                  <ChapterGroup
                    key={cGroup.chapter}
                    cGroup={cGroup}
                    logs={logs}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ChapterGroup({
  cGroup,
  logs,
}: {
  cGroup: GroupedChapter
  logs: Record<string, QuizLogSummary>
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="rounded-md">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-[family-name:var(--font-primary)] text-sm font-medium text-foreground select-none"
      >
        <ChevronRight
          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        <span className="font-mono text-xs text-muted-foreground">
          {cGroup.chapter}:
        </span>
        {cGroup.chapterTitle}
      </button>

      {isOpen && (
        <div className="space-y-3 py-1 pl-6 pr-1">
          {cGroup.sections.map((sGroup) => (
            <div key={sGroup.section}>
              <div className="mb-1 flex items-center gap-1.5 px-2">
                <span className="text-xs text-muted-foreground">■</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {sGroup.section}:
                </span>
                <span className="text-xs font-medium text-foreground">
                  {sGroup.sectionTitle}
                </span>
              </div>

              <div className="space-y-1.5">
                {sGroup.quizzes.map((quiz) => {
                  const log = logs[quiz.id]
                  const isPerfect =
                    log !== undefined && log.bestScore === log.total
                  const quizPath = `/contents/${quiz.tutorial}/${quiz.chapter}/${quiz.section}/quiz?genre=${quiz.genre}&slug=${quiz.slug}`

                  return (
                    <Link
                      key={quiz.id}
                      href={quizPath}
                      className={`group/quiz flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors hover:border-primary/50 hover:bg-primary/5 ${isPerfect ? "border-[#F3C116]/40 bg-[#F3C116]/5" : "border-border bg-card"}`}
                    >
                      {isPerfect ? (
                        <Trophy className="size-4 shrink-0 text-[#F3C116]" />
                      ) : (
                        <BookOpen className="size-4 shrink-0 text-primary" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground group-hover/quiz:text-primary">
                        {quiz.title}
                      </span>
                      <div className="flex shrink-0 items-center gap-3 text-xs">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground/70">
                            挑戦
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {log ? `${log.attemptCount}回` : "--"}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground/70">
                            最高
                          </span>
                          <span
                            className={`font-mono ${isPerfect ? "font-semibold text-[#F3C116]" : "text-muted-foreground"}`}
                          >
                            {log
                              ? `${log.bestScore}/${log.total}`
                              : "--"}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground/70">
                            最新
                          </span>
                          <span className="font-mono text-muted-foreground">
                            {log
                              ? `${log.latestScore}/${log.total}`
                              : "--"}
                          </span>
                        </div>
                        <ArrowRight className="size-3.5 text-muted-foreground/50 transition-transform group-hover/quiz:translate-x-0.5 group-hover/quiz:text-primary" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
