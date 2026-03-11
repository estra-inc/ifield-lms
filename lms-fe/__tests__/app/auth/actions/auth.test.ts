
// --- Mocks ---

// Mock next/navigation
const mockRedirect = jest.fn()
jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args)
    // redirect() in Next.js throws an error to halt execution
    throw new Error("NEXT_REDIRECT")
  },
}))

// Mock next/headers
const mockCookieStore = {
  getAll: jest.fn().mockReturnValue([]),
  set: jest.fn(),
  delete: jest.fn(),
}
jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue(mockCookieStore),
  headers: jest.fn().mockResolvedValue(
    new Map([["origin", "http://localhost:3000"]])
  ),
}))

// Mock Supabase client
const mockSignInWithPassword = jest.fn()
const mockSignOut = jest.fn()
const mockUpdateUser = jest.fn()
const mockResetPasswordForEmail = jest.fn()
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockStorageFrom = jest.fn()
const mockStorageUpload = jest.fn()

const mockSupabaseClient = {
  auth: {
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut,
    updateUser: mockUpdateUser,
    resetPasswordForEmail: mockResetPasswordForEmail,
    getUser: mockGetUser,
  },
  from: mockFrom,
  storage: {
    from: mockStorageFrom,
  },
}

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn().mockResolvedValue(mockSupabaseClient),
}))

// --- Helper functions ---
function createFormData(fields: Record<string, string | File>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value)
  }
  return formData
}

// --- Tests ---

