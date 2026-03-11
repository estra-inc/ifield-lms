
// @supabase/ssr をモック
jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(() => ({ auth: {} })),
}))

describe("SupabaseBrowserClient", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("createBrowserClient を使用して Supabase クライアントを生成する", async () => {
    const { createBrowserClient } = await import("@supabase/ssr")
    const { createClient } = await import("@/lib/supabase/client")

    const client = createClient()

    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key"
    )
    expect(client).toBeDefined()
  })

  it("NEXT_PUBLIC_SUPABASE_URL が未設定の場合にエラーをスローする", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const { createClient } = await import("@/lib/supabase/client")

    expect(() => createClient()).toThrow("NEXT_PUBLIC_SUPABASE_URL")
  })

  it("NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定の場合にエラーをスローする", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const { createClient } = await import("@/lib/supabase/client")

    expect(() => createClient()).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  })
})
