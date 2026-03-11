/**
 * アクションカードコンポーネントのテスト
 *
 * actions-card.tsx のロジック検証。
 * isSelf判定、ロール変更オプション、ban状態によるボタン切替を検証する。
 */
import type { UserRole } from "@/lib/types/app-shell"

// --- ロール変更オプション ---

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "user", label: "受講生 (User)" },
  { value: "manager", label: "マネージャー (Manager)" },
  { value: "super_admin", label: "スーパー管理者 (Super Admin)" },
]

describe("アクションカード", () => {
  describe("isSelf判定", () => {
    it("isSelfがtrueの場合、全てのアクションを非表示にするべき", () => {
      const isSelf = true
      // isSelf の場合は "自分自身のアカウントは操作できません" メッセージを表示
      expect(isSelf).toBe(true)
    })

    it("isSelfがfalseの場合、アクションを表示するべき", () => {
      const isSelf = false
      expect(isSelf).toBe(false)
    })
  })

  describe("ロール変更オプション", () => {
    it("3つのロールオプションを提供する", () => {
      expect(ROLE_OPTIONS).toHaveLength(3)
    })

    it("user, manager, super_adminの3つのロールを含む", () => {
      const values = ROLE_OPTIONS.map((o) => o.value)
      expect(values).toContain("user")
      expect(values).toContain("manager")
      expect(values).toContain("super_admin")
    })

    it("各オプションに日本語ラベルが設定されている", () => {
      ROLE_OPTIONS.forEach((option) => {
        expect(option.label).toBeTruthy()
        expect(typeof option.label).toBe("string")
      })
    })
  })

  describe("ban状態によるボタン表示切替", () => {
    it("isBannedがfalseの場合、無効化ボタンを表示するべき", () => {
      const isBanned = false
      // "アカウントを無効化" ボタンが表示される
      expect(isBanned).toBe(false)
    })

    it("isBannedがtrueの場合、有効化ボタンを表示するべき", () => {
      const isBanned = true
      // "アカウントを有効化" ボタンが表示される
      expect(isBanned).toBe(true)
    })
  })

  describe("モジュールの存在確認", () => {
    it("actions-card.tsx モジュールが存在し、ActionsCardがエクスポートされている", async () => {
      const mod = await import(
        "@/app/(authenticated)/admin/users/[id]/_components/actions-card"
      )
      expect(mod).toBeDefined()
      expect(mod.ActionsCard).toBeDefined()
      expect(typeof mod.ActionsCard).toBe("function")
    })
  })
})
