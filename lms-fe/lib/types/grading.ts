/**
 * 模擬案件 採点関連の型定義
 *
 * PRD 準拠の階層型評価項目構造と採点結果の型を定義する。
 * 旧 EvaluationItem 型（{ id, category, criteria, weight }）を置き換える。
 */

/**
 * 評価項目の小項目エントリ
 * evaluation_items JSON 内の個別チェック項目
 */
export interface EvaluationItemEntry {
  id: string
  label: string
  point: number
}

/**
 * PRD 準拠の評価項目カテゴリ（階層構造）
 * category_large > category_medium > items の3層構造
 */
export interface EvaluationCategory {
  category_large: string
  category_medium: string
  items: EvaluationItemEntry[]
}

/**
 * チェック状態を表す Record 型
 * key: item.id, value: true=OK, false=NG
 * key が存在しない場合は「未評価」として扱い、NG と同等にスコア計算する
 */
export type EvaluationState = Record<string, boolean>

/**
 * 大項目（category_large）ごとのスコア集計結果
 */
export interface CategoryScore {
  categoryLarge: string
  okCount: number
  totalCount: number
  earnedPoints: number
  totalPoints: number
  /** 達成率（0-100, 整数, 四捨五入） */
  percentage: number
}

/**
 * 採点確定時に project_submissions.result_data に保存する構造
 */
export interface GradingResultData {
  evaluations: Record<string, boolean>
  categoryScores: {
    categoryLarge: string
    earnedPoints: number
    totalPoints: number
    percentage: number
  }[]
}

/**
 * calculateScore の戻り値型
 */
export interface ScoreResult {
  /** 全体スコア (0-100, 整数, 四捨五入) */
  totalScore: number
  /** 大項目別スコア */
  categoryScores: CategoryScore[]
  /** OK 判定された項目数 */
  totalOkCount: number
  /** 全項目数 */
  totalItemCount: number
  /** OK 判定された項目の point 合計 */
  totalEarnedPoints: number
  /** 全項目の point 合計 */
  totalMaxPoints: number
}
