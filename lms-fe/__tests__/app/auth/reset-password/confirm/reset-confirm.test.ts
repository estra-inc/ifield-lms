import fs from "fs"
import path from "path"

describe("ResetPasswordConfirmPage (app/auth/reset-password/confirm/page.tsx)", () => {
  const pagePath = path.resolve(
    __dirname,
    "../../../../../app/auth/reset-password/confirm/page.tsx"
  )

  it("page.tsx ファイルが存在する", () => {
    expect(fs.existsSync(pagePath)).toBe(true)
  })

  it("Server Component である ('use client' ディレクティブがない)", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).not.toContain('"use client"')
    expect(content).not.toContain("'use client'")
  })

  it("ResetConfirmForm コンポーネントをインポートしている", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toContain("ResetConfirmForm")
  })

  it("default export されている", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toMatch(/export\s+default/)
  })
})

describe("ResetConfirmForm (app/auth/reset-password/confirm/reset-confirm-form.tsx)", () => {
  const formPath = path.resolve(
    __dirname,
    "../../../../../app/auth/reset-password/confirm/reset-confirm-form.tsx"
  )

  it("reset-confirm-form.tsx ファイルが存在する", () => {
    expect(fs.existsSync(formPath)).toBe(true)
  })

  it("Client Component である ('use client' ディレクティブがある)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(
      content.includes('"use client"') || content.includes("'use client'")
    ).toBe(true)
  })

  // --- Logo & Title ---
  it("next/image で i.field ロゴを表示する", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("next/image")
    expect(content).toContain("ifield-logo_max_blacktext.png")
  })

  it("'新しいパスワードを設定' タイトルを表示する", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("新しいパスワードを設定")
  })

  // --- Form Fields ---
  it("新パスワード入力フィールドがある (name='password')", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toMatch(/name.*password|"password"/)
  })

  it("確認用パスワード入力フィールドがある (name='confirmPassword')", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("confirmPassword")
  })

  it("新しいパスワードのラベルがある", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("新しいパスワード")
  })

  // --- Submit Button ---
  it("SubmitButton コンポーネントを使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("SubmitButton")
  })

  it("'パスワードを更新' ボタンテキストがある", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("パスワードを更新")
  })

  it("SubmitButton に pendingText が設定されている", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("pendingText")
  })

  // --- Validation ---
  it("react-hook-form を使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("useForm")
    expect(content).toContain("react-hook-form")
  })

  it("zodResolver で resetPasswordConfirmSchema を使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("zodResolver")
    expect(content).toContain("resetPasswordConfirmSchema")
  })

  // --- Server Action Integration ---
  it("useActionState で confirmPasswordReset Server Action を連携している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("useActionState")
    expect(content).toContain("confirmPasswordReset")
  })

  // --- Error State ---
  it("サーバーエラー時のメッセージ表示を実装している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("message")
    expect(content).toContain("success")
  })

  it("リセットトークン無効時に再リクエストを促すテキストがある", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    // エラー時にパスワードリセットの再要求へ案内するリンクまたはテキスト
    expect(content).toContain("/auth/reset-password")
  })

  // --- Card Layout ---
  it("Card コンポーネントを使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("Card")
  })

  it("デザイントークンに準拠したカード幅 (w-[420px]) を使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("w-[420px]")
  })

  // --- Form Components ---
  it("shadcn/ui Form コンポーネントを使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("FormField")
    expect(content).toContain("FormItem")
    expect(content).toContain("FormMessage")
  })

  // --- Centering Pattern ---
  it("ログインページと同じセンタリングパターンを使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("min-h-screen")
    expect(content).toContain("items-center")
    expect(content).toContain("justify-center")
  })
})
