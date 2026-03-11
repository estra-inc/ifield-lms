/**
 * renderMarkdown 関数のテスト
 *
 * Markdown レンダリングおよび ToC（目次）抽出のテスト。
 * - GFM 準拠のレンダリング
 * - ToC 見出し抽出（h2, h3）
 * - 見出し ID のスラッグ化と一意性保証
 * - rehype-pretty-code によるシンタックスハイライト
 */

describe("renderMarkdown", () => {
  describe("4.1 Markdown レンダラー", () => {
    it("Markdown 文字列を React ノードに変換する", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const result = await renderMarkdown("# Hello World\n\nThis is a test.")

      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
    })

    it("MarkdownRenderResult インターフェースに準拠する", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const result = await renderMarkdown("## Test\n\nBody text.")

      expect(result).toHaveProperty("content")
      expect(result).toHaveProperty("tocItems")
      expect(Array.isArray(result.tocItems)).toBe(true)
    })

    it("GFM テーブルが正しくレンダリングされる（エラーなし）", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const md = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`
      const result = await renderMarkdown(md)
      expect(result.content).toBeDefined()
    })

    it("GFM タスクリストが正しくレンダリングされる（エラーなし）", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const md = `
- [x] Done
- [ ] Not done
`
      const result = await renderMarkdown(md)
      expect(result.content).toBeDefined()
    })

    it("GFM 取り消し線が正しくレンダリングされる（エラーなし）", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const md = "~~strikethrough~~"
      const result = await renderMarkdown(md)
      expect(result.content).toBeDefined()
    })

    it("コードブロックがシンタックスハイライト付きでレンダリングされる（エラーなし）", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const md = "```typescript\nconst x: number = 42;\n```"
      const result = await renderMarkdown(md)
      expect(result.content).toBeDefined()
    })
  })

  describe("4.2 目次（ToC）データの抽出", () => {
    it("h2 見出しを ToC アイテムとして抽出する", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const md = "## First Section\n\nContent here.\n\n## Second Section\n\nMore content."
      const result = await renderMarkdown(md)

      expect(result.tocItems.length).toBe(2)
      expect(result.tocItems[0].text).toBe("First Section")
      expect(result.tocItems[0].level).toBe(2)
      expect(result.tocItems[1].text).toBe("Second Section")
      expect(result.tocItems[1].level).toBe(2)
    })

    it("h3 見出しを ToC アイテムとして抽出する", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const md = "## Main Section\n\n### Sub Section\n\nContent."
      const result = await renderMarkdown(md)

      expect(result.tocItems.length).toBe(2)
      expect(result.tocItems[0].level).toBe(2)
      expect(result.tocItems[1].level).toBe(3)
      expect(result.tocItems[1].text).toBe("Sub Section")
    })

    it("h1, h4, h5, h6 は ToC に含めない", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const md = "# Title\n\n## Section\n\n### Sub\n\n#### Deep\n\n##### Deeper\n\n###### Deepest"
      const result = await renderMarkdown(md)

      // h2 と h3 のみ
      expect(result.tocItems.length).toBe(2)
    })

    it("見出し ID がスラッグ化される", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const md = "## Hello World\n\n## TypeScript 入門"
      const result = await renderMarkdown(md)

      expect(result.tocItems[0].id).toBe("hello-world")
      // 日本語は除去されるか適切にスラッグ化される
      expect(result.tocItems[1].id).toBeDefined()
      expect(result.tocItems[1].id.length).toBeGreaterThan(0)
    })

    it("重複見出しにサフィックスを付与して一意性を保証する", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const md = "## Section\n\n## Section\n\n## Section"
      const result = await renderMarkdown(md)

      expect(result.tocItems.length).toBe(3)
      const ids = result.tocItems.map((item) => item.id)
      // 全 ID が一意であること
      expect(new Set(ids).size).toBe(3)
    })

    it("ToC アイテムが出現順に並ぶ", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const md = "## First\n\n### Sub\n\n## Second\n\n### Another Sub"
      const result = await renderMarkdown(md)

      expect(result.tocItems[0].text).toBe("First")
      expect(result.tocItems[1].text).toBe("Sub")
      expect(result.tocItems[2].text).toBe("Second")
      expect(result.tocItems[3].text).toBe("Another Sub")
    })

    it("TocItem が正しい型構造を持つ", async () => {
      const { renderMarkdown } = await import("@/lib/markdown/render-markdown")
      const md = "## Test Section"
      const result = await renderMarkdown(md)

      const item = result.tocItems[0]
      expect(typeof item.id).toBe("string")
      expect(typeof item.text).toBe("string")
      expect([2, 3]).toContain(item.level)
    })
  })
})
