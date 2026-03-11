
// ---- Mock Setup ----

// next/cache
const mockRevalidatePath = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

// next/headers (cookies)
const mockCookiesSet = vi.fn()
const mockCookiesGet = vi.fn()
const mockCookiesDelete = vi.fn()
const mockCookieStore = {
  set: mockCookiesSet,
  get: mockCookiesGet,
  delete: mockCookiesDelete,
  getAll: vi.fn().mockReturnValue([]),
  has: vi.fn(),
}

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

// Supabase Anon Client (server.ts)
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockAnonClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockAnonClient),
}))

// Supabase Admin Client (admin.ts)
const mockAdminFrom = vi.fn()
const mockAdminClient = {
  from: mockAdminFrom,
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue(mockAdminClient),
}))

// ---- Helpers ----

const MOCK_SUPER_ADMIN = {
  id: "a0a0a0a0-b1b1-4c2c-8d3d-e4e4e4e4e4e4",
  email: "admin@example.com",
}

/** 認証済み Super Admin の状態をセットアップ */
function setupSuperAdmin() {
  mockGetUser.mockResolvedValue({
    data: { user: MOCK_SUPER_ADMIN },
    error: null,
  })

  // profiles テーブルから role を取得するモック
  const mockSingle = vi.fn().mockResolvedValue({
    data: { role: "super_admin" },
    error: null,
  })
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/** 認証済み一般ユーザーの状態をセットアップ */
function setupRegularUser() {
  mockGetUser.mockResolvedValue({
    data: { user: MOCK_SUPER_ADMIN },
    error: null,
  })

  const mockSingle = vi.fn().mockResolvedValue({
    data: { role: "user" },
    error: null,
  })
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/** 未認証状態をセットアップ */
function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  })
}

// ---- Tests ----

describe("Server Actions: Google Calendar 連携", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 環境変数のセットアップ
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id")
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret")
    vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/google/callback")
    vi.stubEnv("GOOGLE_TOKEN_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ============================================================
  // initiateGoogleOAuth
  // ============================================================
  describe("initiateGoogleOAuth", () => {
    it("Super Admin が OAuth 認可 URL を取得できる", async () => {
      setupSuperAdmin()

      const { initiateGoogleOAuth } = await import(
        "@/app/(authenticated)/settings/actions"
      )

      const result = await initiateGoogleOAuth()

      expect(result.success).toBe(true)
      expect(result.url).toBeDefined()
      expect(result.url).toContain("accounts.google.com")
    })

    it("OAuth URL に必須パラメータが含まれている", async () => {
      setupSuperAdmin()

      const { initiateGoogleOAuth } = await import(
        "@/app/(authenticated)/settings/actions"
      )

      const result = await initiateGoogleOAuth()

      expect(result.url).toContain("access_type=offline")
      expect(result.url).toContain("prompt=consent")
      expect(result.url).toContain("calendar.readonly")
      expect(result.url).toContain("client_id=test-client-id")
      expect(result.url).toContain("state=")
    })

    it("CSRF 対策として state トークンを Cookie に保存する", async () => {
      setupSuperAdmin()

      const { initiateGoogleOAuth } = await import(
        "@/app/(authenticated)/settings/actions"
      )

      await initiateGoogleOAuth()

      expect(mockCookiesSet).toHaveBeenCalledWith(
        "google_oauth_state",
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: expect.any(Boolean),
          maxAge: expect.any(Number),
        })
      )
    })

    it("未認証の場合にエラーを返す", async () => {
      setupUnauthenticated()

      const { initiateGoogleOAuth } = await import(
        "@/app/(authenticated)/settings/actions"
      )

      const result = await initiateGoogleOAuth()

      expect(result.success).toBe(false)
      expect(result.url).toBeUndefined()
    })

    it("一般ユーザーの場合に権限エラーを返す", async () => {
      setupRegularUser()

      const { initiateGoogleOAuth } = await import(
        "@/app/(authenticated)/settings/actions"
      )

      const result = await initiateGoogleOAuth()

      expect(result.success).toBe(false)
      expect(result.message).toContain("権限")
    })
  })

  // ============================================================
  // disconnectGoogle
  // ============================================================
  describe("disconnectGoogle", () => {
    it("Super Admin が Google Calendar 連携を解除できる", async () => {
      setupSuperAdmin()

      // Admin client の system_integrations update モック
      const mockAdminEq = vi.fn().mockResolvedValue({ error: null })
      const mockAdminUpdate = vi.fn().mockReturnValue({ eq: mockAdminEq })
      mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })

      const { disconnectGoogle } = await import(
        "@/app/(authenticated)/settings/actions"
      )

      const result = await disconnectGoogle(null, new FormData())

      expect(result).toEqual({
        success: true,
        message: expect.any(String),
      })
    })

    it("encrypted_refresh_token と connected_at を NULL に更新する", async () => {
      setupSuperAdmin()

      const mockAdminEq = vi.fn().mockResolvedValue({ error: null })
      const mockAdminUpdate = vi.fn().mockReturnValue({ eq: mockAdminEq })
      mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })

      const { disconnectGoogle } = await import(
        "@/app/(authenticated)/settings/actions"
      )

      await disconnectGoogle(null, new FormData())

      expect(mockAdminUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          encrypted_refresh_token: null,
          connected_at: null,
        })
      )
    })

    it("未認証の場合にエラーを返す", async () => {
      setupUnauthenticated()

      const { disconnectGoogle } = await import(
        "@/app/(authenticated)/settings/actions"
      )

      const result = await disconnectGoogle(null, new FormData())

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("認証"),
      })
    })

    it("一般ユーザーの場合に権限エラーを返す", async () => {
      setupRegularUser()

      const { disconnectGoogle } = await import(
        "@/app/(authenticated)/settings/actions"
      )

      const result = await disconnectGoogle(null, new FormData())

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
    })

    it("DB 更新エラー時に適切なエラーメッセージを返す", async () => {
      setupSuperAdmin()

      const mockAdminEq = vi.fn().mockResolvedValue({
        error: { message: "DB error" },
      })
      const mockAdminUpdate = vi.fn().mockReturnValue({ eq: mockAdminEq })
      mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })

      const { disconnectGoogle } = await import(
        "@/app/(authenticated)/settings/actions"
      )

      const result = await disconnectGoogle(null, new FormData())

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })

    it("成功後に revalidatePath を呼び出す", async () => {
      setupSuperAdmin()

      const mockAdminEq = vi.fn().mockResolvedValue({ error: null })
      const mockAdminUpdate = vi.fn().mockReturnValue({ eq: mockAdminEq })
      mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })

      const { disconnectGoogle } = await import(
        "@/app/(authenticated)/settings/actions"
      )

      await disconnectGoogle(null, new FormData())

      expect(mockRevalidatePath).toHaveBeenCalledWith("/settings")
    })
  })
})
