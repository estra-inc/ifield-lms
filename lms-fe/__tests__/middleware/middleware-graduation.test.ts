/**
 * Middleware の受講期間チェック拡張テスト
 *
 * 認証済みユーザーが /contents/* パスにアクセスした際、
 * graduation_date に基づくアクセス制御を検証する。
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
 * user が null の場合は未認証状態をシミュレートする。
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
 * graduation_date を含むレスポンスを返す。
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

describe("Middleware 受講期間チェック拡張", () => {
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

  describe("graduation_date による /contents パスのアクセス制御", () => {
    it("受講期間切れユーザーが /contents にアクセスするとダッシュボードへリダイレクトする", async () => {
      setupUpdateSession({ id: "user-expired" })
      setupProfileQuery({
        full_name: "期限切れユーザー",
        graduation_date: "2025-01-01",
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/contents")

      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    })

    it("受講期間切れユーザーが /contents/tutorial/chapter/section にアクセスするとダッシュボードへリダイレクトする", async () => {
      setupUpdateSession({ id: "user-expired-2" })
      setupProfileQuery({
        full_name: "期限切れユーザー2",
        graduation_date: "2025-06-15",
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest(
        "/contents/html-css-basics/chapter1/intro"
      )

      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    })

    it("受講期間内のユーザーが /contents にアクセスする場合は通過する", async () => {
      setupUpdateSession({ id: "user-active" })
      setupProfileQuery({
        full_name: "アクティブユーザー",
        graduation_date: "2099-12-31",
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/contents")

      await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("graduation_date が NULL のユーザーが /contents にアクセスする場合は通過する（制限なし）", async () => {
      setupUpdateSession({ id: "user-no-graduation" })
      setupProfileQuery({
        full_name: "制限なしユーザー",
        graduation_date: null,
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/contents")

      await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("受講期間切れユーザーが /contents 以外のパスにアクセスする場合はチェックをスキップする", async () => {
      setupUpdateSession({ id: "user-expired-3" })
      setupProfileQuery({
        full_name: "期限切れだが非コンテンツ",
        graduation_date: "2025-01-01",
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/dashboard")

      await middleware(request)

      // /dashboard へのアクセスはリダイレクトされない
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
      const request = createMockRequest("/contents")

      await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe("profiles クエリの拡張", () => {
    it("profiles クエリに graduation_date カラムが含まれる", async () => {
      setupUpdateSession({ id: "user-query-check" })
      setupProfileQuery({
        full_name: "テスト",
        graduation_date: null,
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/contents")

      await middleware(request)

      // select 呼び出し時に graduation_date が含まれていること
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining("graduation_date")
      )
    })
  })

  describe("既存のルート保護との共存", () => {
    it("未認証ユーザーは引き続きログインページへリダイレクトされる", async () => {
      setupUpdateSession(null)

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/contents")

      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/auth/login")
    })

    it("full_name 未設定のユーザーは引き続き招待設定ページへリダイレクトされる", async () => {
      setupUpdateSession({ id: "user-no-name" })
      setupProfileQuery({
        full_name: null,
        graduation_date: null,
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/contents")

      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/auth/invite/setup")
    })
  })
})
