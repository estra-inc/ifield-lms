/**
 * 日報・学習目標のフロントエンド用ドメイン型
 *
 * DB の snake_case から camelCase に変換したフロントエンド向けの型定義。
 * コンポーネントの Props や Server Component のデータフェッチ結果に使用する。
 */

/** 日報エントリ（フロントエンド用 camelCase） */
export interface DailyReportEntry {
  id: string
  reportDate: string
  actualHours: number
  content: string
  likedByManager: boolean
  createdAt: string
}

/** 日付グループ */
export interface DateGroup {
  date: string
  dayOfWeek: string
  totalHours: number
  entries: DailyReportEntry[]
}

/** Manager/Admin 向けフィードアイテム */
export interface ReportFeedItem {
  id: string
  userId: string
  userName: string
  avatarUrl: string | null
  reportDate: string
  actualHours: number
  content: string
  likedByManager: boolean
}

/** Admin テーブル行 */
export interface AdminReportRow {
  id: string
  userId: string
  userName: string
  avatarUrl: string | null
  reportDate: string
  actualHours: number
  content: string
  likedByManager: boolean
}

/** 学習進捗メトリクス */
export interface LearningMetrics {
  monthly: {
    actual: number
    target: number | null
    percentage: number | null
  }
  weekly: {
    actual: number
    target: number | null
    percentage: number | null
  }
  daily: {
    actual: number
  }
}
