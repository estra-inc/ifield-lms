import fs from "fs"
import path from "path"

describe("InviteSetupPage (app/auth/invite/setup/page.tsx)", () => {
  const pagePath = path.resolve(
    __dirname,
    "../../../../../app/auth/invite/setup/page.tsx"
  )

  it("page.tsx ファイルが存在する", () => {
    expect(fs.existsSync(pagePath)).toBe(true)
  })

  it("Server Component である ('use client' ディレクティブがない)", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).not.toContain('"use client"')
    expect(content).not.toContain("'use client'")
  })

  it("InviteSetupForm コンポーネントをインポートしている", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toContain("InviteSetupForm")
  })

  it("default export されている", () => {
    const content = fs.readFileSync(pagePath, "utf-8")
    expect(content).toMatch(/export\s+default/)
  })
})

describe("InviteSetupForm (app/auth/invite/setup/invite-setup-form.tsx)", () => {
  const formPath = path.resolve(
    __dirname,
    "../../../../../app/auth/invite/setup/invite-setup-form.tsx"
  )

  it("invite-setup-form.tsx ファイルが存在する", () => {
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

  it("'アカウント設定' タイトルを表示する", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("アカウント設定")
  })

  // --- Step Management ---
  it("useState で 2 ステップ管理を行う (1 | 2)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("useState")
    // Step 1 or Step 2 state management pattern
    expect(content).toMatch(/useState.*[12]/)
  })

  // --- Step 1: Profile Setup ---
  it("Step 1: 姓のフィールドがある (lastName)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("lastName")
  })

  it("Step 1: 名のフィールドがある (firstName)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("firstName")
  })

  it("Step 1: アバターアップロードエリアがある", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("avatar")
  })

  it("Step 1: '次へ' ボタンがある", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("次へ")
  })

  // --- Step 2: Password Setup ---
  it("Step 2: パスワードフィールドがある", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("password")
  })

  it("Step 2: 確認用パスワードフィールドがある (confirmPassword)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("confirmPassword")
  })

  it("Step 2: 'アカウントを作成' ボタンがある", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("アカウントを作成")
  })

  it("Step 2: '戻る' リンクがある", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("戻る")
  })

  // --- Stepper UI ---
  it("ステッパー UI を実装している (step 1/2 の視覚的表示)", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    // Stepper should have step indicators with numbers or check marks
    expect(content).toMatch(/[Ss]tepper|step.*1|step.*2/)
  })

  // --- Validation ---
  it("react-hook-form を使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("useForm")
    expect(content).toContain("react-hook-form")
  })

  it("zodResolver で inviteSetupStep1Schema を使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("zodResolver")
    expect(content).toContain("inviteSetupStep1Schema")
  })

  it("zodResolver で inviteSetupStep2Schema を使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("inviteSetupStep2Schema")
  })

  // --- Server Action Integration ---
  it("useActionState で completeInviteSetup Server Action を連携している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("useActionState")
    expect(content).toContain("completeInviteSetup")
  })

  it("サーバーエラー時のメッセージ表示を実装している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("message")
    expect(content).toContain("success")
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

  // --- SubmitButton ---
  it("SubmitButton コンポーネントを使用している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("SubmitButton")
  })

  // --- FormData submission pattern ---
  it("Step 2 送信時に FormData で一括送信するパターンを実装している", () => {
    const content = fs.readFileSync(formPath, "utf-8")
    expect(content).toContain("FormData")
  })
})
