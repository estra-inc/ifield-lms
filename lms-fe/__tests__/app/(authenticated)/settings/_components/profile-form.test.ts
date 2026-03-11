/**
 * ProfileForm コンポーネントのテスト
 *
 * Client Component の構造・インポート・必須要素を検証する。
 */

import fs from "fs"
import path from "path"

describe("ProfileForm (プロフィール編集フォーム)", () => {
  const componentPath = path.resolve(
    __dirname,
    "../../../../../app/(authenticated)/settings/_components/profile-form.tsx"
  )

  it("profile-form.tsx ファイルが存在する", () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  it("Client Component である ('use client' ディレクティブがある)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(
      content.includes('"use client"') || content.includes("'use client'")
    ).toBe(true)
  })

  it("React Hook Form の useForm をインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("useForm")
    expect(content).toContain("react-hook-form")
  })

  it("zodResolver をインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("zodResolver")
  })

  it("profileSchema を lib/validations/settings からインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("profileSchema")
    expect(content).toContain("validations/settings")
  })

  it("updateProfile Server Action をインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("updateProfile")
  })

  it("useTransition を使用している（ローディング状態管理用）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("useTransition")
  })

  it("lastName フィールドを含んでいる（姓）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("lastName")
    expect(content).toContain("姓")
  })

  it("firstName フィールドを含んでいる（名）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("firstName")
    expect(content).toContain("名")
  })

  it("注意書き「※ 正式な表記で氏名を入力してください」を含んでいる", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("正式な表記で氏名を入力してください")
  })

  it("メールアドレスを読み取り専用で表示している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("email")
    // ロックアイコン
    expect(content).toContain("Lock")
  })

  it("ロールのバッジ表示がある", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("Badge")
    expect(content).toContain("role")
  })

  it("shadcn/ui Form コンポーネントを使用している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("FormField")
    expect(content).toContain("FormItem")
    expect(content).toContain("FormControl")
    expect(content).toContain("FormMessage")
  })

  it("送信中のローディング状態を管理している (disabled)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("disabled")
    expect(content).toContain("isPending")
  })

  it("sonner toast でフィードバックを表示している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("toast")
    expect(content).toContain("sonner")
  })

  it("ProfileForm をエクスポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("export")
    expect(content).toContain("ProfileForm")
  })
})
