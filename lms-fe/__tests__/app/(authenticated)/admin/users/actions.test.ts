
// ---- Mock Setup ----

// next/navigation
const mockRedirect = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args)
    throw new Error("NEXT_REDIRECT")
  },
}))

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

// Supabase Anon Client (server.ts)
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockAnonClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue(mockAnonClient),
}))

// Supabase Admin Client (admin.ts)
const mockInviteUserByEmail = jest.fn()
const mockUpdateUserById = jest.fn()
const mockDeleteUser = jest.fn()
const mockAdminFrom = jest.fn()
const mockAdminClient = {
  auth: {
    admin: {
      inviteUserByEmail: mockInviteUserByEmail,
      updateUserById: mockUpdateUserById,
      deleteUser: mockDeleteUser,
    },
  },
  from: mockAdminFrom,
}

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn().mockReturnValue(mockAdminClient),
}))

// ---- Helpers ----

function createFormData(data: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value)
  }
  return formData
}

const SUPER_ADMIN_USER = {
  id: "a0a0a0a0-b1b1-4c2c-8d3d-e4e4e4e4e4e4",
  email: "admin@example.com",
}

const TARGET_USER_ID = "f5f5f5f5-a6a6-4b77-9c88-d9d9d9d9d9d9"

/** super_admin として認証されている状態をセットアップ */
function setupSuperAdminAuth() {
  mockGetUser.mockResolvedValue({
    data: { user: SUPER_ADMIN_USER },
    error: null,
  })

  // profiles から role を取得する際のモック
  const mockSingle = jest.fn().mockResolvedValue({
    data: { role: "super_admin" },
    error: null,
  })
  const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/** 未認証状態をセットアップ */
function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  })
}

/** 一般ユーザーとして認証されている状態をセットアップ */
function setupNonAdminAuth() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "regular-user-id", email: "user@example.com" } },
    error: null,
  })

  const mockSingle = jest.fn().mockResolvedValue({
    data: { role: "user" },
    error: null,
  })
  const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

// ---- Tests ----

