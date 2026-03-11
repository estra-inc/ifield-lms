import fs from "fs"
import path from "path"

describe("SubmitButton (components/ui/submit-button.tsx)", () => {
  const componentPath = path.resolve(
    __dirname,
    "../../../components/ui/submit-button.tsx"
  )

  it("submit-button.tsx ファイルが存在する", () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  it("Client Component である ('use client' ディレクティブがある)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(
      content.includes('"use client"') || content.includes("'use client'")
    ).toBe(true)
  })

  it("useFormStatus を react-dom からインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("useFormStatus")
    expect(content).toContain("react-dom")
  })

  it("Button コンポーネントをインポートしている（shadcn/ui 拡張）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("Button")
  })

  it("children props を受け取る（デフォルトテキスト用）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("children")
  })

  it("pendingText props を受け取る（ローディング中テキスト用）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("pendingText")
  })

  it("pending 状態で disabled 属性を設定する（二重送信防止）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("disabled")
    expect(content).toContain("pending")
  })

  it("SubmitButton をエクスポートする", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("SubmitButton")
  })

  it("Loader2 スピナーアイコンを使用している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("Loader2")
  })
})
