import type { LucideIcon } from "lucide-react"

/** ユーザーロール */
export type UserRole = "user" | "manager" | "super_admin"

/** 学習ターム */
export type UserTerm = "基礎" | "実践"

/** ユーザーコンテキスト（App Shell に渡される最小限のユーザー情報） */
export interface AppShellUser {
  id: string
  fullName: string
  role: UserRole
  avatarUrl: string | null
  /** User ロールのみ。null は Manager/Super Admin */
  currentTerm: UserTerm | null
}

/** メニュー項目定義 */
export interface MenuItemDef {
  label: string
  icon: LucideIcon
  href: string
}
