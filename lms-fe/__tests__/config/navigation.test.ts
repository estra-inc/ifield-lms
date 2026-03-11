import {
  NAVIGATION_MAP,
  getMenuItemsForRole,
  resolvePageTitle,
  isMenuItemActive,
} from "@/config/navigation"
import type { UserRole } from "@/lib/types/app-shell"

describe("NAVIGATION_MAP", () => {
  it("User ロールに 7 項目が定義されている", () => {
    expect(NAVIGATION_MAP.user).toHaveLength(7)
  })

  it("Manager ロールに 5 項目が定義されている", () => {
    expect(NAVIGATION_MAP.manager).toHaveLength(5)
  })

  it("Super Admin ロールに 8 項目が定義されている", () => {
    expect(NAVIGATION_MAP.super_admin).toHaveLength(8)
  })
})

describe("getMenuItemsForRole", () => {
  it("User ロールのメニュー項目を正しい順序で返す", () => {
    const items = getMenuItemsForRole("user")
    expect(items).toHaveLength(7)
    expect(items[0].label).toBe("ダッシュボード")
    expect(items[0].href).toBe("/dashboard")
    expect(items[1].label).toBe("教材・演習")
    expect(items[1].href).toBe("/contents")
    expect(items[2].label).toBe("日報")
    expect(items[2].href).toBe("/reports")
    expect(items[3].label).toBe("学習目標")
    expect(items[3].href).toBe("/goals")
    expect(items[4].label).toBe("模擬案件")
    expect(items[4].href).toBe("/projects")
    expect(items[5].label).toBe("コーチング予約")
    expect(items[5].href).toBe("/coaching")
    expect(items[6].label).toBe("設定・プロフィール")
    expect(items[6].href).toBe("/settings")
  })

  it("Manager ロールのメニュー項目を正しい順序で返す", () => {
    const items = getMenuItemsForRole("manager")
    expect(items).toHaveLength(5)
    expect(items[0].label).toBe("教材・演習")
    expect(items[0].href).toBe("/contents")
    expect(items[1].label).toBe("模擬案件")
    expect(items[1].href).toBe("/projects")
    expect(items[2].label).toBe("日報")
    expect(items[2].href).toBe("/manager/reports")
    expect(items[3].label).toBe("ユーザー一覧")
    expect(items[3].href).toBe("/users")
    expect(items[4].label).toBe("設定・プロフィール")
    expect(items[4].href).toBe("/settings")
  })

  it("Super Admin ロールのメニュー項目を正しい順序で返す", () => {
    const items = getMenuItemsForRole("super_admin")
    expect(items).toHaveLength(8)
    expect(items[0].label).toBe("教材・演習")
    expect(items[0].href).toBe("/contents")
    expect(items[1].label).toBe("模擬案件")
    expect(items[1].href).toBe("/projects")
    expect(items[2].label).toBe("未採点一覧")
    expect(items[2].href).toBe("/admin/grading")
    expect(items[3].label).toBe("日報")
    expect(items[3].href).toBe("/manager/reports")
    expect(items[4].label).toBe("ユーザー管理")
    expect(items[4].href).toBe("/admin/users")
    expect(items[5].label).toBe("教材バージョン管理")
    expect(items[5].href).toBe("/admin/content-versions")
    expect(items[6].label).toBe("コーチング管理")
    expect(items[6].href).toBe("/admin/coaching")
    expect(items[7].label).toBe("設定")
    expect(items[7].href).toBe("/settings")
  })

  it("各メニュー項目にアイコンが設定されている", () => {
    const roles: UserRole[] = ["user", "manager", "super_admin"]
    for (const role of roles) {
      const items = getMenuItemsForRole(role)
      for (const item of items) {
        expect(item.icon).toBeDefined()
        expect(typeof item.icon).toMatch(/function|object/)
      }
    }
  })
})

describe("resolvePageTitle", () => {
  it("User ロールで /dashboard のタイトルを返す", () => {
    expect(resolvePageTitle("user", "/dashboard")).toBe("ダッシュボード")
  })

  it("User ロールで /contents のタイトルを返す", () => {
    expect(resolvePageTitle("user", "/contents")).toBe("教材・演習")
  })

  it("Manager ロールで /manager/reports のタイトルを返す", () => {
    expect(resolvePageTitle("manager", "/manager/reports")).toBe("日報")
  })

  it("Super Admin ロールで /admin/grading のタイトルを返す", () => {
    expect(resolvePageTitle("super_admin", "/admin/grading")).toBe("未採点一覧")
  })

  it("サブパスでも正しいタイトルを返す（プレフィックスマッチ）", () => {
    expect(resolvePageTitle("user", "/contents/123")).toBe("教材・演習")
  })

  it("Super Admin ロールで /admin/users のタイトルを返す", () => {
    expect(resolvePageTitle("super_admin", "/admin/users")).toBe("ユーザー管理")
  })

  it("Super Admin ロールで /admin/users/[id] のサブパスでもユーザー管理タイトルを返す", () => {
    expect(resolvePageTitle("super_admin", "/admin/users/550e8400-e29b-41d4-a716-446655440000")).toBe("ユーザー管理")
  })

  it("User ロールで /reports のタイトルを返す", () => {
    expect(resolvePageTitle("user", "/reports")).toBe("日報")
  })

  it("User ロールで /goals のタイトルを返す", () => {
    expect(resolvePageTitle("user", "/goals")).toBe("学習目標")
  })

  it("Manager ロールで /manager/reports のタイトルを返す", () => {
    expect(resolvePageTitle("manager", "/manager/reports")).toBe("日報")
  })

  it("Manager ロールで /manager/reports/table のサブパスでも日報タイトルを返す", () => {
    expect(resolvePageTitle("manager", "/manager/reports/table")).toBe("日報")
  })

  it("Super Admin ロールで /manager/reports のタイトルを返す", () => {
    expect(resolvePageTitle("super_admin", "/manager/reports")).toBe("日報")
  })

  it("マッチしないパスではデフォルトタイトルを返す", () => {
    const title = resolvePageTitle("user", "/unknown-path")
    expect(typeof title).toBe("string")
    expect(title.length).toBeGreaterThan(0)
  })
})

describe("isMenuItemActive", () => {
  it("完全一致で true を返す", () => {
    expect(isMenuItemActive("/dashboard", "/dashboard")).toBe(true)
  })

  it("プレフィックス一致で true を返す", () => {
    expect(isMenuItemActive("/contents", "/contents/123")).toBe(true)
  })

  it("不一致で false を返す", () => {
    expect(isMenuItemActive("/dashboard", "/contents")).toBe(false)
  })

  it("/dashboard は /dashboard/sub に一致する", () => {
    expect(isMenuItemActive("/dashboard", "/dashboard/sub")).toBe(true)
  })

  it("/settings は /system-settings に一致しない", () => {
    expect(isMenuItemActive("/settings", "/system-settings")).toBe(false)
  })

  it("ルートパス /dashboard は / に一致しない", () => {
    expect(isMenuItemActive("/dashboard", "/")).toBe(false)
  })
})
