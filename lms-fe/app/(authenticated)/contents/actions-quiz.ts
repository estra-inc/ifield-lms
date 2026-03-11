"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { QuizAnswerRecord } from "@/lib/types/quiz"

/**
 * saveQuizLog の入力型
 */
export interface SaveQuizLogInput {
  quizId: string
  score: number
  totalQuestions: number
  answers: QuizAnswerRecord[]
}

/**
 * saveQuizLog の結果型
 */
export interface SaveQuizLogResult {
  success: boolean
  message: string
}

/**
 * saveQuizLog Server Action
 *
 * クイズ採点結果を quiz_logs テーブルに保存する。
 * Task 6.1 で完全実装する（現在はスタブ）。
 *
 * Requirements: 5.1, 5.2
 */
export async function saveQuizLog(
  input: SaveQuizLogInput
): Promise<SaveQuizLogResult> {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // バリデーション
  if (!input.quizId) {
    return {
      success: false,
      message: "クイズIDが指定されていません。",
    }
  }

  if (input.score < 0 || input.score > input.totalQuestions) {
    return {
      success: false,
      message: "スコアが不正です。",
    }
  }

  // quiz_logs に INSERT
  const { error: insertError } = await supabase.from("quiz_logs").insert({
    user_id: user.id,
    quiz_id: input.quizId,
    score: input.score,
    total_questions: input.totalQuestions,
    answers: input.answers,
  })

  if (insertError) {
    console.error("saveQuizLog insert error:", insertError.message)
    return {
      success: false,
      message: "回答履歴の保存に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/contents")
  return {
    success: true,
    message: "回答履歴を保存しました。",
  }
}

/**
 * クイズIDリストに対応する挑戦回数・最高スコア・最新スコアを返す
 */
export type QuizLogSummary = {
  attemptCount: number
  bestScore: number
  latestScore: number
  total: number
}

export async function fetchQuizLogs(
  quizIds: string[]
): Promise<Record<string, QuizLogSummary>> {
  if (quizIds.length === 0) return {}

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return {}

  const { data: logs } = await supabase
    .from("quiz_logs")
    .select("quiz_id, score, total_questions, created_at")
    .eq("user_id", user.id)
    .in("quiz_id", quizIds)
    .order("created_at", { ascending: false })

  const result: Record<string, QuizLogSummary> = {}
  if (logs) {
    for (const log of logs) {
      const existing = result[log.quiz_id]
      if (!existing) {
        result[log.quiz_id] = {
          attemptCount: 1,
          bestScore: log.score,
          latestScore: log.score,
          total: log.total_questions,
        }
      } else {
        existing.attemptCount++
        existing.bestScore = Math.max(existing.bestScore, log.score)
      }
    }
  }

  return result
}
