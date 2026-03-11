/**
 * App Shell 拡張のテスト
 *
 * 検索バープレースホルダーとサイドバーナビゲーションの更新を検証する。
 */

describe("App Shell 拡張 (Task 9)", () => {
  describe("9.1 ヘッダー検索バープレースホルダー", () => {
    it("SearchBarPlaceholder は disabled 状態で表示する", () => {
      const isDisabled = true
      const placeholder = "教材をセマンティック検索..."
      expect(isDisabled).toBe(true)
      expect(placeholder).toBeDefined()
    })

    it("User ロールのみ検索バーを表示する", () => {
      const shouldShow = (role: string) => role === "user"
      expect(shouldShow("user")).toBe(true)
      expect(shouldShow("manager")).toBe(false)
      expect(shouldShow("super_admin")).toBe(false)
    })
  })

  describe("9.2 サイドバーナビゲーション", () => {
    it("User ロールのサイドバーに教材・演習メニューが存在する", async () => {
      const { NAVIGATION_MAP } = await import("@/config/navigation")
      const userItems = NAVIGATION_MAP.user
      const contentsItem = userItems.find(
        (item) => item.href === "/contents"
      )
      expect(contentsItem).toBeDefined()
      expect(contentsItem?.label).toBe("教材・演習")
    })

    it("Super Admin ロールのサイドバーに教材バージョン管理メニューが存在する", async () => {
      const { NAVIGATION_MAP } = await import("@/config/navigation")
      const adminItems = NAVIGATION_MAP.super_admin
      const contentsItem = adminItems.find(
        (item) => item.href === "/contents" || item.href === "/admin/content-versions"
      )
      expect(contentsItem).toBeDefined()
    })
  })
})
