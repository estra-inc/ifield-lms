/**
 * Middleware の模擬案件パス受講期間チェックテスト
 *
 * Task 4.1: /projects パスに graduation_date チェック追加
 * Requirements: 8.1, 8.4
 *
 * 認証済みユーザーが /projects/* パスにアクセスした際、
 * graduation_date に基づくアクセス制御を検証する。
 * 既存の /contents パスのチェックロジックと同一のロジックを再利用する。
 */

// --- モック定義 ---

const mockSelect = vi.fn()
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: mockFrom,
}

const mockSupabaseResponse = {
  cookies: { set: vi.fn() },
  headers: new Map(),
}

const mockUpdateSession = vi.fn()

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

const mockRedirect = vi.fn((url: string) => ({
  type: "redirect",
  url,
  cookies: { set: vi.fn() },
  headers: new Map(),
}))

vi.mock("next/server", () => {
  class MockNextResponse {
    cookies: { set: ReturnType<typeof vi.fn> }
    headers: Map<string, string>
    constructor() {
      this.cookies = { set: vi.fn() }
      this.headers = new Map()
    }
    static next(options?: { request: unknown }) {
      const instance = new MockNextResponse()
      return Object.assign(instance, { request: options?.request })
    }
    static redirect(url: URL) {
      return mockRedirect(url.pathname)
    }
  }

  class MockNextRequest {
    nextUrl: URL
    url: string
    cookies: {
      getAll: ReturnType<typeof vi.fn>
      set: ReturnType<typeof vi.fn>
    }
    constructor(url: string) {
      this.nextUrl = new URL(url)
      this.url = url
      this.cookies = {
        getAll: vi.fn(() => []),
        set: vi.fn(),
      }
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: MockNextRequest,
  }
})

// --- ヘルパー ---

function createMockRequest(pathname: string) {
  const { NextRequest } = require("next/server")
  return new NextRequest(`http://localhost:3000${pathname}`)
}

/**
 * updateSession のモックを設定する。
 */
function setupUpdateSession(user: { id: string } | null) {
  mockUpdateSession.mockResolvedValue({
    supabaseResponse: mockSupabaseResponse,
    user,
    supabase: mockSupabaseClient,
  })
}

/**
 * profiles クエリのチェインモックを設定する。
 */
function setupProfileQuery(profile: {
  full_name: string | null
  graduation_date?: string | null
}) {
  mockSelect.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: profile,
        error: null,
      }),
    }),
  })
}

// --- テスト ---

describe("Middleware 模擬案件パス受講期間チェック (Task 4.1)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // ==============================
  // graduation_date による /projects パスのアクセス制御
  // ==============================
  describe("graduation_date による /projects パスのアクセス制御", () => {
    it("受講期間切れユーザーが /projects にアクセスするとダッシュボードへリダイレクトする", async () => {
      setupUpdateSession({ id: "user-expired" })
      setupProfileQuery({
        full_name: "期限切れユーザー",
        graduation_date: "2025-01-01",
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/projects")

      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    })

    it("受講期間切れユーザーが /projects/some-slug にアクセスするとダッシュボードへリダイレクトする", async () => {
      setupUpdateSession({ id: "user-expired-2" })
      setupProfileQuery({
        full_name: "期限切れユーザー2",
        graduation_date: "2025-06-15",
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/projects/ec-site-project")

      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    })

    it("受講期間内のユーザーが /projects にアクセスする場合は通過する", async () => {
      setupUpdateSession({ id: "user-active" })
      setupProfileQuery({
        full_name: "アクティブユーザー",
        graduation_date: "2099-12-31",
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/projects")

      await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("graduation_date が NULL のユーザーが /projects にアクセスする場合は通過する（制限なし）", async () => {
      setupUpdateSession({ id: "user-no-graduation" })
      setupProfileQuery({
        full_name: "制限なしユーザー",
        graduation_date: null,
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/projects")

      await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("graduation_date が今日の日付の場合はアクセスを許可する（当日はまだ有効）", async () => {
      setupUpdateSession({ id: "user-today" })
      const today = new Date().toISOString().split("T")[0]
      setupProfileQuery({
        full_name: "今日が期限のユーザー",
        graduation_date: today,
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/projects")

      await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  // ==============================
  // 既存の /contents パスとの共存
  // ==============================
  describe("既存の /contents パスとの共存", () => {
    it("受講期間切れユーザーが /contents にアクセスしても引き続きダッシュボードへリダイレクトする", async () => {
      setupUpdateSession({ id: "user-expired-contents" })
      setupProfileQuery({
        full_name: "期限切れユーザー",
        graduation_date: "2025-01-01",
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/contents")

      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    })

    it("/projects 以外のパス（/dashboard 等）はチェックをスキップする", async () => {
      setupUpdateSession({ id: "user-expired-dashboard" })
      setupProfileQuery({
        full_name: "期限切れだが非コンテンツ",
        graduation_date: "2025-01-01",
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/dashboard")

      await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  // ==============================
  // 未認証ユーザー
  // ==============================
  describe("未認証ユーザー", () => {
    it("未認証ユーザーが /projects にアクセスするとログインページへリダイレクトされる", async () => {
      setupUpdateSession(null)

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/projects")

      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/auth/login")
    })
  })
})
