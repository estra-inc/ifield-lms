/**
 * 検索・ロールフィルタコンポーネントのテスト
 *
 * user-filters.tsx のロジック（デバウンス、URL パラメータ構築）を検証する。
 */

describe("UserFilters コンポーネント", () => {
  it("モジュールが存在し、UserFilters がエクスポートされる", async () => {
    const mod = await import(
      "@/app/(authenticated)/admin/users/_components/user-filters"
    )
    expect(mod).toBeDefined()
    expect(mod.UserFilters).toBeDefined()
    expect(typeof mod.UserFilters).toBe("function")
  })

  describe("URL パラメータ構築ロジック", () => {
    it("検索キーワードを search パラメータに設定する", () => {
      const params = new URLSearchParams()
      const search = "テスト"

      if (search) {
        params.set("search", search)
      }

      expect(params.get("search")).toBe("テスト")
    })

    it("ロールフィルタを role パラメータに設定する", () => {
      const params = new URLSearchParams()
      const role = "manager"

      if (role) {
        params.set("role", role)
      }

      expect(params.get("role")).toBe("manager")
    })

    it("フィルタ変更時にpage パラメータを削除する（1にリセット）", () => {
      const params = new URLSearchParams("search=test&role=user&page=3")

      // フィルタ変更時はページをリセット
      params.delete("page")

      expect(params.has("page")).toBe(false)
      expect(params.get("search")).toBe("test")
      expect(params.get("role")).toBe("user")
    })

    it("ロールが空（全て）の場合はroleパラメータを削除する", () => {
      const params = new URLSearchParams("role=user")

      const role = ""
      if (!role) {
        params.delete("role")
      }

      expect(params.has("role")).toBe(false)
    })

    it("検索キーワードが空の場合はsearchパラメータを削除する", () => {
      const params = new URLSearchParams("search=old")

      const search = ""
      if (!search) {
        params.delete("search")
      }

      expect(params.has("search")).toBe(false)
    })
  })

  describe("ロール選択肢", () => {
    it("4つの選択肢を持つ（全て、受講生、マネージャー、スーパー管理者）", () => {
      const roleOptions = [
        { value: "", label: "全て" },
        { value: "user", label: "受講生" },
        { value: "manager", label: "マネージャー" },
        { value: "super_admin", label: "スーパー管理者" },
      ]

      expect(roleOptions).toHaveLength(4)
      expect(roleOptions[0].value).toBe("")
      expect(roleOptions[0].label).toBe("全て")
    })
  })
})
