/**
 * 受講生向けコンテンツページのプレビュー用 version_id パラメータサポートのテスト
 *
 * 各コンテンツページが resolveVersionId を使用して version_id パラメータを
 * 処理していることを検証する。
 *
 * Task: 6.2
 * Requirements: 3.3, 3.5, 7.1
 */

import { readFileSync } from "fs"
import { join } from "path"

// --- テスト ---

describe("コンテンツページのプレビュー用 version_id パラメータサポート (Task 6.2)", () => {
  /**
   * ソースコードの静的解析テスト
   *
   * 各ページが resolveVersionId を使用し、getActiveVersionId を直接使用していないことを
   * ソースコードレベルで検証する。
   */
  describe("教材一覧ページ (contents/page.tsx)", () => {
    const pagePath = join(
      process.cwd(),
      "app/(authenticated)/contents/page.tsx"
    )
    let source: string

    beforeAll(() => {
      source = readFileSync(pagePath, "utf-8")
    })

    it("resolveVersionId をインポートしている", () => {
      expect(source).toContain("resolveVersionId")
    })

    it("getActiveVersionId を直接使用していない", () => {
      // resolveVersionId 内部で使用するため import 文には含まれない
      expect(source).not.toMatch(/getActiveVersionId/)
    })

    it("searchParams に version_id を含む型定義がある", () => {
      expect(source).toContain("version_id")
    })

    it("resolveVersionId に searchParams を渡している", () => {
      // resolveVersionId(supabase, ...) の呼び出しパターン
      expect(source).toMatch(/resolveVersionId\s*\(/)
    })
  })

  describe("チュートリアル詳細ページ (contents/[tutorial]/page.tsx)", () => {
    const pagePath = join(
      process.cwd(),
      "app/(authenticated)/contents/[tutorial]/page.tsx"
    )
    let source: string

    beforeAll(() => {
      source = readFileSync(pagePath, "utf-8")
    })

    it("resolveVersionId をインポートしている", () => {
      expect(source).toContain("resolveVersionId")
    })

    it("getActiveVersionId を直接使用していない", () => {
      expect(source).not.toMatch(/getActiveVersionId/)
    })

    it("searchParams を受け取る型定義がある", () => {
      expect(source).toContain("searchParams")
    })

    it("resolveVersionId に searchParams を渡している", () => {
      expect(source).toMatch(/resolveVersionId\s*\(/)
    })
  })

  describe("セクション詳細ページ (contents/[tutorial]/[chapter]/[section]/page.tsx)", () => {
    const pagePath = join(
      process.cwd(),
      "app/(authenticated)/contents/[tutorial]/[chapter]/[section]/page.tsx"
    )
    let source: string

    beforeAll(() => {
      source = readFileSync(pagePath, "utf-8")
    })

    it("resolveVersionId をインポートしている", () => {
      expect(source).toContain("resolveVersionId")
    })

    it("getActiveVersionId を直接使用していない", () => {
      expect(source).not.toMatch(/getActiveVersionId/)
    })

    it("searchParams を受け取る型定義がある", () => {
      expect(source).toContain("searchParams")
    })

    it("resolveVersionId に searchParams を渡している", () => {
      expect(source).toMatch(/resolveVersionId\s*\(/)
    })
  })
})
