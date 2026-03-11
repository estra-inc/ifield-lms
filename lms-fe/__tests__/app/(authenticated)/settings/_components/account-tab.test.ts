/**
 * AccountTab コンポーネントのテスト
 *
 * Client Component の構造・インポート・必須要素を検証する。
 */

import fs from "fs"
import path from "path"

describe("AccountTab (アカウントタブ -- パスワード変更)", () => {
  const componentPath = path.resolve(
    __dirname,
    "../../../../../app/(authenticated)/settings/_components/account-tab.tsx"
  )

  it("account-tab.tsx ファイルが存在する", () => {
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

  it("passwordChangeSchema を lib/validations/settings からインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("passwordChangeSchema")
    expect(content).toContain("validations/settings")
  })

  it("changePassword Server Action をインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("changePassword")
  })

  it("useTransition を使用している（ローディング状態管理用）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("useTransition")
  })

  it("newPassword フィールドを含んでいる（新しいパスワード）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("newPassword")
  })

  it("confirmPassword フィールドを含んでいる（確認パスワード）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("confirmPassword")
  })

  it("shadcn/ui Form コンポーネントを使用している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("FormField")
    expect(content).toContain("FormItem")
    expect(content).toContain("FormControl")
    expect(content).toContain("FormMessage")
  })

  it("送信中のローディング状態を管理している (disabled + isPending)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("disabled")
    expect(content).toContain("isPending")
  })

  it("sonner toast でフィードバックを表示している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("toast")
    expect(content).toContain("sonner")
  })

  it("成功時にフォームをリセットする処理がある", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("reset")
  })

  it("パスワード入力フィールドの type が password である", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain('type="password"')
  })

  it("AccountTab をエクスポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("export")
    expect(content).toContain("AccountTab")
  })

  it("Loader2 アイコンをインポートしている（ローディング表示用）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("Loader2")
  })
})