describe("認証 Server Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset default mock returns
    mockGetUser.mockResolvedValue({
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
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      }),
    })
  })

  describe("login", () => {
    it("バリデーション失敗時にエラーメッセージを返す（メール形式不正）", async () => {
      const { login } = await import("@/app/auth/actions/auth")
      const formData = createFormData({
        email: "invalid-email",
        password: "password123",
      })

      const result = await login(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("メールアドレス"),
      })
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it("バリデーション失敗時にエラーメッセージを返す（パスワード空）", async () => {
      const { login } = await import("@/app/auth/actions/auth")
      const formData = createFormData({
        email: "test@example.com",
        password: "",
      })

      const result = await login(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("パスワード"),
      })
      expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it("認証失敗時にエラーメッセージを返す", async () => {
      const { login } = await import("@/app/auth/actions/auth")
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      })

      const formData = createFormData({
        email: "test@example.com",
        password: "wrongpassword",
      })

      const result = await login(null, formData)

      expect(result).toEqual({
        success: false,
        message: "メールアドレスまたはパスワードが正しくありません",
      })
    })

    it("認証成功・full_name 設定済みの場合 /dashboard へリダイレクトする", async () => {
      const { login } = await import("@/app/auth/actions/auth")
      mockSignInWithPassword.mockResolvedValue({
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

      const formData = createFormData({
        email: "test@example.com",
        password: "password123",
      })

      await expect(login(null, formData)).rejects.toThrow("NEXT_REDIRECT")
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    })

    it("認証成功・full_name 未設定の場合 /auth/invite/setup へリダイレクトする", async () => {
      const { login } = await import("@/app/auth/actions/auth")
      mockSignInWithPassword.mockResolvedValue({
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

      const formData = createFormData({
        email: "test@example.com",
        password: "password123",
      })

      await expect(login(null, formData)).rejects.toThrow("NEXT_REDIRECT")
      expect(mockRedirect).toHaveBeenCalledWith("/auth/invite/setup")
    })

    it("signInWithPassword を正しいパラメータで呼び出す", async () => {
      const { login } = await import("@/app/auth/actions/auth")
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      })

      const formData = createFormData({
        email: "test@example.com",
        password: "password123",
      })

      await expect(login(null, formData)).rejects.toThrow("NEXT_REDIRECT")
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      })
    })
  })

  describe("logout", () => {
    it("signOut を呼び出してログインページへリダイレクトする", async () => {
      const { logout } = await import("@/app/auth/actions/auth")
      mockSignOut.mockResolvedValue({ error: null })

      await expect(logout()).rejects.toThrow("NEXT_REDIRECT")
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockRedirect).toHaveBeenCalledWith("/auth/login")
    })

    it("signOut エラー時も Cookie をクリアしてログインページへリダイレクトする", async () => {
      const { logout } = await import("@/app/auth/actions/auth")
      mockSignOut.mockResolvedValue({
        error: { message: "Session not found" },
      })

      await expect(logout()).rejects.toThrow("NEXT_REDIRECT")
      expect(mockRedirect).toHaveBeenCalledWith("/auth/login")
    })
  })

  describe("completeInviteSetup", () => {
    it("バリデーション失敗時にエラーメッセージを返す（姓が空）", async () => {
      const { completeInviteSetup } = await import(
        "@/app/auth/actions/auth"
      )
      const formData = createFormData({
        lastName: "",
        firstName: "太郎",
        password: "password123",
        confirmPassword: "password123",
      })

      const result = await completeInviteSetup(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("姓"),
      })
    })

    it("バリデーション失敗時にエラーメッセージを返す（パスワード不一致）", async () => {
      const { completeInviteSetup } = await import(
        "@/app/auth/actions/auth"
      )
      const formData = createFormData({
        lastName: "山田",
        firstName: "太郎",
        password: "password123",
        confirmPassword: "different",
      })

      const result = await completeInviteSetup(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("パスワード"),
      })
    })

    it("パスワード更新と profiles.full_name 更新を実行しダッシュボードへリダイレクトする", async () => {
      const { completeInviteSetup } = await import(
        "@/app/auth/actions/auth"
      )
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      })

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })
      mockFrom.mockReturnValue({
        update: mockUpdate,
      })

      const formData = createFormData({
        lastName: "山田",
        firstName: "太郎",
        password: "password123",
        confirmPassword: "password123",
      })

      await expect(completeInviteSetup(null, formData)).rejects.toThrow(
        "NEXT_REDIRECT"
      )

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "password123" })
      expect(mockFrom).toHaveBeenCalledWith("profiles")
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "山田 太郎",
        })
      )
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
    })

    it("アバター画像付きの場合 Storage にアップロードし avatar_url を更新する", async () => {
      const { completeInviteSetup } = await import(
        "@/app/auth/actions/auth"
      )
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      })

      mockStorageUpload.mockResolvedValue({ error: null })
      mockStorageFrom.mockReturnValue({
        upload: mockStorageUpload,
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://storage.example.com/avatars/user-123/avatar.png" },
        }),
      })

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })
      mockFrom.mockReturnValue({
        update: mockUpdate,
      })

      const avatarFile = new File(["test"], "avatar.png", {
        type: "image/png",
      })
      const formData = createFormData({
        lastName: "山田",
        firstName: "太郎",
        password: "password123",
        confirmPassword: "password123",
      })
      formData.set("avatar", avatarFile)

      await expect(completeInviteSetup(null, formData)).rejects.toThrow(
        "NEXT_REDIRECT"
      )

      expect(mockStorageFrom).toHaveBeenCalledWith("avatars")
      expect(mockStorageUpload).toHaveBeenCalledWith(
        "user-123/avatar.png",
        avatarFile,
        expect.objectContaining({ upsert: true })
      )
    })

    it("updateUser エラー時にエラーメッセージを返す", async () => {
      const { completeInviteSetup } = await import(
        "@/app/auth/actions/auth"
      )
      mockUpdateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Password is too weak" },
      })

      const formData = createFormData({
        lastName: "山田",
        firstName: "太郎",
        password: "password123",
        confirmPassword: "password123",
      })

      const result = await completeInviteSetup(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe("requestPasswordReset", () => {
    it("バリデーション失敗時にエラーメッセージを返す", async () => {
      const { requestPasswordReset } = await import(
        "@/app/auth/actions/auth"
      )
      const formData = createFormData({
        email: "invalid-email",
      })

      const result = await requestPasswordReset(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("メールアドレス"),
      })
    })

    it("メールアドレスの登録有無に関わらず同一の成功メッセージを返す", async () => {
      const { requestPasswordReset } = await import(
        "@/app/auth/actions/auth"
      )
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      const formData = createFormData({
        email: "test@example.com",
      })

      const result = await requestPasswordReset(null, formData)

      expect(result).toEqual({
        success: true,
        message: "パスワードリセットメールを送信しました",
      })
    })

    it("resetPasswordForEmail に redirectTo を含めて呼び出す", async () => {
      const { requestPasswordReset } = await import(
        "@/app/auth/actions/auth"
      )
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      })

      const formData = createFormData({
        email: "test@example.com",
      })

      await requestPasswordReset(null, formData)

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.objectContaining({
          redirectTo: expect.stringContaining("/auth/reset-password/confirm"),
        })
      )
    })

    it("Supabase エラー時も同一の成功メッセージを返す（メール存在有無を漏洩しない）", async () => {
      const { requestPasswordReset } = await import(
        "@/app/auth/actions/auth"
      )
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: "User not found" },
      })

      const formData = createFormData({
        email: "nonexistent@example.com",
      })

      const result = await requestPasswordReset(null, formData)

      expect(result).toEqual({
        success: true,
        message: "パスワードリセットメールを送信しました",
      })
    })
  })

  describe("confirmPasswordReset", () => {
    it("バリデーション失敗時にエラーメッセージを返す（パスワード短い）", async () => {
      const { confirmPasswordReset } = await import(
        "@/app/auth/actions/auth"
      )
      const formData = createFormData({
        password: "short",
        confirmPassword: "short",
      })

      const result = await confirmPasswordReset(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("8文字以上"),
      })
    })

    it("バリデーション失敗時にエラーメッセージを返す（パスワード不一致）", async () => {
      const { confirmPasswordReset } = await import(
        "@/app/auth/actions/auth"
      )
      const formData = createFormData({
        password: "password123",
        confirmPassword: "different123",
      })

      const result = await confirmPasswordReset(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("パスワード"),
      })
    })

    it("パスワード更新成功時にログインページへリダイレクトする", async () => {
      const { confirmPasswordReset } = await import(
        "@/app/auth/actions/auth"
      )
      mockUpdateUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      })

      const formData = createFormData({
        password: "newpassword123",
        confirmPassword: "newpassword123",
      })

      await expect(confirmPasswordReset(null, formData)).rejects.toThrow(
        "NEXT_REDIRECT"
      )
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "newpassword123",
      })
      expect(mockRedirect).toHaveBeenCalledWith(
        "/auth/login?message=password-updated"
      )
    })

    it("updateUser エラー時にエラーメッセージを返す", async () => {
      const { confirmPasswordReset } = await import(
        "@/app/auth/actions/auth"
      )
      mockUpdateUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Session expired" },
      })

      const formData = createFormData({
        password: "newpassword123",
        confirmPassword: "newpassword123",
      })

      const result = await confirmPasswordReset(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })
  })
})
