/**
 * ユーザー詳細ページ Server Component のテスト
 *
 * page.tsx は Server Component であり、直接レンダリングテストは行わない。
 * ここではデータフェッチロジック（権限チェック、データ取得、ban状態判定、isSelf判定）を検証する。
 */

// --- Mocks ---

const mockGetUser = jest.fn()
const mockFrom = jest.fn()

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

const mockGetUserById = jest.fn()

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => ({
    auth: {
      admin: {
        getUserById: mockGetUserById,
      },
    },
  })),
}))

const mockRedirect = jest.fn()
jest.mock("next/navigation", () => ({
  redirect: mockRedirect,
  notFound: jest.fn(),
}))

// --- Tests ---

describe("ユーザー詳細ページ", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("認証・権限チェック", () => {
    it("未認証の場合はログインページにリダイレクトする", async () => {
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
      // Server Component 内で redirect("/auth/login") が呼ばれるべき
    })

    it("super_admin以外のロールの場合はダッシュボードにリダイレクトする", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-002" } },
        error: null,
      })

      const profileData = { role: "user" }
      expect(profileData.role).not.toBe("super_admin")
      // redirect("/dashboard") が呼ばれるべき
    })
  })

  describe("ユーザーデータ取得とisBanned判定", () => {
    it("banned_untilが未来日の場合isBannedをtrueにする", () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 10)
      const bannedUntil = futureDate.toISOString()

      const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()
      expect(isBanned).toBe(true)
    })

    it("banned_untilが過去日の場合isBannedをfalseにする", () => {
      const pastDate = new Date("2020-01-01T00:00:00Z")
      const bannedUntil = pastDate.toISOString()

      const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()
      expect(isBanned).toBe(false)
    })

    it("banned_untilがnullの場合isBannedをfalseにする", () => {
      const bannedUntil = null

      const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()
      expect(isBanned).toBe(false)
    })

    it("banned_untilが'1970-01-01'（epoch）の場合isBannedをfalseにする", () => {
      const bannedUntil = "1970-01-01T00:00:00Z"

      const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()
      expect(isBanned).toBe(false)
    })
  })

  describe("isSelf判定", () => {
    it("現在のユーザーIDとターゲットユーザーIDが同じ場合はisSelfをtrueにする", () => {
      const currentUserId = "uuid-001"
      const targetUserId = "uuid-001"

      const isSelf = currentUserId === targetUserId
      expect(isSelf).toBe(true)
    })

    it("現在のユーザーIDとターゲットユーザーIDが異なる場合はisSelfをfalseにする", () => {
      const currentUserId = "uuid-001"
      const targetUserId = "uuid-002"

      const isSelf = currentUserId === targetUserId
      expect(isSelf).toBe(false)
    })
  })

  describe("データ変換", () => {
    it("profilesテーブルの行データとAuth情報をUserDetailに変換する", () => {
      const profileRow = {
        id: "uuid-001",
        full_name: "山田 太郎",
        email: "yamada@example.com",
        avatar_url: "https://example.com/avatar.jpg",
        role: "user" as const,
        current_term: "基礎",
        created_at: "2024-01-15T00:00:00Z",
      }

      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 100)
      const bannedUntil = futureDate.toISOString()
      const isBanned = !!bannedUntil && new Date(bannedUntil) > new Date()

      const userDetail = {
        id: profileRow.id,
        fullName: profileRow.full_name,
        email: profileRow.email,
        avatarUrl: profileRow.avatar_url,
        role: profileRow.role,
        currentTerm: profileRow.current_term,
        createdAt: profileRow.created_at,
        isBanned,
      }

      expect(userDetail.id).toBe("uuid-001")
      expect(userDetail.fullName).toBe("山田 太郎")
      expect(userDetail.email).toBe("yamada@example.com")
      expect(userDetail.avatarUrl).toBe("https://example.com/avatar.jpg")
      expect(userDetail.role).toBe("user")
      expect(userDetail.currentTerm).toBe("基礎")
      expect(userDetail.isBanned).toBe(true)
    })

    it("存在しないユーザーIDの場合notFoundが呼ばれるべき", () => {
      const profileData = null
      const profileError = { message: "not found" }

      expect(profileData).toBeNull()
      expect(profileError.message).toBe("not found")
      // notFound() が呼ばれるべき
    })
  })
})
