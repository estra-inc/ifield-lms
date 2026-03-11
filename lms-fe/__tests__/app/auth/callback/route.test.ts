import { NextRequest } from "next/server"

// --- Mocks ---

const mockVerifyOtp = jest.fn()
const mockExchangeCodeForSession = jest.fn()
const mockFrom = jest.fn()

const mockSupabaseClient = {
  auth: {
    verifyOtp: mockVerifyOtp,
    exchangeCodeForSession: mockExchangeCodeForSession,
  },
  from: mockFrom,
}

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabaseClient),
}))

// --- Helper ---
function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"))
}

// --- Tests ---

describe("Auth コールバック Route Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("type=invite", () => {
    it("verifyOtp で招待トークンを検証する", async () => {
      const { GET } = await import("@/app/auth/callback/route")

      mockVerifyOtp.mockResolvedValue({
        data: { user: { id: "user-123" } },
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

      const request = createRequest(
        "/auth/callback?token_hash=abc123&type=invite"
      )
      await GET(request)

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: "abc123",
        type: "invite",
      })
    })

    it("トークン検証成功・full_name 未設定の場合 /auth/invite/setup へリダイレクトする", async () => {
      const { GET } = await import("@/app/auth/callback/route")

      mockVerifyOtp.mockResolvedValue({
        data: { user: { id: "user-123" } },
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

      const request = createRequest(
        "/auth/callback?token_hash=abc123&type=invite"
      )
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("Location")
      expect(location).toContain("/auth/invite/setup")
    })

    it("トークン検証成功・full_name 設定済みの場合 /dashboard へリダイレクトする", async () => {
      const { GET } = await import("@/app/auth/callback/route")

      mockVerifyOtp.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      })
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { full_name: "山田 太郎" },
              error: null,
            }),
          }),
        }),
      })

      const request = createRequest(
        "/auth/callback?token_hash=abc123&type=invite"
      )
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("Location")
      expect(location).toContain("/dashboard")
    })

    it("トークン検証失敗の場合 /auth/invite/error へリダイレクトする", async () => {
      const { GET } = await import("@/app/auth/callback/route")

      mockVerifyOtp.mockResolvedValue({
        data: { user: null },
        error: { message: "Token expired" },
      })

      const request = createRequest(
        "/auth/callback?token_hash=expired_token&type=invite"
      )
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("Location")
      expect(location).toContain("/auth/invite/error")
    })
  })

  describe("type=recovery", () => {
    it("exchangeCodeForSession でセッションを確立する", async () => {
      const { GET } = await import("@/app/auth/callback/route")

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } },
        error: null,
      })

      const request = createRequest(
        "/auth/callback?code=recovery_code_123&type=recovery"
      )
      await GET(request)

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith(
        "recovery_code_123"
      )
    })

    it("セッション確立成功の場合 /auth/reset-password/confirm へリダイレクトする", async () => {
      const { GET } = await import("@/app/auth/callback/route")

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: { user: { id: "user-123" } } },
        error: null,
      })

      const request = createRequest(
        "/auth/callback?code=recovery_code_123&type=recovery"
      )
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("Location")
      expect(location).toContain("/auth/reset-password/confirm")
    })

    it("セッション確立失敗の場合 /auth/login へエラー付きでリダイレクトする", async () => {
      const { GET } = await import("@/app/auth/callback/route")

      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Invalid code" },
      })

      const request = createRequest(
        "/auth/callback?code=invalid_code&type=recovery"
      )
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("Location")
      expect(location).toContain("/auth/login")
      expect(location).toContain("error=")
    })
  })

  describe("不正な type パラメータ", () => {
    it("type が不正な場合 /auth/login へリダイレクトする", async () => {
      const { GET } = await import("@/app/auth/callback/route")

      const request = createRequest("/auth/callback?type=unknown")
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("Location")
      expect(location).toContain("/auth/login")
    })

    it("type パラメータがない場合 /auth/login へリダイレクトする", async () => {
      const { GET } = await import("@/app/auth/callback/route")

      const request = createRequest("/auth/callback")
      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("Location")
      expect(location).toContain("/auth/login")
    })
  })
})
