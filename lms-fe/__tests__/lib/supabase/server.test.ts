
// モック: next/headers
const mockGetAll = jest.fn(() => [])
const mockSet = jest.fn()
jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    getAll: mockGetAll,
    set: mockSet,
  })),
}))

// モック: @supabase/ssr
const mockCreateServerClient = jest.fn(() => ({ auth: {} }))
jest.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

describe("SupabaseServerClient", () => {
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

  it("createServerClient を使用して Supabase サーバークライアントを生成する", async () => {
    const { createClient } = await import("@/lib/supabase/server")

    const client = await createClient()

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
    expect(client).toBeDefined()
  })

  it("cookies オプションに getAll と setAll が含まれている", async () => {
    const { createClient } = await import("@/lib/supabase/server")

    await createClient()

    const callArgs = mockCreateServerClient.mock.calls[0]
    const options = callArgs[2] as { cookies: { getAll: () => void; setAll: () => void } }

    expect(typeof options.cookies.getAll).toBe("function")
    expect(typeof options.cookies.setAll).toBe("function")
  })

  it("NEXT_PUBLIC_SUPABASE_URL が未設定の場合にエラーをスローする", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const { createClient } = await import("@/lib/supabase/server")

    await expect(createClient()).rejects.toThrow("NEXT_PUBLIC_SUPABASE_URL")
  })

  it("NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定の場合にエラーをスローする", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const { createClient } = await import("@/lib/supabase/server")

    await expect(createClient()).rejects.toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  })
})
