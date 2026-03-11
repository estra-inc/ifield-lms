/**
 * ProfileTab コンポーネントのテスト
 *
 * ProfileForm と AvatarUploader を統合するコンテナコンポーネントの検証。
 */

import fs from "fs"
import path from "path"

describe("ProfileTab (プロフィールタブ)", () => {
  const componentPath = path.resolve(
    __dirname,
    "../../../../../app/(authenticated)/settings/_components/profile-tab.tsx"
  )

  it("profile-tab.tsx ファイルが存在する", () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  it("Client Component である ('use client' ディレクティブがある)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(
      content.includes('"use client"') || content.includes("'use client'")
    ).toBe(true)
  })

  it("ProfileForm コンポーネントをインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("ProfileForm")
  })

  it("AvatarUploader コンポーネントをインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("AvatarUploader")
  })

  it("userProfile props を受け取っている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("userProfile")
  })

  it("UserProfile 型をエクスポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("UserProfile")
    expect(content).toContain("export")
  })

  it("ProfileTab をエクスポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("export")
    expect(content).toContain("ProfileTab")
  })
})
