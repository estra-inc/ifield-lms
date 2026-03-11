/**
 * 設定ページのレスポンシブデザインテスト
 *
 * 各コンポーネントのモバイル対応に関する構造的検証。
 */

import fs from "fs"
import path from "path"

const SETTINGS_DIR = path.resolve(
  __dirname,
  "../../../../app/(authenticated)/settings"
)

describe("設定ページ: レスポンシブデザイン", () => {
  describe("page.tsx", () => {
    const pagePath = path.join(SETTINGS_DIR, "page.tsx")

    it("レスポンシブ対応のパディングがある (px クラスが定義されている)", () => {
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toMatch(/px-\d+|px-\[/)
    })

    it("コンテンツの最大幅制限がある (max-w クラスが定義されている)", () => {
      const content = fs.readFileSync(pagePath, "utf-8")
      expect(content).toMatch(/max-w-/)
    })
  })

  describe("profile-tab.tsx", () => {
    const componentPath = path.join(
      SETTINGS_DIR,
      "_components/profile-tab.tsx"
    )

    it("最大幅制限がある (max-w クラスが定義されている)", () => {
      const content = fs.readFileSync(componentPath, "utf-8")
      expect(content).toMatch(/max-w-/)
    })

    it("flex レイアウトでレスポンシブな配置がある", () => {
      const content = fs.readFileSync(componentPath, "utf-8")
      expect(content).toContain("flex")
    })
  })

  describe("account-tab.tsx", () => {
    const componentPath = path.join(
      SETTINGS_DIR,
      "_components/account-tab.tsx"
    )

    it("最大幅制限がある (max-w クラスが定義されている)", () => {
      const content = fs.readFileSync(componentPath, "utf-8")
      expect(content).toMatch(/max-w-/)
    })

    it("flex レイアウトでレスポンシブな配置がある", () => {
      const content = fs.readFileSync(componentPath, "utf-8")
      expect(content).toContain("flex")
    })
  })

  describe("business-hours-section.tsx", () => {
    const componentPath = path.join(
      SETTINGS_DIR,
      "_components/business-hours-section.tsx"
    )

    it("グリッドテーブルが横スクロール可能 (overflow-x-auto)", () => {
      const content = fs.readFileSync(componentPath, "utf-8")
      expect(content).toContain("overflow-x-auto")
    })

    it("テーブルに最小幅が設定されている (min-w)", () => {
      const content = fs.readFileSync(componentPath, "utf-8")
      expect(content).toMatch(/min-w-/)
    })

    it("オプション入力がフレキシブルにラップされる (flex-wrap)", () => {
      const content = fs.readFileSync(componentPath, "utf-8")
      expect(content).toContain("flex-wrap")
    })
  })

  describe("avatar-uploader.tsx", () => {
    const componentPath = path.join(
      SETTINGS_DIR,
      "_components/avatar-uploader.tsx"
    )

    it("アバター画像のサイズが定義されている", () => {
      const content = fs.readFileSync(componentPath, "utf-8")
      // width/height or size class
      expect(content).toMatch(/w-\d+|h-\d+|size-\d+/)
    })
  })
})
