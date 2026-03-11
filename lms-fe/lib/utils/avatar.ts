/**
 * アバター関連のユーティリティ関数
 *
 * ユーザー名からイニシャルを生成し、
 * ユーザー ID から決定論的に背景色を割り当てる。
 */

/** アバター背景色のパレット */
export const AVATAR_COLORS = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
] as const

/**
 * ユーザー名からアバターイニシャルを生成する
 * 姓の頭文字を返す（姓名スペース区切り前提）
 */
export function getAvatarInitial(userName: string): string {
  if (!userName) return "?"
  const parts = userName.split(/\s+/)
  return parts[0].charAt(0)
}

/**
 * ユーザー ID からアバター背景色を決定論的に生成する
 * 同一ユーザーは常に同じ色を返す（ハッシュベース）
 */
export function getAvatarColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

/**
 * ロールに応じていいねボタンを表示するかどうかを判定する
 * Manager のみ true（Super Admin は閲覧専用）
 */
export function shouldShowLikeButton(role: "user" | "manager" | "super_admin"): boolean {
  return role === "manager"
}
