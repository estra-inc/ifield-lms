/**
 * クイズ関連の型定義
 *
 * quizzes.questions (JSONB) と quiz_logs.answers (JSONB) の型、
 * およびクイズ機能全体で使用する共通型を定義する。
 */

/** 選択肢 */
export interface OptionItem {
  id: string
  text: string
}

/** 問題データ */
export interface QuestionItem {
  id: string
  type: "single" | "multiple"
  text: string
  options: OptionItem[]
  correct: string | string[]
  explanation: string
}

/** quiz_logs.answers カラムの各レコード */
export interface QuizAnswerRecord {
  questionId: string
  selectedOptionIds: string[]
  isCorrect: boolean
}
