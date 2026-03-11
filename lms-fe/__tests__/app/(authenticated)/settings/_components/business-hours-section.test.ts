/**
 * BusinessHoursSection コンポーネントのテスト
 *
 * Client Component の構造・インポート・必須要素を検証する。
 */

import fs from "fs"
import path from "path"

describe("BusinessHoursSection (稼働時間枠設定 UI)", () => {
  const componentPath = path.resolve(
    __dirname,
    "../../../../../app/(authenticated)/settings/_components/business-hours-section.tsx"
  )

  it("business-hours-section.tsx ファイルが存在する", () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  it("Client Component である ('use client' ディレクティブがある)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(
      content.includes('"use client"') || content.includes("'use client'")
    ).toBe(true)
  })

  it("updateBusinessHours Server Action をインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("updateBusinessHours")
  })

  it("7列（月〜日）のカレンダーヘッダーが定義されている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("月")
    expect(content).toContain("火")
    expect(content).toContain("水")
    expect(content).toContain("木")
    expect(content).toContain("金")
    expect(content).toContain("土")
    expect(content).toContain("日")
  })

  it("曜日キー定義がある (mon, tue, wed, thu, fri, sat, sun)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("mon")
    expect(content).toContain("tue")
    expect(content).toContain("wed")
    expect(content).toContain("thu")
    expect(content).toContain("fri")
    expect(content).toContain("sat")
    expect(content).toContain("sun")
  })

  it("時間帯の行ラベルが存在する (09:00 等)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    // 少なくとも基本的な営業時間帯が含まれていること
    expect(content).toContain("09:00")
  })

  it("クリックでトグルするハンドラが実装されている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    // toggle 関連の関数名が存在すること
    expect(content).toMatch(/toggle|onClick|handleClick/i)
  })

  it("useState でローカル状態を管理している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("useState")
  })

  it("保存ボタンが存在する", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("保存")
  })

  it("「祝日もシフトを入れる」チェックボックスが存在する", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("祝日")
  })

  it("「前後の確保時間」入力が存在する", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("確保時間")
  })

  it("「1枠のスロット時間」入力が存在する", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("スロット時間")
  })

  it("sonner toast でフィードバックを表示している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("toast")
    expect(content).toContain("sonner")
  })

  it("ローディング状態を管理している (useTransition)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("useTransition")
  })

  it("モバイルで横スクロール可能なレイアウトがある (overflow-x-auto)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("overflow-x-auto")
  })

  it("BusinessHoursSection をエクスポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("export")
    expect(content).toContain("BusinessHoursSection")
  })

  it("initialBusinessHours props を受け取っている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("initialBusinessHours")
  })

  it("土曜日ヘッダーに indigo 系カラーが使用されている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toMatch(/indigo/)
  })

  it("日曜日ヘッダーに destructive/red 系カラーが使用されている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toMatch(/red|destructive/)
  })

  it("凡例（アクティブ/非アクティブ）の表示がある", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toMatch(/稼働|アクティブ|active/i)
    expect(content).toMatch(/非稼働|非アクティブ|inactive/i)
  })
})
