/**
 * 採点スコア計算ユーティリティ
 *
 * フロントエンド（リアルタイムプレビュー）とサーバーサイド（確定時の再計算）の
 * 両方で使用する共有モジュール。
 *
 * 計算式: (OK 判定された項目の point 合計 / 全項目の point 合計) x 100
 * 小数点以下は四捨五入して整数値を返す。
 */

import type {
  EvaluationCategory,
  EvaluationState,
  CategoryScore,
  ScoreResult,
} from "@/lib/types/grading"
import type { EvaluationItem } from "@/lib/types/database"

/**
 * 旧形式の EvaluationItem[] を新形式の EvaluationCategory[] に変換する
 *
 * 旧形式: { id, category, criteria, weight }（フラット配列）
 * 新形式: { category_large, category_medium, items[] }（階層構造）
 *
 * category -> category_large, criteria -> label, weight -> point にマッピング。
 * category_medium は旧形式に存在しないため「一般」として設定。
 */
export function convertLegacyEvaluationItems(
  items: EvaluationItem[]
): EvaluationCategory[] {
  const categoryMap = new Map<string, EvaluationCategory>()

  for (const item of items) {
    const key = item.category
    const existing = categoryMap.get(key)

    const entry = {
      id: item.id,
      label: item.criteria,
      point: item.weight,
    }

    if (existing) {
      existing.items.push(entry)
    } else {
      categoryMap.set(key, {
        category_large: item.category,
        category_medium: "一般",
        items: [entry],
      })
    }
  }

  return Array.from(categoryMap.values())
}

/**
 * evaluation_items が旧形式（EvaluationItem[]）か新形式（EvaluationCategory[]）かを
 * 判定し、必要に応じて変換して EvaluationCategory[] を返す
 */
export function normalizeEvaluationItems(
  items: unknown[]
): EvaluationCategory[] {
  if (items.length === 0) return []

  const first = items[0] as Record<string, unknown>

  // 新形式: category_large と items プロパティが存在する
  if ("category_large" in first && "items" in first) {
    return items as EvaluationCategory[]
  }

  // 旧形式: category と criteria プロパティが存在する
  if ("category" in first && "criteria" in first) {
    return convertLegacyEvaluationItems(items as EvaluationItem[])
  }

  return []
}

/**
 * 階層型チェックリストの評価結果からスコアを計算する
 *
 * @param categories - 評価項目カテゴリの配列（PRD 準拠の階層構造）
 * @param evaluations - 各項目の評価状態（item.id -> boolean）
 * @returns スコア計算結果（全体スコア、大項目別スコア、集計値）
 */
export function calculateScore(
  categories: EvaluationCategory[],
  evaluations: EvaluationState
): ScoreResult {
  // category_large ごとに集計するための Map
  const categoryMap = new Map<
    string,
    {
      okCount: number
      totalCount: number
      earnedPoints: number
      totalPoints: number
    }
  >()

  for (const category of categories) {
    const key = category.category_large
    const existing = categoryMap.get(key) ?? {
      okCount: 0,
      totalCount: 0,
      earnedPoints: 0,
      totalPoints: 0,
    }

    for (const item of category.items) {
      const isOk = evaluations[item.id] === true
      existing.totalCount += 1
      existing.totalPoints += item.point
      if (isOk) {
        existing.okCount += 1
        existing.earnedPoints += item.point
      }
    }

    categoryMap.set(key, existing)
  }

  // 大項目別スコアを生成
  const categoryScores: CategoryScore[] = []
  let totalOkCount = 0
  let totalItemCount = 0
  let totalEarnedPoints = 0
  let totalMaxPoints = 0

  for (const [categoryLarge, data] of categoryMap) {
    const percentage =
      data.totalPoints > 0
        ? Math.round((data.earnedPoints / data.totalPoints) * 100)
        : 0

    categoryScores.push({
      categoryLarge,
      okCount: data.okCount,
      totalCount: data.totalCount,
      earnedPoints: data.earnedPoints,
      totalPoints: data.totalPoints,
      percentage,
    })

    totalOkCount += data.okCount
    totalItemCount += data.totalCount
    totalEarnedPoints += data.earnedPoints
    totalMaxPoints += data.totalPoints
  }

  const totalScore =
    totalMaxPoints > 0
      ? Math.round((totalEarnedPoints / totalMaxPoints) * 100)
      : 0

  return {
    totalScore,
    categoryScores,
    totalOkCount,
    totalItemCount,
    totalEarnedPoints,
    totalMaxPoints,
  }
}