describe("Server Actions: ユーザー管理", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================================
  // inviteUser
  // ============================================================
  describe("inviteUser", () => {
    it("super_admin が有効なデータで招待を実行し成功する", async () => {
      setupSuperAdminAuth()
      mockInviteUserByEmail.mockResolvedValue({
        data: { user: { id: "new-user-id" } },
        error: null,
      })

      const { inviteUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        email: "newuser@example.com",
        role: "user",
      })

      const result = await inviteUser(null, formData)

      expect(result).toEqual({
        success: true,
        message: expect.stringContaining("招待"),
      })
      expect(mockInviteUserByEmail).toHaveBeenCalledWith(
        "newuser@example.com",
        expect.objectContaining({
          data: { role: "user" },
        })
      )
    })

    it("未認証の場合にエラーを返す", async () => {
      setupUnauthenticated()

      const { inviteUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        email: "test@example.com",
        role: "user",
      })

      const result = await inviteUser(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
      expect(mockInviteUserByEmail).not.toHaveBeenCalled()
    })

    it("super_admin 以外のロールではエラーを返す", async () => {
      setupNonAdminAuth()

      const { inviteUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        email: "test@example.com",
        role: "user",
      })

      const result = await inviteUser(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
      expect(mockInviteUserByEmail).not.toHaveBeenCalled()
    })

    it("無効なメールアドレスの場合にバリデーションエラーを返す", async () => {
      setupSuperAdminAuth()

      const { inviteUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        email: "invalid-email",
        role: "user",
      })

      const result = await inviteUser(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("メールアドレス"),
      })
      expect(mockInviteUserByEmail).not.toHaveBeenCalled()
    })

    it("Supabase Auth API のエラーを適切にハンドリングする", async () => {
      setupSuperAdminAuth()
      mockInviteUserByEmail.mockResolvedValue({
        data: { user: null },
        error: { message: "User already registered" },
      })

      const { inviteUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        email: "existing@example.com",
        role: "user",
      })

      const result = await inviteUser(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })
  })

  // ============================================================
  // changeUserRole
  // ============================================================
  describe("changeUserRole", () => {
    it("super_admin がロール変更を実行し成功する", async () => {
      setupSuperAdminAuth()

      // Admin client の from().update().eq() モック
      const mockAdminEq = jest.fn().mockResolvedValue({
        error: null,
      })
      const mockAdminUpdate = jest.fn().mockReturnValue({ eq: mockAdminEq })
      const mockAdminSelect = jest.fn().mockReturnValue({ update: mockAdminUpdate })
      mockAdminFrom.mockReturnValue({ update: mockAdminUpdate })

      const { changeUserRole } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
        role: "manager",
      })

      const result = await changeUserRole(null, formData)

      expect(result).toEqual({
        success: true,
        message: expect.any(String),
      })
      expect(mockRevalidatePath).toHaveBeenCalled()
    })

    it("自分自身のロール変更を防止する", async () => {
      setupSuperAdminAuth()

      const { changeUserRole } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: SUPER_ADMIN_USER.id,
        role: "user",
      })

      const result = await changeUserRole(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("自分自身"),
      })
    })

    it("未認証の場合にエラーを返す", async () => {
      setupUnauthenticated()

      const { changeUserRole } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
        role: "manager",
      })

      const result = await changeUserRole(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })

    it("super_admin 以外のロールではエラーを返す", async () => {
      setupNonAdminAuth()

      const { changeUserRole } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
        role: "manager",
      })

      const result = await changeUserRole(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
    })

    it("無効な UUID の場合にバリデーションエラーを返す", async () => {
      setupSuperAdminAuth()

      const { changeUserRole } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: "not-a-uuid",
        role: "manager",
      })

      const result = await changeUserRole(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })
  })

  // ============================================================
  // deactivateUser
  // ============================================================
  describe("deactivateUser", () => {
    it("super_admin がアカウント無効化を実行し成功する", async () => {
      setupSuperAdminAuth()
      mockUpdateUserById.mockResolvedValue({
        data: { user: { id: TARGET_USER_ID } },
        error: null,
      })

      const { deactivateUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
      })

      const result = await deactivateUser(null, formData)

      expect(result).toEqual({
        success: true,
        message: expect.any(String),
      })
      expect(mockUpdateUserById).toHaveBeenCalledWith(
        TARGET_USER_ID,
        { ban_duration: "876000h" }
      )
      expect(mockRevalidatePath).toHaveBeenCalled()
    })

    it("自分自身の無効化を防止する", async () => {
      setupSuperAdminAuth()

      const { deactivateUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: SUPER_ADMIN_USER.id,
      })

      const result = await deactivateUser(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("自分自身"),
      })
      expect(mockUpdateUserById).not.toHaveBeenCalled()
    })

    it("未認証の場合にエラーを返す", async () => {
      setupUnauthenticated()

      const { deactivateUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
      })

      const result = await deactivateUser(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })

    it("Supabase Auth API のエラーを適切にハンドリングする", async () => {
      setupSuperAdminAuth()
      mockUpdateUserById.mockResolvedValue({
        data: { user: null },
        error: { message: "User not found" },
      })

      const { deactivateUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
      })

      const result = await deactivateUser(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })
  })

  // ============================================================
  // activateUser
  // ============================================================
  describe("activateUser", () => {
    it("super_admin がアカウント有効化を実行し成功する", async () => {
      setupSuperAdminAuth()
      mockUpdateUserById.mockResolvedValue({
        data: { user: { id: TARGET_USER_ID } },
        error: null,
      })

      const { activateUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
      })

      const result = await activateUser(null, formData)

      expect(result).toEqual({
        success: true,
        message: expect.any(String),
      })
      expect(mockUpdateUserById).toHaveBeenCalledWith(
        TARGET_USER_ID,
        { ban_duration: "none" }
      )
      expect(mockRevalidatePath).toHaveBeenCalled()
    })

    it("未認証の場合にエラーを返す", async () => {
      setupUnauthenticated()

      const { activateUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
      })

      const result = await activateUser(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })

    it("super_admin 以外のロールではエラーを返す", async () => {
      setupNonAdminAuth()

      const { activateUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
      })

      const result = await activateUser(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
    })

    it("Supabase Auth API のエラーを適切にハンドリングする", async () => {
      setupSuperAdminAuth()
      mockUpdateUserById.mockResolvedValue({
        data: { user: null },
        error: { message: "User not found" },
      })

      const { activateUser } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
      })

      const result = await activateUser(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })
  })

  // ============================================================
  // deleteUserPermanently
  // ============================================================
  describe("deleteUserPermanently", () => {
    it("super_admin が物理削除を実行し成功する", async () => {
      setupSuperAdminAuth()
      mockDeleteUser.mockResolvedValue({
        data: { user: { id: TARGET_USER_ID } },
        error: null,
      })

      const { deleteUserPermanently } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
      })

      const result = await deleteUserPermanently(null, formData)

      expect(result).toEqual({
        success: true,
        message: expect.any(String),
      })
      expect(mockDeleteUser).toHaveBeenCalledWith(TARGET_USER_ID)
      expect(mockRevalidatePath).toHaveBeenCalled()
    })

    it("自分自身の物理削除を防止する", async () => {
      setupSuperAdminAuth()

      const { deleteUserPermanently } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: SUPER_ADMIN_USER.id,
      })

      const result = await deleteUserPermanently(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("自分自身"),
      })
      expect(mockDeleteUser).not.toHaveBeenCalled()
    })

    it("未認証の場合にエラーを返す", async () => {
      setupUnauthenticated()

      const { deleteUserPermanently } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
      })

      const result = await deleteUserPermanently(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })

    it("super_admin 以外のロールではエラーを返す", async () => {
      setupNonAdminAuth()

      const { deleteUserPermanently } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
      })

      const result = await deleteUserPermanently(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
    })

    it("Supabase Auth API のエラーを適切にハンドリングする", async () => {
      setupSuperAdminAuth()
      mockDeleteUser.mockResolvedValue({
        data: { user: null },
        error: { message: "User not found" },
      })

      const { deleteUserPermanently } = await import(
        "@/app/(authenticated)/admin/users/actions"
      )
      const formData = createFormData({
        userId: TARGET_USER_ID,
      })

      const result = await deleteUserPermanently(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })
  })
})
