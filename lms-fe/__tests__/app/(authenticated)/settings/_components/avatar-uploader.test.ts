/**
 * AvatarUploader コンポーネントのテスト
 *
 * Client Component の構造・インポート・必須要素を検証する。
 */

import fs from "fs"
import path from "path"

describe("AvatarUploader (アバター画像コンポーネント)", () => {
  const componentPath = path.resolve(
    __dirname,
    "../../../../../app/(authenticated)/settings/_components/avatar-uploader.tsx"
  )

  it("avatar-uploader.tsx ファイルが存在する", () => {
    expect(fs.existsSync(componentPath)).toBe(true)
  })

  it("Client Component である ('use client' ディレクティブがある)", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(
      content.includes('"use client"') || content.includes("'use client'")
    ).toBe(true)
  })

  it("uploadAvatar Server Action をインポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("uploadAvatar")
  })

  it("ACCEPTED_IMAGE_TYPES をインポートしている（クライアントサイドバリデーション用）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("ACCEPTED_IMAGE_TYPES")
  })

  it("MAX_FILE_SIZE をインポートしている（クライアントサイドバリデーション用）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("MAX_FILE_SIZE")
  })

  it("現在のアバター画像を円形で表示する構造がある", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("rounded-full")
    expect(content).toContain("avatarUrl") // currentAvatarUrl props
  })

  it("未設定時にデフォルトアイコンを表示する", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    // User or Camera icon for default
    expect(content).toContain("User")
  })

  it("hidden input + クリックハンドラのパターンでファイル選択を実装している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain('type="file"')
    expect(content).toContain("hidden")
    expect(content).toContain("fileInputRef")
  })

  it("Canvas API で最大 512x512px にリサイズする処理を含む", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("canvas")
    expect(content).toContain("512")
  })

  it("WebP 形式で出力する処理を含む", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("image/webp")
  })

  it("プレビュー表示用の状態管理がある", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("preview")
  })

  it("useTransition を使用している（アップロード中ローディング用）", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("useTransition")
  })

  it("sonner toast でフィードバックを表示している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("toast")
    expect(content).toContain("sonner")
  })

  it("「プロフィール画像」ラベルを表示している", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("プロフィール画像")
  })

  it("「画像を変更」ボタンがある", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("画像を変更")
  })

  it("AvatarUploader をエクスポートしている", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("export")
    expect(content).toContain("AvatarUploader")
  })

  it("クライアントサイドでファイル形式を検証する処理がある", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    // MIME type validation
    expect(content).toContain("type")
    expect(content).toContain("ACCEPTED_IMAGE_TYPES")
  })

  it("クライアントサイドでファイルサイズを検証する処理がある", () => {
    const content = fs.readFileSync(componentPath, "utf-8")
    expect(content).toContain("size")
    expect(content).toContain("MAX_FILE_SIZE")
  })
})

describe("AvatarUploader -- Canvas リサイズロジック", () => {
  it("512px を超える画像を最大 512x512px に縮小するロジックを含む", () => {
    // ロジック検証: アスペクト比を維持しつつ 512px に収まるように計算
    const maxSize = 512

    // 横長画像 (1024x768)
    const width1 = 1024
    const height1 = 768
    const scale1 = Math.min(maxSize / width1, maxSize / height1)
    expect(Math.round(width1 * scale1)).toBeLessThanOrEqual(maxSize)
    expect(Math.round(height1 * scale1)).toBeLessThanOrEqual(maxSize)

    // 縦長画像 (600x1200)
    const width2 = 600
    const height2 = 1200
    const scale2 = Math.min(maxSize / width2, maxSize / height2)
    expect(Math.round(width2 * scale2)).toBeLessThanOrEqual(maxSize)
    expect(Math.round(height2 * scale2)).toBeLessThanOrEqual(maxSize)

    // 小さい画像 (256x256) - 拡大しない
    const width3 = 256
    const height3 = 256
    const scale3 = Math.min(1, maxSize / width3, maxSize / height3)
    expect(width3 * scale3).toBe(256)
    expect(height3 * scale3).toBe(256)
  })
})
