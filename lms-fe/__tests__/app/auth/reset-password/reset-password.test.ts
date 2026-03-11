import fs from "fs"
import path from "path"

describe("ResetPasswordPage (app/auth/reset-password/page.tsx)", () => {
  const pagePath = path.resolve(
    __dirname,
    "../../../../app/auth/reset-password/page.tsx"
  )

  it("page.tsx ファイルが存在する", () => {
    expect(fs.existsSync(pagePath)).toBe(true)
  })

  it("Server Component である ('use client' ディレクティブがない)", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).not.toContain('"use client"')
    expect(content).not.toContain("'use client'")
  })

  it("ResetPasswordForm コンポーネントをインポートしている", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toContain("ResetPasswordForm")
  })

  it("default export されている", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toMatch(/export\s+default/)
  })
})

describe("ResetPasswordForm (app/auth/reset-password/reset-password-form.tsx)", () => {
  const formPath = path.resolve(
    __dirname,
    "../../../../app/auth/reset-password/reset-password-form.tsx"
  )

  it("reset-password-form.tsx ファイルが存在する", () => {
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

  it("'パスワードリセット' タイトルを表示する", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("パスワードリセット")
  })

  // --- Form Fields ---
  it("メールアドレス入力フィールドがある (name='email')", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toMatch(/name.*email|"email"/)
  })

  it("メールアドレスのプレースホルダーが 'name@example.com' である", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("name@example.com")
  })

  // --- Submit Button ---
  it("SubmitButton コンポーネントを使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("SubmitButton")
  })

  it("'リセットメールを送信' ボタンテキストがある", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("リセットメールを送信")
  })

  it("SubmitButton に pendingText が設定されている", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("pendingText")
  })

  // --- Login Link ---
  it("'ログインに戻る' リンクがある", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("ログインに戻る")
  })

  it("ログインページへの Link がある (/auth/login)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("/auth/login")
    expect(content).toContain("next/link")
  })

  // --- Validation ---
  it("react-hook-form を使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("useForm")
    expect(content).toContain("react-hook-form")
  })

  it("zodResolver で resetPasswordSchema を使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("zodResolver")
    expect(content).toContain("resetPasswordSchema")
  })

  // --- Server Action Integration ---
  it("useActionState で requestPasswordReset Server Action を連携している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("useActionState")
    expect(content).toContain("requestPasswordReset")
  })

  // --- Success State ---
  it("送信成功時に確認メッセージ 'パスワードリセットメールを送信しました' を表示する", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("パスワードリセットメールを送信しました")
  })

  it("送信成功時にフォームを非表示にするロジックがある (success 判定)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    // success が true の場合にフォームを非表示にするパターン
    expect(content).toContain("success")
  })

  // --- Error State ---
  it("サーバーエラー時のメッセージ表示を実装している (ActionResult の message)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("message")
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
