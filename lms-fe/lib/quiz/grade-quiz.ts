/**
 * クイズ採点ロジック（純粋関数）
 *
 * クライアントサイドでクイズの採点を行い、
 * 各問題の正誤と全体スコアを算出する。
 *
 * Requirements: 4.1, 4.2
 */
import type { QuestionItem } from "@/lib/types/quiz"

/** ユーザーの回答 */
export interface UserAnswer {
  questionId: string
  selectedOptionIds: string[]
}

/** 各問題の採点結果 */
export interface QuestionResult {
  questionId: string
  isCorrect: boolean
  correctOptionIds: string[]
  selectedOptionIds: string[]
}

/** 全体の採点結果 */
export interface GradeResult {
  score: number
  totalQuestions: number
  percentage: number
  questionResults: QuestionResult[]
}

/**
 * クイズを採点する。
 *
 * - 単一選択: ユーザーの選択と正解文字列の完全一致で判定
 * - 複数選択: ユーザーの選択セットと正解セットの完全一致で判定（順序不問）
 *
 * @param questions - 問題配列
 * @param answers - ユーザー回答配列
 * @returns 採点結果
 */
export function gradeQuiz(
  questions: QuestionItem[],
  answers: UserAnswer[]
): GradeResult {
  if (questions.length === 0) {
    return {
      score: 0,
      totalQuestions: 0,
      percentage: 0,
      questionResults: [],
    }
  }

  const answerMap = new Map<string, string[]>()
  for (const answer of answers) {
    answerMap.set(answer.questionId, answer.selectedOptionIds)
  }

  const questionResults: QuestionResult[] = questions.map((question) => {
    const selectedOptionIds = answerMap.get(question.id) ?? []

    // 正解の選択肢IDリストを取得（ソート済み）
    const correctOptionIds = Array.isArray(question.correct)
      ? [...question.correct].sort()
      : [question.correct]

    // 判定
    const isCorrect = isExactMatch(selectedOptionIds, correctOptionIds)

    return {
      questionId: question.id,
      isCorrect,
      correctOptionIds,
      selectedOptionIds,
    }
  })

  const score = questionResults.filter((r) => r.isCorrect).length
  const totalQuestions = questions.length
  const percentage =
    totalQuestions > 0
      ? Math.round((score / totalQuestions) * 1000) / 10
      : 0

  return {
    score,
    totalQuestions,
    percentage,
    questionResults,
  }
}

/**
 * 2つの文字列配列が完全一致するかを判定する（順序不問）。
 */
function isExactMatch(selected: string[], correct: string[]): boolean {
  if (selected.length !== correct.length) {
    return false
  }
  const sortedSelected = [...selected].sort()
  const sortedCorrect = [...correct].sort()
  return sortedSelected.every((val, idx) => val === sortedCorrect[idx])
}
