import fs from "fs"
import path from "path"

describe("InviteErrorPage (app/auth/invite/error/page.tsx)", () => {
  const pagePath = path.resolve(
    __dirname,
    "../../../../../app/auth/invite/error/page.tsx"
  )

  it("page.tsx ファイルが存在する", () => {
    expect(fs.existsSync(pagePath)).toBe(true)
  })

  it("Server Component である ('use client' ディレクティブがない)", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).not.toContain('"use client"')
    expect(content).not.toContain("'use client'")
  })

  it("default export されている", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toMatch(/export\s+default/)
  })

  // --- Logo ---
  it("next/image で i.field ロゴを表示する", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toContain("next/image")
    expect(content).toContain("ifield-logo_max_blacktext.png")
  })

  // --- Error Icon ---
  it("AlertCircle アイコンを lucide-react からインポートしている", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toContain("AlertCircle")
    expect(content).toContain("lucide-react")
  })

  it("赤い円形背景 (#FEE2E2) でエラーアイコンを表示する", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    // Check for the red circle background color
    expect(content).toMatch(/FEE2E2|fee2e2|red-100/)
  })

  // --- Error Messages ---
  it("'招待リンクが無効または期限切れです' タイトルを表示する", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toContain("招待リンクが無効または期限切れです")
  })

  it("管理者への再招待依頼案内文を表示する", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    // Should contain guidance about contacting admin for re-invitation
    expect(content).toContain("管理者")
  })

  // --- Action Button ---
  it("'ログインページに戻る' ボタンがある", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toContain("ログインページに戻る")
  })

  it("ログインページへの Link がある (/auth/login)", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toContain("/auth/login")
    expect(content).toContain("next/link")
  })

  // --- Button Style ---
  it("Outline スタイルのボタンを使用している", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toContain("outline")
  })

  // --- Card Layout ---
  it("Card コンポーネントを使用している", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toContain("Card")
  })
})
