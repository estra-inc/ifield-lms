/**
 * 教材進捗計算ユーティリティ
 *
 * チュートリアル単位の進捗率計算とジャンル別進捗サマリーを提供する。
 */

/**
 * チュートリアルと進捗情報を含む型
 */
export interface TutorialWithProgress {
  id: string
  title: string
  slug_path: string
  genre: string
  chapterCount: number
  sectionCount: number
  completedSectionCount: number
  progressPercent: number
}

/**
 * ジャンル別進捗サマリー
 */
export interface GenreProgressSummary {
  /** ジャンル内の全セクション数 */
  totalSections: number
  /** ジャンル内の完了セクション数 */
  completedSections: number
  /** 進捗率（パーセント） */
  progressPercent: number
  /** ジャンル内の全チュートリアル数 */
  totalTutorials: number
  /** ジャンル内の完了チュートリアル数（全セクション完了） */
  completedTutorials: number
  /** 現在学習中のチュートリアル（進行中のもの） */
  currentTutorial: TutorialWithProgress | null
  /** 学習中の最新未完了セクションパス */
  currentSectionPath: string | null
}

/**
 * チュートリアルの進捗率を計算する
 *
 * @param totalSections - 全セクション数
 * @param completedSections - 完了セクション数
 * @returns 進捗率（0-100）
 */
export function calculateTutorialProgress(
  totalSections: number,
  completedSections: number
): number {
  if (totalSections === 0) return 0
  return Math.round((completedSections / totalSections) * 100)
}

/**
 * ジャンル別進捗サマリーを計算する
 *
 * @param tutorials - 対象ジャンルのチュートリアル一覧（進捗情報付き）
 * @returns ジャンル進捗サマリー
 */
export function calculateGenreProgressSummary(
  tutorials: TutorialWithProgress[]
): GenreProgressSummary {
  const totalSections = tutorials.reduce((sum, t) => sum + t.sectionCount, 0)
  const completedSections = tutorials.reduce(
    (sum, t) => sum + t.completedSectionCount,
    0
  )
  const completedTutorials = tutorials.filter(
    (t) => t.progressPercent === 100
  ).length
  const progressPercent =
    totalSections > 0
      ? Math.round((completedSections / totalSections) * 1000) / 10
      : 0

  // 学習中チュートリアルの検出（進捗が 0 より大きく 100 未満のもの）
  const inProgressTutorials = tutorials.filter(
    (t) => t.progressPercent > 0 && t.progressPercent < 100
  )
  const currentTutorial =
    inProgressTutorials.length > 0 ? inProgressTutorials[0] : null

  return {
    totalSections,
    completedSections,
    progressPercent,
    totalTutorials: tutorials.length,
    completedTutorials,
    currentTutorial,
    currentSectionPath: null, // ページコンポーネント側で設定
  }
}
