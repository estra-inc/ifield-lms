import {
  LayoutDashboard,
  BookOpen,
  Briefcase,
  Settings,
  Users,
  ClipboardList,
  FileText,
  Target,
  CalendarCheck,
} from "lucide-react"
import type { UserRole, MenuItemDef } from "@/lib/types/app-shell"

/** ロール別ナビゲーション定義マップ */
export const NAVIGATION_MAP: Record<UserRole, ReadonlyArray<MenuItemDef>> = {
  user: [
    { label: "ダッシュボード", icon: LayoutDashboard, href: "/dashboard" },
    { label: "教材・演習", icon: BookOpen, href: "/contents" },
    { label: "日報", icon: FileText, href: "/reports" },
    { label: "学習目標", icon: Target, href: "/goals" },
    { label: "模擬案件", icon: Briefcase, href: "/projects" },
    { label: "コーチング予約", icon: CalendarCheck, href: "/coaching" },
    { label: "設定・プロフィール", icon: Settings, href: "/settings" },
  ],
  manager: [
    { label: "教材・演習", icon: BookOpen, href: "/contents" },
    { label: "模擬案件", icon: Briefcase, href: "/projects" },
    { label: "日報", icon: FileText, href: "/manager/reports" },
    { label: "ユーザー一覧", icon: Users, href: "/users" },
    { label: "設定・プロフィール", icon: Settings, href: "/settings" },
  ],
  super_admin: [
    { label: "教材・演習", icon: BookOpen, href: "/contents" },
    { label: "模擬案件", icon: Briefcase, href: "/projects" },
    { label: "未採点一覧", icon: ClipboardList, href: "/admin/grading" },
    { label: "日報", icon: FileText, href: "/manager/reports" },
    { label: "ユーザー管理", icon: Users, href: "/admin/users" },
    { label: "教材バージョン管理", icon: BookOpen, href: "/admin/content-versions" },
    { label: "コーチング管理", icon: CalendarCheck, href: "/admin/coaching" },
    { label: "設定", icon: Settings, href: "/settings" },
  ],
} as const

/**
 * ロール別メニュー項目を取得する
 */
export function getMenuItemsForRole(role: UserRole): ReadonlyArray<MenuItemDef> {
  return NAVIGATION_MAP[role]
}

/**
 * パスからページタイトルを解決する
 * サブパス（例: /contents/123）にも対応するため、プレフィックスマッチで検索する
 */
export function resolvePageTitle(role: UserRole, pathname: string): string {
  const items = NAVIGATION_MAP[role]

  // 完全一致を優先
  const exactMatch = items.find((item) => item.href === pathname)
  if (exactMatch) {
    return exactMatch.label
  }

  // プレフィックスマッチ（長い href を優先して検索）
  const sortedItems = [...items].sort((a, b) => b.href.length - a.href.length)
  const prefixMatch = sortedItems.find(
    (item) =>
      pathname.startsWith(item.href + "/") || pathname === item.href
  )
  if (prefixMatch) {
    return prefixMatch.label
  }

  // フォールバック: ダッシュボードラベルを返す
  return items[0].label
}

/**
 * メニュー項目のアクティブ判定
 * 完全一致またはプレフィックス一致（パス区切り付き）で判定する
 */
export function isMenuItemActive(href: string, currentPath: string): boolean {
  if (href === currentPath) {
    return true
  }
  // プレフィックス一致: href + "/" で始まるかをチェック（/settings が /system-settings に一致しないようにする）
  return currentPath.startsWith(href + "/")
}
