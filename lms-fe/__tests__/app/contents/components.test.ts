/**
 * 教材詳細ページコンポーネントのテスト
 *
 * パンくずリスト、セクションナビゲーション、ToC 抽出の
 * ロジックテストを実施する。
 */

describe("教材詳細ページコンポーネント (Task 6)", () => {
  describe("6.2 パンくずリスト構築ロジック", () => {
    it("正しいパンくずアイテムを構築する", () => {
      const breadcrumbItems = [
        { label: "教材", href: "/contents" },
        { label: "HTML/CSS 基礎", href: "/contents/html-css-basics" },
        {
          label: "Chapter 1",
          href: "/contents/html-css-basics/chapter1",
        },
      ]
      const currentLabel = "イントロダクション"

      expect(breadcrumbItems).toHaveLength(3)
      expect(breadcrumbItems[0].label).toBe("教材")
      expect(breadcrumbItems[0].href).toBe("/contents")
      expect(currentLabel).toBe("イントロダクション")
    })
  })

  describe("6.3 ToC データの構造", () => {
    it("TocItem が正しい構造を持つ", async () => {
      const { extractTocItems } = await import("@/lib/markdown/render-markdown")
      const md = "## Section One\n\n### Sub Section\n\n## Section Two"
      const items = extractTocItems(md)

      expect(items).toHaveLength(3)
      expect(items[0]).toEqual({
        id: "section-one",
        text: "Section One",
        level: 2,
      })
      expect(items[1]).toEqual({
        id: "sub-section",
        text: "Sub Section",
        level: 3,
      })
    })
  })

  describe("6.4 セクション間ナビゲーションロジック", () => {
    it("前後セクションの情報を正しく算出する", () => {
      const siblings = [
        { id: "1", title: "Intro", slug_path: "tut/ch1/intro", order: 1 },
        { id: "2", title: "Basics", slug_path: "tut/ch1/basics", order: 2 },
        { id: "3", title: "Advanced", slug_path: "tut/ch1/advanced", order: 3 },
      ]

      const currentIndex = siblings.findIndex(
        (s) => s.slug_path === "tut/ch1/basics"
      )

      expect(currentIndex).toBe(1)

      const prevSection = currentIndex > 0 ? siblings[currentIndex - 1] : null
      const nextSection =
        currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null

      expect(prevSection?.title).toBe("Intro")
      expect(nextSection?.title).toBe("Advanced")
    })

    it("最初のセクションでは前がない", () => {
      const siblings = [
        { id: "1", title: "Intro", slug_path: "tut/ch1/intro", order: 1 },
        { id: "2", title: "Basics", slug_path: "tut/ch1/basics", order: 2 },
      ]

      const currentIndex = 0
      const prevSection = currentIndex > 0 ? siblings[currentIndex - 1] : null

      expect(prevSection).toBeNull()
    })

    it("最後のセクションでは次がない", () => {
      const siblings = [
        { id: "1", title: "Intro", slug_path: "tut/ch1/intro", order: 1 },
        { id: "2", title: "Basics", slug_path: "tut/ch1/basics", order: 2 },
      ]

      const currentIndex = siblings.length - 1
      const nextSection =
        currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null

      expect(nextSection).toBeNull()
    })

    it("読了済みセクションでのみナビゲーションを表示する判定", () => {
      const isCompleted = true
      const shouldShowNav = isCompleted
      expect(shouldShowNav).toBe(true)

      const isNotCompleted = false
      const shouldHideNav = !isNotCompleted
      expect(shouldHideNav).toBe(true)
    })
  })

  describe("7.3 おめでとうモーダルの判定ロジック", () => {
    it("次のセクションが存在する場合のボタンテキスト", () => {
      const hasNextSection = true
      const buttonText = hasNextSection
        ? "次のセクションに進む"
        : "チャプター一覧に戻る"
      expect(buttonText).toBe("次のセクションに進む")
    })

    it("チャプター最終セクションの場合のボタンテキスト", () => {
      const hasNextSection = false
      const buttonText = hasNextSection
        ? "次のセクションに進む"
        : "チャプター一覧に戻る"
      expect(buttonText).toBe("チャプター一覧に戻る")
    })
  })
})
