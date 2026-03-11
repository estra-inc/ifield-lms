/**
 * GoogleCalendarSection コンポーネントのテスト
 *
 * Client Component の構造・インポート・必須要素を検証する。
 */

import fs from "fs"
import path from "path"

describe("GoogleCalendarSection (Google Calendar 連携 UI)", () => {
  const componentPath = path.resolve(
    __dirname,
    "../../../../../app/(authenticated)/settings/_components/google-calendar-section.tsx"
  )

  it("google-calendar-section.tsx ファイルが存在する", () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  it("Client Component である ('use client' ディレクティブがある)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(
      content.includes('"use client"') || content.includes("'use client'")
    ).toBe(true)
  })

  it("initiateGoogleOAuth Server Action をインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("initiateGoogleOAuth")
  })

  it("disconnectGoogle Server Action をインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("disconnectGoogle")
  })

  it("連携ステータスバッジを表示する（連携済み / 未連携）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("Badge")
    expect(content).toContain("連携済み")
    expect(content).toContain("未連携")
  })

  it("連携ボタンを表示する", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("連携する")
  })

  it("連携解除ボタンを表示する", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("連携解除")
  })

  it("AlertDialog を使用して連携解除の確認ダイアログを表示する", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("AlertDialog")
  })

  it("OAuth URL 取得後に window.location.href でリダイレクトする", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("window.location.href")
  })

  it("sonner toast でフィードバックを表示している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("toast")
    expect(content).toContain("sonner")
  })

  it("isConnected props を受け取って表示を切り替える", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("isConnected")
  })

  it("connectedAt props を受け取っている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("connectedAt")
  })

  it("useTransition を使用している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("useTransition")
  })

  it("error クエリパラメータを処理する (useSearchParams)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("useSearchParams")
  })

  it("GoogleCalendarSection をエクスポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("export")
    expect(content).toContain("GoogleCalendarSection")
  })
})
