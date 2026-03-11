
// ---- Mock Setup ----

// next/cache
const mockRevalidatePath = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
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

// next/headers (cookies) -- required because actions.ts imports from next/headers
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

/** Admin Client の UPSERT チェーンモックをセットアップ */
function setupAdminUpsert(error: { message: string } | null = null) {
  const mockAdminEq = vi.fn().mockResolvedValue({ error })
  const mockAdminUpdate = vi.fn().mockReturnValue({ eq: mockAdminEq })
  mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })
  return { mockAdminUpdate, mockAdminEq }
}

/** 有効な business_hours JSON を作成 */
function createValidBusinessHoursJson(): string {
  return JSON.stringify({
    slots: { mon_0900: true, mon_1000: true, tue_0900: false },
    holidayShift: false,
    bufferMinutes: 15,
    slotDurationMinutes: 60,
  })
}

function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value)
  }
  return formData
}

// ---- Tests ----

describe("Server Actions: updateBusinessHours (稼働時間枠保存)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("Super Admin が有効なデータで稼働時間枠を保存し成功する", async () => {
    setupSuperAdmin()
    const { mockAdminUpdate, mockAdminEq } = setupAdminUpsert()

    const { updateBusinessHours } = await import(
      "@/app/(authenticated)/settings/actions"
    )
    const formData = createFormData({
      businessHours: createValidBusinessHoursJson(),
    })

    const result = await updateBusinessHours(null, formData)

    expect(result).toEqual({
      success: true,
      message: expect.any(String),
    })
    expect(mockAdminUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        business_hours: expect.objectContaining({
          slots: expect.any(Object),
          holidayShift: false,
          bufferMinutes: 15,
          slotDurationMinutes: 60,
        }),
      })
    )
    expect(mockAdminEq).toHaveBeenCalledWith("service_name", "google_calendar")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/settings")
  })

  it("未認証の場合にエラーを返す", async () => {
    setupUnauthenticated()

    const { updateBusinessHours } = await import(
      "@/app/(authenticated)/settings/actions"
    )
    const formData = createFormData({
      businessHours: createValidBusinessHoursJson(),
    })

    const result = await updateBusinessHours(null, formData)

    expect(result).toEqual({
      success: false,
      message: expect.stringContaining("認証"),
    })
  })

  it("一般ユーザーの場合に権限エラーを返す", async () => {
    setupRegularUser()

    const { updateBusinessHours } = await import(
      "@/app/(authenticated)/settings/actions"
    )
    const formData = createFormData({
      businessHours: createValidBusinessHoursJson(),
    })

    const result = await updateBusinessHours(null, formData)

    expect(result).toEqual({
      success: false,
      message: expect.stringContaining("権限"),
    })
  })

  it("不正な JSON の場合にバリデーションエラーを返す", async () => {
    setupSuperAdmin()

    const { updateBusinessHours } = await import(
      "@/app/(authenticated)/settings/actions"
    )
    const formData = createFormData({
      businessHours: "invalid-json",
    })

    const result = await updateBusinessHours(null, formData)

    expect(result).toEqual({
      success: false,
      message: expect.any(String),
    })
  })

  it("businessHours フィールドが空の場合にエラーを返す", async () => {
    setupSuperAdmin()

    const { updateBusinessHours } = await import(
      "@/app/(authenticated)/settings/actions"
    )
    const formData = new FormData()

    const result = await updateBusinessHours(null, formData)

    expect(result).toEqual({
      success: false,
      message: expect.any(String),
    })
  })

  it("bufferMinutes が範囲外 (121) の場合にバリデーションエラーを返す", async () => {
    setupSuperAdmin()

    const { updateBusinessHours } = await import(
      "@/app/(authenticated)/settings/actions"
    )
    const formData = createFormData({
      businessHours: JSON.stringify({
        slots: {},
        holidayShift: false,
        bufferMinutes: 121,
        slotDurationMinutes: 60,
      }),
    })

    const result = await updateBusinessHours(null, formData)

    expect(result).toEqual({
      success: false,
      message: expect.any(String),
    })
  })

  it("slotDurationMinutes が範囲外 (10) の場合にバリデーションエラーを返す", async () => {
    setupSuperAdmin()

    const { updateBusinessHours } = await import(
      "@/app/(authenticated)/settings/actions"
    )
    const formData = createFormData({
      businessHours: JSON.stringify({
        slots: {},
        holidayShift: false,
        bufferMinutes: 0,
        slotDurationMinutes: 10,
      }),
    })

    const result = await updateBusinessHours(null, formData)

    expect(result).toEqual({
      success: false,
      message: expect.any(String),
    })
  })

  it("DB 更新エラー時に適切なエラーメッセージを返す", async () => {
    setupSuperAdmin()
    setupAdminUpsert({ message: "DB error" })

    const { updateBusinessHours } = await import(
      "@/app/(authenticated)/settings/actions"
    )
    const formData = createFormData({
      businessHours: createValidBusinessHoursJson(),
    })

    const result = await updateBusinessHours(null, formData)

    expect(result).toEqual({
      success: false,
      message: expect.any(String),
    })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it("成功後に revalidatePath('/settings') を呼び出す", async () => {
    setupSuperAdmin()
    setupAdminUpsert()

    const { updateBusinessHours } = await import(
      "@/app/(authenticated)/settings/actions"
    )
    const formData = createFormData({
      businessHours: createValidBusinessHoursJson(),
    })

    await updateBusinessHours(null, formData)

    expect(mockRevalidatePath).toHaveBeenCalledWith("/settings")
  })
})
