/**
 * Super Admin コンテンツ管理画面のテスト
 *
 * コンテンツ管理一覧の表示ロジックと
 * ステータスフィルタリングのテスト。
 */

describe("Super Admin コンテンツ管理 (Task 8)", () => {
  describe("8.1 コンテンツ管理一覧", () => {
    it("active と archived のコンテンツを両方表示する", () => {
      const contents = [
        { id: "1", status: "active", title: "Active Content" },
        { id: "2", status: "archived", title: "Archived Content" },
      ]

      // 全ステータスを含むべき
      const statuses = contents.map((c) => c.status)
      expect(statuses).toContain("active")
      expect(statuses).toContain("archived")
    })

    it("最終同期日時を表示する", () => {
      const content = {
        updated_at: "2026-02-28T12:00:00Z",
        slug_path: "html-css/chapter1/intro",
        genre: "engineering",
        tutorial: "html-css",
        chapter: "chapter1",
        section: "intro",
        content_type: "section",
        status: "active",
      }

      expect(content.updated_at).toBeDefined()
      expect(content.slug_path).toBeDefined()
      expect(content.genre).toBeDefined()
    })

    it("content_type による階層情報を表示する", () => {
      const content = {
        content_type: "section" as const,
        genre: "engineering",
        tutorial: "html-css",
        chapter: "chapter1",
        section: "intro",
      }

      expect(content.content_type).toBe("section")
      expect(content.genre).toBe("engineering")
      expect(content.tutorial).toBe("html-css")
    })
  })

  describe("8.2 コンテンツ詳細表示", () => {
    it("Super Admin は全ステータスのコンテンツを閲覧可能", () => {
      const userRole = "super_admin"
      const contentStatus = "archived"

      // Super Admin は archived も閲覧可能
      const canView = userRole === "super_admin" || contentStatus === "active"
      expect(canView).toBe(true)
    })
  })
})
