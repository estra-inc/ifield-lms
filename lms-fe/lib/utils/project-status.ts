/**
 * 着手状況の導出ユーティリティ
 *
 * assignment と submission の組み合わせから受講生ごとの着手状況を導出する。
 * 一覧ページと詳細ページの両方から利用可能な共通ユーティリティ。
 *
 * Requirements: 1.2, 1.3, 1.6, 1.7
 */

/**
 * 着手状況の6状態
 *
 * - 未着手: assignment 未作成
 * - 着手済み: assignment 有 + submission 無
 * - 提出済み: 直近 submission の status が 'submitted'
 * - 採点中: 直近 submission の status が 'grading'
 * - 採点完了: 直近 submission の status が 'graded'
 * - 差し戻し: 直近 submission の status が 'rejected'
 */
export type ProjectStatus =
  | "未着手"
  | "着手済み"
  | "提出済み"
  | "採点中"
  | "採点完了"
  | "差し戻し"

/**
 * submission のステータスから ProjectStatus へのマッピング
 */
const submissionStatusMap: Record<string, ProjectStatus> = {
  submitted: "提出済み",
  grading: "採点中",
  graded: "採点完了",
  rejected: "差し戻し",
}

/**
 * 導出ロジックへの入力型
 */
export interface ProjectStatusInput {
  assignment: {
    id: string
    status: string
  } | null
  latestSubmission: {
    id: string
    status: string
  } | null
}

/**
 * assignment と submission の組み合わせから着手状況を導出する
 *
 * @param input - assignment と latestSubmission の情報
 * @returns ProjectStatus - 6状態のいずれか
 */
export function deriveProjectStatus(input: ProjectStatusInput): ProjectStatus {
  const { assignment, latestSubmission } = input

  // assignment が存在しない = 未着手
  if (!assignment) {
    return "未着手"
  }

  // assignment 有 + submission 無 = 着手済み
  if (!latestSubmission) {
    return "着手済み"
  }

  // 直近 submission のステータスに準拠
  const mappedStatus = submissionStatusMap[latestSubmission.status]
  if (mappedStatus) {
    return mappedStatus
  }

  // フォールバック（未知のステータス）
  return "着手済み"
}

/**
 * 案件が「進行中」（着手中でまだ完了していない）かどうかを判定する
 *
 * 排他制御で使用: isProjectActive が true の案件がある場合、
 * 新しい案件に着手できない。
 *
 * @param status - ProjectStatus
 * @returns true: 案件が進行中（graded 以外で着手済み）
 */
export function isProjectActive(status: ProjectStatus): boolean {
  switch (status) {
    case "未着手":
      return false
    case "着手済み":
      return true
    case "提出済み":
      return true
    case "採点中":
      return true
    case "採点完了":
      return false
    case "差し戻し":
      return true
    default:
      return false
  }
}
