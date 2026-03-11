/**
 * 日報関連ページの統合テスト
 *
 * ナビゲーション定義がロール別に正しく構成されていることを検証する。
 * - User: 日報 + 学習目標メニュー項目
 * - Manager: 日報メニュー項目
 * - Super Admin: 日報メニュー項目
 */
import { getMenuItemsForRole, isMenuItemActive } from "@/config/navigation"
import { shouldShowLikeButton } from "@/lib/utils/avatar"

describe("日報機能の統合テスト", () => {
  describe("User ロールのナビゲーション", () => {
    it("日報メニュー項目が含まれている", () => {
      const items = getMenuItemsForRole("user")
      const reportItem = items.find((item) => item.href === "/reports")
      expect(reportItem).toBeDefined()
      expect(reportItem?.label).toBe("日報")
    })

    it("学習目標メニュー項目が含まれている", () => {
      const items = getMenuItemsForRole("user")
      const goalItem = items.find((item) => item.href === "/goals")
      expect(goalItem).toBeDefined()
      expect(goalItem?.label).toBe("学習目標")
    })

    it("/reports パスでメニュー項目がアクティブになる", () => {
      expect(isMenuItemActive("/reports", "/reports")).toBe(true)
    })

    it("/reports/list サブパスでもメニュー項目がアクティブになる", () => {
      expect(isMenuItemActive("/reports", "/reports/list")).toBe(true)
    })

    it("/goals パスでメニュー項目がアクティブになる", () => {
      expect(isMenuItemActive("/goals", "/goals")).toBe(true)
    })
  })

  describe("Manager ロールのナビゲーション", () => {
    it("日報メニュー項目が含まれている", () => {
      const items = getMenuItemsForRole("manager")
      const reportItem = items.find((item) => item.href === "/manager/reports")
      expect(reportItem).toBeDefined()
      expect(reportItem?.label).toBe("日報")
    })

    it("/manager/reports パスでメニュー項目がアクティブになる", () => {
      expect(isMenuItemActive("/manager/reports", "/manager/reports")).toBe(true)
    })
  })

  describe("Super Admin ロールのナビゲーション", () => {
    it("日報メニュー項目が含まれている", () => {
      const items = getMenuItemsForRole("super_admin")
      const reportItem = items.find((item) => item.href === "/manager/reports")
      expect(reportItem).toBeDefined()
      expect(reportItem?.label).toBe("日報")
    })
  })

  describe("いいねボタンのロール別表示", () => {
    it("Manager はいいねボタンを表示する", () => {
      expect(shouldShowLikeButton("manager")).toBe(true)
    })

    it("Super Admin はいいねボタンを表示しない（閲覧専用）", () => {
      expect(shouldShowLikeButton("super_admin")).toBe(false)
    })

    it("User はいいねボタンを表示しない", () => {
      expect(shouldShowLikeButton("user")).toBe(false)
    })
  })

  describe("全ロールのメニュー項目にアイコンが設定されている", () => {
    it("User ロールの全項目にアイコンがある", () => {
      const items = getMenuItemsForRole("user")
      for (const item of items) {
        expect(item.icon).toBeDefined()
      }
    })

    it("Manager ロールの全項目にアイコンがある", () => {
      const items = getMenuItemsForRole("manager")
      for (const item of items) {
        expect(item.icon).toBeDefined()
      }
    })

    it("Super Admin ロールの全項目にアイコンがある", () => {
      const items = getMenuItemsForRole("super_admin")
      for (const item of items) {
        expect(item.icon).toBeDefined()
      }
    })
  })
})
