
// @supabase/supabase-js の createClient をモック
const mockCreateClient = jest.fn().mockReturnValue({
  auth: { admin: {} },
})

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

// テスト前に環境変数をセット
const MOCK_SUPABASE_URL = "https://test.supabase.co"
const MOCK_SERVICE_ROLE_KEY = "test-service-role-key"

describe("Supabase Admin Client", () => {
  beforeEach(() => {
    jest.resetModules()
    mockCreateClient.mockClear()
    process.env.NEXT_PUBLIC_SUPABASE_URL = MOCK_SUPABASE_URL
    process.env.SUPABASE_SERVICE_ROLE_KEY = MOCK_SERVICE_ROLE_KEY
  })

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  it("createClient を正しい引数で呼び出す", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin")

    createAdminClient()

    expect(mockCreateClient).toHaveBeenCalledWith(
      MOCK_SUPABASE_URL,
      MOCK_SERVICE_ROLE_KEY,
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
        }),
      })
    )
  })

  it("NEXT_PUBLIC_SUPABASE_URL が未設定の場合にエラーをスローする", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const { createAdminClient } = await import("@/lib/supabase/admin")

    expect(() => createAdminClient()).toThrow("NEXT_PUBLIC_SUPABASE_URL")
  })

  it("SUPABASE_SERVICE_ROLE_KEY が未設定の場合にエラーをスローする", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const { createAdminClient } = await import("@/lib/supabase/admin")

    expect(() => createAdminClient()).toThrow("SUPABASE_SERVICE_ROLE_KEY")
  })

  it("service_role キーで RLS をバイパスするクライアントを返す", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin")

    const client = createAdminClient()

    expect(client).toBeDefined()
    expect(mockCreateClient).toHaveBeenCalledTimes(1)

    // service_role キーが第2引数として渡されている
    const callArgs = mockCreateClient.mock.calls[0]
    expect(callArgs[1]).toBe(MOCK_SERVICE_ROLE_KEY)
  })
})
