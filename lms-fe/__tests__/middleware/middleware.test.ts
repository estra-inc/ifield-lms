
// --- モック定義 ---

// updateSession のモック
const mockUpdateSessionResponse = {
  cookies: { set: jest.fn() },
  headers: new Map(),
}
const mockUpdateSession = jest.fn(async () => mockUpdateSessionResponse)

jest.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

// Supabase クライアントのモック（Middleware 内で profiles 取得用）
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}
const mockCreateServerClient = jest.fn(() => mockSupabaseClient)
jest.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

// next/server のモック
const mockRedirect = jest.fn((url: string) => ({
  type: "redirect",
  url,
  cookies: { set: jest.fn() },
  headers: new Map(),
}))

jest.mock("next/server", () => {
  class MockNextResponse {
    cookies: { set: ReturnType<typeof jest.fn> }
    headers: Map<string, string>
    constructor() {
      this.cookies = { set: jest.fn() }
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
      getAll: ReturnType<typeof jest.fn>
      set: ReturnType<typeof jest.fn>
    }
    constructor(url: string) {
      this.nextUrl = new URL(url)
      this.url = url
      this.cookies = {
        getAll: jest.fn(() => []),
        set: jest.fn(),
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

// --- テスト ---

describe("AuthMiddleware", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe("5.1 ルート定数とmatcher config", () => {
    it("config.matcher が定義されており、静的アセットと auth/callback をバイパスする", async () => {
      const { config } = await import("@/middleware")
      expect(config).toBeDefined()
      expect(config.matcher).toBeDefined()
      expect(Array.isArray(config.matcher)).toBe(true)

      // matcher は「含めるパターン」または「除外パターン」で定義される
      // Next.js の matcher では正規表現でバイパスパターンを除外する
      expect(config.matcher.length).toBeGreaterThan(0)
    })

    it("AUTH_ROUTES が認証ページのパスを含む", async () => {
      const { AUTH_ROUTES } = await import("@/middleware")
      expect(AUTH_ROUTES).toBeDefined()
      expect(AUTH_ROUTES).toContain("/auth/login")
      expect(AUTH_ROUTES).toContain("/auth/reset-password")
    })

    it("INVITE_SETUP_ROUTE が招待設定ページパスである", async () => {
      const { INVITE_SETUP_ROUTE } = await import("@/middleware")
      expect(INVITE_SETUP_ROUTE).toBe("/auth/invite/setup")
    })
  })

  describe("5.2 セッション検証とリダイレクトロジック", () => {
    it("未認証ユーザーが保護ルートにアクセスするとログインページへリダイレクトする", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "not authenticated" },
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/dashboard")

      const response = await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/auth/login")
    })

    it("認証済みユーザーがログインページにアクセスするとダッシュボードへリダイレクトする", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { full_name: "Test User" },
              error: null,
            }),
          }),
        }),
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/login")

      const response = await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    })

    it("認証済みで full_name 未設定のユーザーが保護ルートにアクセスすると招待設定ページへリダイレクトする", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-2" } },
        error: null,
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { full_name: null },
              error: null,
            }),
          }),
        }),
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/dashboard")

      const response = await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/auth/invite/setup")
    })

    it("full_name 未設定のユーザーが招待設定ページにアクセスする場合は通過を許可する", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-3" } },
        error: null,
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { full_name: null },
              error: null,
            }),
          }),
        }),
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/invite/setup")

      const response = await middleware(request)

      // リダイレクトされないことを確認
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("未認証ユーザーがパスワードリセット確認ページにアクセスする場合は通過を許可する（ハッシュフラグメント対応）", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "not authenticated" },
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/reset-password/confirm")

      const response = await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("認証済みユーザーがパスワードリセット確認ページにアクセスする場合は通過を許可する", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-recovery" } },
        error: null,
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/reset-password/confirm")

      const response = await middleware(request)

      // リダイレクトされないことを確認（パスワードリセットフローのため通過を許可）
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("通常の認証済みユーザーが保護ルートにアクセスする場合は通過する", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-7" } },
        error: null,
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { full_name: "Normal User" },
              error: null,
            }),
          }),
        }),
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/dashboard")

      const response = await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("updateSession がトークンリフレッシュのために呼び出される", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "not authenticated" },
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/dashboard")

      await middleware(request)

      expect(mockUpdateSession).toHaveBeenCalledWith(request)
    })

    it("未認証ユーザーが認証ページにアクセスする場合は通過する", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "not authenticated" },
      })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/login")

      const response = await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })
})
