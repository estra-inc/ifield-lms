
// モック: @supabase/ssr
const mockCreateServerClient = jest.fn(() => ({
  auth: {
    getUser: jest.fn(async () => ({
      data: { user: { id: "test-user-id" } },
      error: null,
    })),
  },
}))
jest.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

// モック: next/server
jest.mock("next/server", () => {
  class MockNextResponse {
    cookies: {
      set: ReturnType<typeof jest.fn>
    }
    constructor() {
      this.cookies = { set: jest.fn() }
    }
    static next(options?: { request: unknown }) {
      const instance = new MockNextResponse()
      return Object.assign(instance, { request: options?.request })
    }
  }

  return {
    NextResponse: MockNextResponse,
  }
})

describe("SupabaseMiddlewareClient (updateSession)", () => {
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

  it("updateSession が NextResponse を返す", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware")

    const mockRequest = {
      cookies: {
        getAll: jest.fn(() => []),
        set: jest.fn(),
      },
    }

    const response = await updateSession(mockRequest as never)

    expect(response).toBeDefined()
  })

  it("createServerClient に getAll と setAll を含む cookies オプションを渡す", async () => {
    const { updateSession } = await import("@/lib/supabase/middleware")

    const mockRequest = {
      cookies: {
        getAll: jest.fn(() => []),
        set: jest.fn(),
      },
    }

    await updateSession(mockRequest as never)

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    )
  })

  it("NEXT_PUBLIC_SUPABASE_URL が未設定の場合にエラーをスローする", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const { updateSession } = await import("@/lib/supabase/middleware")

    const mockRequest = {
      cookies: {
        getAll: jest.fn(() => []),
        set: jest.fn(),
      },
    }

    await expect(updateSession(mockRequest as never)).rejects.toThrow(
      "NEXT_PUBLIC_SUPABASE_URL"
    )
  })

  it("NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定の場合にエラーをスローする", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const { updateSession } = await import("@/lib/supabase/middleware")

    const mockRequest = {
      cookies: {
        getAll: jest.fn(() => []),
        set: jest.fn(),
      },
    }

    await expect(updateSession(mockRequest as never)).rejects.toThrow(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
  })
})
