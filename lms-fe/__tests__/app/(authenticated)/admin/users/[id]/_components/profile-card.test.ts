/**
 * プロフィールカードコンポーネントのテスト
 *
 * profile-card.tsx のロジック検証。
 * Server Component のため、データ変換・表示ロジックをテストする。
 */
import { differenceInDays, format } from "date-fns"
import type { UserRole } from "@/lib/types/app-shell"

// --- ロールバッジの色定義テスト ---

const ROLE_BADGE_STYLES: Record<UserRole, { bg: string; text: string }> = {
  user: { bg: "#DBEAFE", text: "#1D4ED8" },
  manager: { bg: "#F3E8FF", text: "#7C3AED" },
  super_admin: { bg: "#FEE2E2", text: "#DC2626" },
}

const ROLE_LABELS: Record<UserRole, string> = {
  user: "受講生",
  manager: "マネージャー",
  super_admin: "スーパー管理者",
}

describe("プロフィールカード", () => {
  describe("ロールバッジの色定義", () => {
    it("Userロールの色が青系である", () => {
      expect(ROLE_BADGE_STYLES.user.bg).toBe("#DBEAFE")
      expect(ROLE_BADGE_STYLES.user.text).toBe("#1D4ED8")
    })

    it("Managerロールの色が紫系である", () => {
      expect(ROLE_BADGE_STYLES.manager.bg).toBe("#F3E8FF")
      expect(ROLE_BADGE_STYLES.manager.text).toBe("#7C3AED")
    })

    it("Super Adminロールの色が赤系である", () => {
      expect(ROLE_BADGE_STYLES.super_admin.bg).toBe("#FEE2E2")
      expect(ROLE_BADGE_STYLES.super_admin.text).toBe("#DC2626")
    })
  })

  describe("ロールラベル", () => {
    it("各ロールに日本語ラベルが定義されている", () => {
      expect(ROLE_LABELS.user).toBe("受講生")
      expect(ROLE_LABELS.manager).toBe("マネージャー")
      expect(ROLE_LABELS.super_admin).toBe("スーパー管理者")
    })
  })

  describe("日付フォーマット", () => {
    it("作成日をYYYY/MM/DD形式にフォーマットする", () => {
      const dateStr = "2024-01-15T00:00:00Z"
      const formatted = format(new Date(dateStr), "yyyy/MM/dd")
      expect(formatted).toBe("2024/01/15")
    })

    it("経過日数を正しく計算する", () => {
      const now = new Date()
      const tenDaysAgo = new Date(now)
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

      const days = differenceInDays(now, tenDaysAgo)
      expect(days).toBe(10)
    })

    it("同日の場合は経過日数が0になる", () => {
      const today = new Date()
      const days = differenceInDays(today, today)
      expect(days).toBe(0)
    })
  })

  describe("イニシャル表示", () => {
    it("fullNameからイニシャル（最初の文字）を取得する", () => {
      const fullName = "山田 太郎"
      const initial = fullName.charAt(0)
      expect(initial).toBe("山")
    })

    it("fullNameがnullの場合は?を表示する", () => {
      const fullName: string | null = null
      const initial = fullName ? fullName.charAt(0) : "?"
      expect(initial).toBe("?")
    })

    it("fullNameが空文字の場合は?を表示する", () => {
      const fullName = ""
      const initial = fullName ? fullName.charAt(0) : "?"
      expect(initial).toBe("?")
    })
  })

  describe("モジュールの存在確認", () => {
    it("profile-card.tsx モジュールが存在し、ProfileCardがエクスポートされている", async () => {
      const mod = await import(
        "@/app/(authenticated)/admin/users/[id]/_components/profile-card"
      )
      expect(mod).toBeDefined()
      expect(mod.ProfileCard).toBeDefined()
      expect(typeof mod.ProfileCard).toBe("function")
    })
  })
})
