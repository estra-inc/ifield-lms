import fs from "fs"
import path from "path"

describe("LoginPage (app/auth/login/page.tsx)", () => {
  const pagePath = path.resolve(
    __dirname,
    "../../../../app/auth/login/page.tsx"
  )

  it("page.tsx ファイルが存在する", () => {
    expect(fs.existsSync(pagePath)).toBe(true)
  })

  it("Server Component である ('use client' ディレクティブがない)", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).not.toContain('"use client"')
    expect(content).not.toContain("'use client'")
  })

  it("LoginForm コンポーネントをインポートしている", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toContain("LoginForm")
  })

  it("default export されている", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toMatch(/export\s+default/)
  })
})

describe("LoginForm (app/auth/login/login-form.tsx)", () => {
  const formPath = path.resolve(
    __dirname,
    "../../../../app/auth/login/login-form.tsx"
  )

  it("login-form.tsx ファイルが存在する", () => {
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

  it("'LMS にログイン' タイトルを表示する", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("LMS にログイン")
  })

  // --- Form Fields ---
  it("メールアドレス入力フィールドがある (name='email')", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toMatch(/name.*email|"email"/)
  })

  it("パスワード入力フィールドがある (name='password')", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toMatch(/name.*password|"password"/)
  })

  // --- Password Reset Link ---
  it("'パスワードを忘れた方はこちら' リンクがある", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("パスワードを忘れた方はこちら")
  })

  it("パスワードリセットページへの Link がある (/auth/reset-password)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("/auth/reset-password")
    expect(content).toContain("next/link")
  })

  // --- Submit Button ---
  it("SubmitButton コンポーネントを使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("SubmitButton")
  })

  it("SubmitButton に pendingText='ログイン中...' を設定している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("ログイン中...")
  })

  // --- Footer ---
  it("招待メール案内テキストを含む", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("招待")
  })

  // --- Validation ---
  it("react-hook-form を使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("useForm")
    expect(content).toContain("react-hook-form")
  })

  it("zodResolver で loginSchema を使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("zodResolver")
    expect(content).toContain("loginSchema")
  })

  // --- Server Action Integration ---
  it("useActionState で login Server Action を連携している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("useActionState")
    expect(content).toContain("login")
  })

  it("サーバーエラー時のメッセージ表示を実装している (ActionResult の message)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    // state が null でない場合にメッセージを表示するロジック
    expect(content).toContain("message")
    expect(content).toContain("success")
  })

  // --- URL Parameter ---
  it("useSearchParams でクエリパラメータを取得している (?message=password-updated)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("useSearchParams")
    expect(content).toContain("password-updated")
  })

  // --- Card Layout ---
  it("Card コンポーネントを使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("Card")
  })

  // --- Form Components ---
  it("shadcn/ui Form コンポーネントを使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("FormField")
    expect(content).toContain("FormItem")
    expect(content).toContain("FormMessage")
  })
})
