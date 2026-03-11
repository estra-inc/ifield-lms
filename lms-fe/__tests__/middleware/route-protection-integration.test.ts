
/**
 * ルート保護の統合確認テスト (Task 11.2)
 *
 * Middleware が既存の (authenticated) ルートを適切に保護していることを確認する。
 * 既存の middleware.test.ts と重複しない追加シナリオをカバーする。
 */

// --- モック定義 ---

const mockUpdateSessionResponse = {
  cookies: { set: jest.fn() },
  headers: new Map(),
}
const mockUpdateSession = jest.fn(async () => mockUpdateSessionResponse)

jest.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

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

function mockAuthenticatedUser(profile: {
  full_name: string | null
}) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-integration" } },
    error: null,
  })
  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: profile,
          error: null,
        }),
      }),
    }),
  })
}

function mockUnauthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "not authenticated" },
  })
}

// --- テスト ---

describe("ルート保護の統合確認", () => {
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

  describe("未認証ユーザーのリダイレクト", () => {
    it("未認証で /contents にアクセスすると /auth/login へリダイレクトする", async () => {
      mockUnauthenticatedUser()

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/contents")
      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/auth/login")
    })

    it("未認証で /settings にアクセスすると /auth/login へリダイレクトする", async () => {
      mockUnauthenticatedUser()

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/settings")
      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/auth/login")
    })

    it("未認証で /auth/reset-password にアクセスすると通過を許可する", async () => {
      mockUnauthenticatedUser()

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/reset-password")
      await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("未認証で /auth/reset-password/confirm にアクセスすると通過を許可する（ハッシュフラグメントからセッション確立）", async () => {
      mockUnauthenticatedUser()

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/reset-password/confirm")
      await middleware(request)

      // ハッシュフラグメントでトークンが届くため未認証でも通過を許可
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it("未認証で /auth/invite/setup にアクセスすると通過を許可する", async () => {
      mockUnauthenticatedUser()

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/invite/setup")
      await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe("認証済みユーザーの認証ページリダイレクト", () => {
    it("認証済みで /auth/login にアクセスすると /dashboard へリダイレクトする", async () => {
      mockAuthenticatedUser({ full_name: "Test User" })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/login")
      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    })

    it("認証済みで /auth/reset-password にアクセスすると /dashboard へリダイレクトする", async () => {
      mockAuthenticatedUser({ full_name: "Test User" })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/reset-password")
      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    })

    it("認証済みで /auth/reset-password/confirm にアクセスすると通過を許可する（パスワードリセットフロー）", async () => {
      mockAuthenticatedUser({ full_name: "Test User" })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/reset-password/confirm")
      await middleware(request)

      // パスワードリセット確認ページはリカバリーフローで認証済みユーザーが使うため通過を許可
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe("招待未完了 (full_name null) のリダイレクト", () => {
    it("full_name 未設定で /dashboard にアクセスすると /auth/invite/setup へリダイレクトする", async () => {
      mockAuthenticatedUser({ full_name: null })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/dashboard")
      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/auth/invite/setup")
    })

    it("full_name 未設定で /contents にアクセスすると /auth/invite/setup へリダイレクトする", async () => {
      mockAuthenticatedUser({ full_name: null })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/contents")
      await middleware(request)

      expect(mockRedirect).toHaveBeenCalledWith("/auth/invite/setup")
    })

    it("full_name 未設定で /auth/invite/setup 自体にアクセスする場合は通過する", async () => {
      mockAuthenticatedUser({ full_name: null })

      const { default: middleware } = await import("@/middleware")
      const request = createMockRequest("/auth/invite/setup")
      await middleware(request)

      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })
})
