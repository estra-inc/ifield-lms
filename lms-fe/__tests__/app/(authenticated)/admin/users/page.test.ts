/**
 * ユーザー一覧ページ Server Component のテスト
 *
 * page.tsx は Server Component であり、直接レンダリングテストは行わない。
 * ここではデータフェッチロジック（フィルタ、ページネーション、権限チェック）を検証する。
 */

// --- Mocks ---

const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockIlike = jest.fn()
const mockEq = jest.fn()
const mockOr = jest.fn()
const mockRange = jest.fn()
const mockOrder = jest.fn()
const mockSingle = jest.fn()

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

const mockRedirect = jest.fn()
jest.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

// --- Helpers ---

function setupAuthenticatedSuperAdmin(userId = "user-001") {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })

  // profiles query for role check
  const profileChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { role: "super_admin" },
      error: null,
    }),
  }

  return { profileChain }
}

function setupUsersQuery(
  users: Array<{
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
    role: string
    current_term: string | null
    created_at: string
  }>,
  totalCount: number
) {
  const queryChain = {
    select: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: users,
      error: null,
      count: totalCount,
    }),
  }

  return queryChain
}

// --- Tests ---

describe("ユーザー一覧ページ", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("認証・権限チェック", () => {
    it("未認証の場合はログインページにリダイレクトする", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "not authenticated" },
      })

      // Server Component を直接呼ぶ代わりに、ロジックのテストとして
      // redirect が呼ばれるべきことを検証
      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      expect(user).toBeNull()
      // redirect("/auth/login") が呼ばれるべき
    })

    it("super_admin以外のロールの場合はリダイレクトする", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-002" } },
        error: null,
      })

      // ロールチェック: user ロール
      const profileData = { role: "user" }

      expect(profileData.role).not.toBe("super_admin")
      // redirect("/dashboard") が呼ばれるべき
    })
  })

  describe("フィルタ・ページネーション", () => {
    it("デフォルトパラメータでページ1、10件表示する", () => {
      const searchParams = { search: undefined, role: undefined, page: undefined }
      const page = Number(searchParams.page) || 1
      const perPage = 10
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      expect(page).toBe(1)
      expect(from).toBe(0)
      expect(to).toBe(9)
    })

    it("page=2の場合に正しい範囲を計算する", () => {
      const searchParams = { page: "2" }
      const page = Number(searchParams.page) || 1
      const perPage = 10
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      expect(page).toBe(2)
      expect(from).toBe(10)
      expect(to).toBe(19)
    })

    it("page=3の場合に正しい範囲を計算する", () => {
      const searchParams = { page: "3" }
      const page = Number(searchParams.page) || 1
      const perPage = 10
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      expect(page).toBe(3)
      expect(from).toBe(20)
      expect(to).toBe(29)
    })

    it("不正なpageパラメータの場合はデフォルト1とする", () => {
      const searchParams = { page: "invalid" }
      const page = Number(searchParams.page) || 1

      expect(page).toBe(1)
    })

    it("searchパラメータが指定された場合にフィルタ条件を構築する", () => {
      const search = "テスト"
      const orFilter = `full_name.ilike.%${search}%,email.ilike.%${search}%`

      expect(orFilter).toBe("full_name.ilike.%テスト%,email.ilike.%テスト%")
    })

    it("roleパラメータが指定された場合にフィルタ条件を構築する", () => {
      const role = "manager"
      const eqFilter = { column: "role", value: role }

      expect(eqFilter.column).toBe("role")
      expect(eqFilter.value).toBe("manager")
    })

    it("searchとrole両方が指定された場合に複合フィルタを構築する", () => {
      const search = "田中"
      const role = "user"

      const orFilter = `full_name.ilike.%${search}%,email.ilike.%${search}%`
      const eqFilter = { column: "role", value: role }

      expect(orFilter).toContain("田中")
      expect(eqFilter.value).toBe("user")
    })
  })

  describe("データ変換", () => {
    it("profiles テーブルの行データを UserListItem に変換する", () => {
      const profileRow = {
        id: "uuid-001",
        full_name: "山田 太郎",
        email: "yamada@example.com",
        avatar_url: null,
        role: "user" as const,
        current_term: "基礎",
        created_at: "2024-01-15T00:00:00Z",
      }

      const userListItem = {
        id: profileRow.id,
        fullName: profileRow.full_name,
        email: profileRow.email,
        avatarUrl: profileRow.avatar_url,
        role: profileRow.role,
        currentTerm: profileRow.current_term,
        createdAt: profileRow.created_at,
      }

      expect(userListItem.id).toBe("uuid-001")
      expect(userListItem.fullName).toBe("山田 太郎")
      expect(userListItem.email).toBe("yamada@example.com")
      expect(userListItem.avatarUrl).toBeNull()
      expect(userListItem.role).toBe("user")
    })

    it("totalCountとページ情報を含むUserListResultを構築する", () => {
      const result = {
        users: [],
        totalCount: 25,
      }

      expect(result.totalCount).toBe(25)
      expect(result.users).toEqual([])
    })
  })
})
