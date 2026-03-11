import type { UserRole } from "@/lib/types/app-shell"

/**
 * ユーザー一覧の1行分のデータ型
 *
 * profiles テーブルから取得したデータをフロントエンド向けに変換した型。
 * camelCase 命名でコンポーネントに渡す。
 */
export interface UserListItem {
  id: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  role: UserRole
  currentTerm: string | null
  createdAt: string
  isBanned: boolean
}

/**
 * ユーザー一覧のフェッチ結果型
 *
 * ページネーション情報を含むユーザー一覧データ。
 */
export interface UserListResult {
  users: UserListItem[]
  totalCount: number
}

/**
 * ユーザー詳細のデータ型
 *
 * UserListItem と同一。個別ページでの利用を明示するためのエイリアス。
 */
export type UserDetail = UserListItem

/**
 * ユーザー一覧のフィルタパラメータ型
 *
 * URL SearchParams から読み取った検索・フィルタ・ページネーション条件。
 */
export interface UserListFilter {
  search?: string
  role?: UserRole
  page: number
}
