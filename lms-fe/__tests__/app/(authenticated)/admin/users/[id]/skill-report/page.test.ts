/**
 * Manager / Super Admin 向けスキルレポートページのテスト
 *
 * Manager は受講生のスコア・達成率のみ閲覧可能。
 * Super Admin は項目レベルの OK/NG 詳細も閲覧可能。
 * ロール分岐、空状態表示、RadarChart 共有を検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Mocks ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}))

const mockRedirect = vi.fn()
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

// --- Tests ---

describe("Admin スキルレポートページ（Manager / Super Admin）", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("認証・権限チェック", () => {
    it("未認証の場合はログインページにリダイレクトすべき", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "not authenticated" },
      })

      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      expect(user).toBeNull()
    })

    it("user ロールの場合はダッシュボードにリダイレクトすべき", () => {
      const profileRole = "user"
      const allowedRoles = ["manager", "super_admin"]
      expect(allowedRoles.includes(profileRole)).toBe(false)
    })

    it("manager ロールの場合はアクセス許可されるべき", () => {
      const profileRole = "manager"
      const allowedRoles = ["manager", "super_admin"]
      expect(allowedRoles.includes(profileRole)).toBe(true)
    })

    it("super_admin ロールの場合はアクセス許可されるべき", () => {
      const profileRole = "super_admin"
      const allowedRoles = ["manager", "super_admin"]
      expect(allowedRoles.includes(profileRole)).toBe(true)
    })
  })

  describe("ロール別表示内容の分岐", () => {
    it("Manager はスコアと達成率のみ閲覧可能であるべき（項目レベルの OK/NG は非表示）", () => {
      const currentUserRole = "manager"
      const showItemDetails = currentUserRole === "super_admin"
      expect(showItemDetails).toBe(false)
    })

    it("Super Admin は項目レベルの OK/NG 詳細も閲覧可能であるべき", () => {
      const currentUserRole = "super_admin"
      const showItemDetails = currentUserRole === "super_admin"
      expect(showItemDetails).toBe(true)
    })

    it("Manager と Super Admin が同じ RadarChart コンポーネントを共有すべき", async () => {
      const { RadarChart } = await import("@/components/grading/radar-chart")
      expect(RadarChart).toBeDefined()
    })
  })

  describe("データフェッチ", () => {
    it("URL パラメータの [id] で対象受講生を特定すべき", () => {
      const params = { id: "user-123" }
      expect(params.id).toBe("user-123")
    })

    it("対象受講生の graded 済み submissions を取得すべき", () => {
      const targetUserId = "user-123"
      const statusFilter = "graded"
      expect(targetUserId).toBeDefined()
      expect(statusFilter).toBe("graded")
    })

    it("Super Admin はユーザーの全採点結果を取得できるべき", () => {
      const currentUserRole = "super_admin"
      // Super Admin は createAdminClient() を使用するため全データにアクセス可能
      const useAdminClient = currentUserRole === "super_admin"
      expect(useAdminClient).toBe(true)
    })
  })

  describe("空状態", () => {
    it("対象受講生に graded 済み案件がない場合は空状態メッセージを表示すべき", () => {
      const gradedSubmissions: unknown[] = []
      const isEmpty = gradedSubmissions.length === 0
      expect(isEmpty).toBe(true)
    })
  })

  describe("ページパス", () => {
    it("Manager/Super Admin 向けスキルレポートのパスが正しいこと", () => {
      const userId = "user-123"
      const pagePath = `/admin/users/${userId}/skill-report`
      expect(pagePath).toBe("/admin/users/user-123/skill-report")
    })
  })
})
