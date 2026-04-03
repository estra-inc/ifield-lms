"use client"

import { useState, useCallback, useEffect, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { RotateCcw, ArrowLeft, ArrowRight, Send } from "lucide-react"
import type { QuestionItem, OptionItem } from "@/lib/types/quiz"
import { gradeQuiz, type GradeResult } from "@/lib/quiz/grade-quiz"
import { shuffleOptions } from "@/lib/quiz/shuffle-options"
import { saveQuizLog } from "@/app/(authenticated)/contents/actions-quiz"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface QuizClientProps {
  quiz: {
    id: string
    title: string
    questions: QuestionItem[]
  }
  history: {
    attemptCount: number
    bestScore: number
    bestTotal: number
  } | null
  backPath: string
  genre: string
  nextQuiz: { title: string; path: string; label: string; confirm: string | null } | null
}

/** シャッフル済み選択肢を持つ問題 */
interface ShuffledQuestion extends QuestionItem {
  shuffledOptions: OptionItem[]
}

type QuizPhase = "answering" | "graded"

/**
 * クイズ解答・採点・結果表示 Client Component
 *
 * answering: 出題フェーズ（回答選択）
 * graded: 結果フェーズ（採点結果表示）
 *
 * Requirements: 3.4-3.9, 4.1-4.8, 5.4, 7.2, 7.4
 */
export function QuizClient({
  quiz,
  history,
  backPath,
  nextQuiz,
}: QuizClientProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<QuizPhase>("answering")
  const [answers, setAnswers] = useState<Map<string, string[]>>(new Map())
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showNextConfirm, setShowNextConfirm] = useState(false)

  // 初回はサーバーと一致させるため元の順序で描画し、マウント後にシャッフル
  const [shuffledQuestions, setShuffledQuestions] = useState<ShuffledQuestion[]>(
    () =>
      quiz.questions.map((q) => ({
        ...q,
        shuffledOptions: [...q.options],
      }))
  )

  useEffect(() => {
    setShuffledQuestions(
      quiz.questions.map((q) => ({
        ...q,
        shuffledOptions: shuffleOptions(q.options),
      }))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 全問回答済みかチェック
  const allAnswered = quiz.questions.length > 0 && answers.size >= quiz.questions.length

  // 単一選択のハンドラ
  const handleSingleSelect = useCallback(
    (questionId: string, optionId: string) => {
      setAnswers((prev) => {
        const next = new Map(prev)
        next.set(questionId, [optionId])
        return next
      })
    },
    []
  )

  // 複数選択のハンドラ
  const handleMultipleSelect = useCallback(
    (questionId: string, optionId: string) => {
      setAnswers((prev) => {
        const next = new Map(prev)
        const current = next.get(questionId) ?? []
        if (current.includes(optionId)) {
          const filtered = current.filter((id) => id !== optionId)
          if (filtered.length === 0) {
            next.delete(questionId)
          } else {
            next.set(questionId, filtered)
          }
        } else {
          next.set(questionId, [...current, optionId])
        }
        return next
      })
    },
    []
  )

  // 採点処理
  const handleSubmit = () => {
    const userAnswers = quiz.questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: answers.get(q.id) ?? [],
    }))

    const result = gradeQuiz(quiz.questions, userAnswers)
    setGradeResult(result)
    setPhase("graded")

    // Server Action で履歴保存
    startTransition(async () => {
      try {
        const saveResult = await saveQuizLog({
          quizId: quiz.id,
          score: result.score,
          totalQuestions: result.totalQuestions,
          answers: result.questionResults.map((qr) => ({
            questionId: qr.questionId,
            selectedOptionIds: qr.selectedOptionIds,
            isCorrect: qr.isCorrect,
          })),
        })
        if (!saveResult.success) {
          setSaveError(saveResult.message)
        }
      } catch {
        setSaveError("回答履歴の保存に失敗しました。")
      }
    })
  }

  // リトライ処理
  const handleRetry = () => {
    setPhase("answering")
    setAnswers(new Map())
    setGradeResult(null)
    setSaveError(null)
    // リトライ時のみ再シャッフル
    setShuffledQuestions(
      quiz.questions.map((q) => ({
        ...q,
        shuffledOptions: shuffleOptions(q.options),
      }))
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
      {/* タイトル */}
      <h1 className="font-[family-name:var(--font-primary)] text-[22px] font-bold text-foreground">
        {quiz.title}
      </h1>

      {/* 履歴サマリー（answering フェーズかつ履歴がある場合のみ） */}
      {phase === "answering" && history && (
        <div className="flex gap-6 text-sm font-mono text-muted-foreground">
          <span>
            挑戦回数: <strong className="text-foreground">{history.attemptCount}</strong> 回
          </span>
          <span>
            最高スコア: <strong className="text-foreground">{history.bestScore}/{history.bestTotal}</strong>
          </span>
        </div>
      )}

      {/* 結果サマリー（graded フェーズのみ） */}
      {phase === "graded" && gradeResult && (
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-center space-y-2">
          <p className="font-[family-name:var(--font-primary)] text-lg font-semibold text-foreground">
            結果: {gradeResult.score}/{gradeResult.totalQuestions}
          </p>
          <p className="font-mono text-2xl font-bold text-primary">
            {gradeResult.percentage}%
          </p>
          {saveError && (
            <p className="text-sm text-destructive">{saveError}</p>
          )}
        </div>
      )}

      {/* 問題一覧 */}
      <div className="space-y-8">
        {shuffledQuestions.map((question, index) => {
          const questionResult =
            phase === "graded"
              ? gradeResult?.questionResults.find(
                  (r) => r.questionId === question.id
                )
              : null

          return (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              selectedOptionIds={answers.get(question.id) ?? []}
              onSingleSelect={handleSingleSelect}
              onMultipleSelect={handleMultipleSelect}
              phase={phase}
              questionResult={questionResult ?? null}
            />
          )
        })}
      </div>

      {/* アクションボタン */}
      <div className="flex items-center justify-center gap-4 pt-4">
        {phase === "answering" ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-[family-name:var(--font-primary)] text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-4" />
            回答を送信
          </button>
        ) : (
          <>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-[family-name:var(--font-primary)] text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              <RotateCcw className="size-4" />
              もう一度挑戦する
            </button>
            {nextQuiz && (
              nextQuiz.confirm ? (
                <button
                  onClick={() => setShowNextConfirm(true)}
                  className="flex items-center gap-2 rounded-lg border border-primary px-6 py-3 font-[family-name:var(--font-primary)] text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  {nextQuiz.label}
                  <ArrowRight className="size-4" />
                </button>
              ) : (
                <Link
                  href={nextQuiz.path}
                  className="flex items-center gap-2 rounded-lg border border-primary px-6 py-3 font-[family-name:var(--font-primary)] text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  {nextQuiz.label}
                  <ArrowRight className="size-4" />
                </Link>
              )
            )}
            <Link
              href={backPath}
              className="flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-[family-name:var(--font-primary)] text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
              セクションに戻る
            </Link>
          </>
        )}
      </div>

      {/* チュートリアル・チャプター跨ぎの確認ダイアログ */}
      {nextQuiz?.confirm && (
        <AlertDialog open={showNextConfirm} onOpenChange={setShowNextConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{nextQuiz.label}</AlertDialogTitle>
              <AlertDialogDescription>
                {nextQuiz.confirm}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => router.push(nextQuiz.path)}
              >
                続ける
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

// --- 内部コンポーネント ---

interface QuestionCardProps {
  question: ShuffledQuestion
  index: number
  selectedOptionIds: string[]
  onSingleSelect: (questionId: string, optionId: string) => void
  onMultipleSelect: (questionId: string, optionId: string) => void
  phase: QuizPhase
  questionResult: {
    isCorrect: boolean
    correctOptionIds: string[]
    selectedOptionIds: string[]
  } | null
}

function QuestionCard({
  question,
  index,
  selectedOptionIds,
  onSingleSelect,
  onMultipleSelect,
  phase,
  questionResult,
}: QuestionCardProps) {
  const isMultiple = question.type === "multiple"
  const borderColor =
    phase === "graded" && questionResult
      ? questionResult.isCorrect
        ? "border-[#22C55E]"
        : "border-destructive"
      : "border-border"

  return (
    <div className={`rounded-lg border ${borderColor} p-6 space-y-4`}>
      {/* 設問番号 + 設問文 */}
      <div className="space-y-1">
        <span className="font-mono text-xs font-semibold text-primary">
          Q{index + 1}
        </span>
        <p className="font-[family-name:var(--font-primary)] text-sm font-medium text-foreground">
          {question.text}
          {isMultiple && (
            <span className="ml-2 rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              複数選択
            </span>
          )}
        </p>
      </div>

      {/* 選択肢 */}
      <div className="space-y-2 pl-2">
        {question.shuffledOptions.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id)
          const isCorrectOption =
            questionResult?.correctOptionIds.includes(option.id) ?? false
          const isWrongSelection =
            phase === "graded" && isSelected && !isCorrectOption

          let optionStyle =
            "rounded-lg border border-border px-4 py-3 transition-colors"
          if (phase === "graded") {
            if (isCorrectOption) {
              optionStyle +=
                " border-[#22C55E] bg-[#22C55E]/10 text-foreground"
            } else if (isWrongSelection) {
              optionStyle +=
                " border-destructive bg-destructive/10 text-foreground"
            } else {
              optionStyle += " opacity-60"
            }
          } else if (isSelected) {
            optionStyle += " border-primary bg-primary/5"
          } else {
            optionStyle += " hover:border-primary/50 hover:bg-muted/50"
          }

          const inputId = `${question.id}-${option.id}`

          return (
            <label
              key={option.id}
              htmlFor={inputId}
              className={`flex items-center gap-3 cursor-pointer ${optionStyle} ${
                phase === "graded" ? "pointer-events-none" : ""
              }`}
            >
              {isMultiple ? (
                <input
                  type="checkbox"
                  id={inputId}
                  name={question.id}
                  checked={isSelected}
                  onChange={() =>
                    onMultipleSelect(question.id, option.id)
                  }
                  disabled={phase === "graded"}
                  className="size-4 accent-primary"
                  aria-label={option.text}
                />
              ) : (
                <input
                  type="radio"
                  id={inputId}
                  name={question.id}
                  checked={isSelected}
                  onChange={() =>
                    onSingleSelect(question.id, option.id)
                  }
                  disabled={phase === "graded"}
                  className="size-4 accent-primary"
                  aria-label={option.text}
                />
              )}
              <span className="font-mono text-sm">{option.text}</span>
            </label>
          )
        })}
      </div>

      {/* 結果表示（graded フェーズ） */}
      {phase === "graded" && questionResult && (
        <div className="space-y-2 pt-2">
          {/* 正解/不正解表示 */}
          <p
            className={`font-[family-name:var(--font-primary)] text-sm font-semibold ${
              questionResult.isCorrect
                ? "text-[#22C55E]"
                : "text-destructive"
            }`}
          >
            {questionResult.isCorrect ? "正解" : "不正解"}
          </p>

          {/* 不正解時: 正しい選択肢を表示 */}
          {!questionResult.isCorrect && (
            <p className="font-mono text-xs text-muted-foreground">
              正解:{" "}
              {questionResult.correctOptionIds
                .map((id) => {
                  const opt = question.options.find((o) => o.id === id)
                  return opt?.text ?? id
                })
                .join(", ")}
            </p>
          )}

          {/* 解説 */}
          <div className="rounded bg-muted/50 p-3">
            <p className="font-mono text-xs text-muted-foreground">
              {question.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
