
// ---- Mock Setup ----

// next/cache
const mockRevalidatePath = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

// Supabase Anon Client (server.ts)
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockStorageFrom = vi.fn()
const mockAnonClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
  storage: {
    from: mockStorageFrom,
  },
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockAnonClient),
}))

// Supabase Admin Client (admin.ts)
const mockUpdateUserById = vi.fn()
const mockAdminClient = {
  auth: {
    admin: {
      updateUserById: mockUpdateUserById,
    },
  },
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue(mockAdminClient),
}))

// ---- Helpers ----

function createFormData(data: Record<string, string | File>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value)
  }
  return formData
}

const MOCK_USER = {
  id: "a0a0a0a0-b1b1-4c2c-8d3d-e4e4e4e4e4e4",
  email: "user@example.com",
}

/** 認証済みユーザーの状態をセットアップ */
function setupAuthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: MOCK_USER },
    error: null,
  })
}

/** 未認証状態をセットアップ */
function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  })
}

/** profiles テーブルの update().eq() チェーンモックをセットアップ */
function setupProfileUpdate(error: { message: string } | null = null) {
  const mockEq = vi.fn().mockResolvedValue({ error })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ update: mockUpdate })
  return { mockUpdate, mockEq }
}

/** Storage の list + remove + upload + getPublicUrl チェーンモックをセットアップ */
function setupStorageMock(options: {
  listResult?: { data: { name: string }[] | null; error: unknown }
  removeResult?: { error: unknown }
  uploadResult?: { data: { path: string } | null; error: unknown }
  publicUrl?: string
} = {}) {
  const mockList = vi.fn().mockResolvedValue(
    options.listResult ?? { data: [], error: null }
  )
  const mockRemove = vi.fn().mockResolvedValue(
    options.removeResult ?? { error: null }
  )
  const mockUpload = vi.fn().mockResolvedValue(
    options.uploadResult ?? {
      data: { path: `${MOCK_USER.id}/avatar.webp` },
      error: null,
    }
  )
  const mockGetPublicUrl = vi.fn().mockReturnValue({
    data: {
      publicUrl: options.publicUrl ?? "https://storage.example.com/avatars/avatar.webp",
    },
  })

  mockStorageFrom.mockReturnValue({
    list: mockList,
    remove: mockRemove,
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  })

  return { mockList, mockRemove, mockUpload, mockGetPublicUrl }
}

/** テスト用の File オブジェクトを作成 */
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

// ---- Tests ----

describe("Server Actions: 設定ページ", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================
  // updateProfile (Task 3.1)
  // ============================================================
  describe("updateProfile", () => {
    it("認証済みユーザーが有効なデータでプロフィールを更新し成功する", async () => {
      setupAuthenticated()
      const { mockUpdate, mockEq } = setupProfileUpdate()

      const { updateProfile } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        lastName: "田中",
        firstName: "太郎",
      })

      const result = await updateProfile(null, formData)

      expect(result).toEqual({
        success: true,
        message: "プロフィールを更新しました。",
      })
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          last_name: "田中",
          first_name: "太郎",
          full_name: "田中 太郎",
        })
      )
      expect(mockEq).toHaveBeenCalledWith("id", MOCK_USER.id)
      expect(mockRevalidatePath).toHaveBeenCalledWith("/settings")
    })

    it("未認証の場合にエラーを返す", async () => {
      setupUnauthenticated()

      const { updateProfile } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        lastName: "田中",
        firstName: "太郎",
      })

      const result = await updateProfile(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("認証"),
      })
    })

    it("姓が空欄の場合にバリデーションエラーを返す", async () => {
      setupAuthenticated()

      const { updateProfile } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        lastName: "",
        firstName: "太郎",
      })

      const result = await updateProfile(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("姓"),
      })
    })

    it("名が空欄の場合にバリデーションエラーを返す", async () => {
      setupAuthenticated()

      const { updateProfile } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        lastName: "田中",
        firstName: "",
      })

      const result = await updateProfile(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("名"),
      })
    })

    it("full_name が '${last_name} ${first_name}' として同期更新される", async () => {
      setupAuthenticated()
      const { mockUpdate } = setupProfileUpdate()

      const { updateProfile } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        lastName: "佐藤",
        firstName: "花子",
      })

      await updateProfile(null, formData)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "佐藤 花子",
        })
      )
    })

    it("DB 更新エラー時に適切なエラーメッセージを返す", async () => {
      setupAuthenticated()
      setupProfileUpdate({ message: "DB error" })

      const { updateProfile } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        lastName: "田中",
        firstName: "太郎",
      })

      const result = await updateProfile(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // uploadAvatar (Task 3.2)
  // ============================================================
  describe("uploadAvatar", () => {
    it("有効な画像ファイルをアップロードし成功する", async () => {
      setupAuthenticated()
      const storageMock = setupStorageMock()
      // profiles テーブルの更新モック
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate })

      const { uploadAvatar } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const file = createMockFile("photo.webp", 1024, "image/webp")
      const formData = createFormData({ avatar: file })

      const result = await uploadAvatar(null, formData)

      expect(result).toEqual({
        success: true,
        message: expect.stringContaining("アバター"),
        avatarUrl: expect.any(String),
      })
      expect(storageMock.mockUpload).toHaveBeenCalled()
    })

    it("未認証の場合にエラーを返す", async () => {
      setupUnauthenticated()

      const { uploadAvatar } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const file = createMockFile("photo.webp", 1024, "image/webp")
      const formData = createFormData({ avatar: file })

      const result = await uploadAvatar(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("認証"),
      })
    })

    it("不正な MIME タイプの場合にエラーを返す", async () => {
      setupAuthenticated()

      const { uploadAvatar } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const file = createMockFile("document.pdf", 1024, "application/pdf")
      const formData = createFormData({ avatar: file })

      const result = await uploadAvatar(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("ファイル形式"),
      })
    })

    it("2MB を超えるファイルの場合にエラーを返す", async () => {
      setupAuthenticated()

      const { uploadAvatar } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const largeFile = createMockFile(
        "large.png",
        3 * 1024 * 1024,
        "image/png"
      )
      const formData = createFormData({ avatar: largeFile })

      const result = await uploadAvatar(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("2MB"),
      })
    })

    it("既存のアバターファイルを削除してから新しいファイルをアップロードする", async () => {
      setupAuthenticated()
      const storageMock = setupStorageMock({
        listResult: {
          data: [{ name: "avatar.png" }],
          error: null,
        },
      })
      // profiles テーブルの更新モック
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate })

      const { uploadAvatar } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const file = createMockFile("new-photo.jpeg", 1024, "image/jpeg")
      const formData = createFormData({ avatar: file })

      await uploadAvatar(null, formData)

      // 既存ファイルの削除を確認
      expect(storageMock.mockRemove).toHaveBeenCalledWith(
        [`${MOCK_USER.id}/avatar.png`]
      )
      // 新しいファイルのアップロードを確認
      expect(storageMock.mockUpload).toHaveBeenCalled()
    })

    it("アップロード成功後に profiles.avatar_url を更新する", async () => {
      setupAuthenticated()
      const publicUrl = "https://storage.example.com/avatars/new-avatar.webp"
      setupStorageMock({ publicUrl })
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate })

      const { uploadAvatar } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const file = createMockFile("photo.webp", 1024, "image/webp")
      const formData = createFormData({ avatar: file })

      await uploadAvatar(null, formData)

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          avatar_url: publicUrl,
        })
      )
      expect(mockEq).toHaveBeenCalledWith("id", MOCK_USER.id)
    })

    it("Storage アップロードエラー時に適切なエラーメッセージを返す", async () => {
      setupAuthenticated()
      setupStorageMock({
        uploadResult: {
          data: null,
          error: { message: "Storage upload failed" },
        },
      })

      const { uploadAvatar } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const file = createMockFile("photo.webp", 1024, "image/webp")
      const formData = createFormData({ avatar: file })

      const result = await uploadAvatar(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })

    it("ファイルが formData に含まれない場合にエラーを返す", async () => {
      setupAuthenticated()

      const { uploadAvatar } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = new FormData()

      const result = await uploadAvatar(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })

    it("アップロードパスが ${userId}/avatar.${ext} 形式である", async () => {
      setupAuthenticated()
      const storageMock = setupStorageMock()
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate })

      const { uploadAvatar } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const file = createMockFile("photo.png", 1024, "image/png")
      const formData = createFormData({ avatar: file })

      await uploadAvatar(null, formData)

      // 第1引数がパス
      const uploadCallArgs = storageMock.mockUpload.mock.calls[0]
      expect(uploadCallArgs[0]).toBe(`${MOCK_USER.id}/avatar.png`)
    })

    it("アップロード時に upsert: true が指定されている", async () => {
      setupAuthenticated()
      const storageMock = setupStorageMock()
      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ update: mockUpdate })

      const { uploadAvatar } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const file = createMockFile("photo.webp", 1024, "image/webp")
      const formData = createFormData({ avatar: file })

      await uploadAvatar(null, formData)

      const uploadCallArgs = storageMock.mockUpload.mock.calls[0]
      expect(uploadCallArgs[2]).toEqual(
        expect.objectContaining({ upsert: true })
      )
    })
  })

  // ============================================================
  // changePassword (Task 3.3)
  // ============================================================
  describe("changePassword", () => {
    it("認証済みユーザーが有効なデータでパスワードを変更し成功する", async () => {
      setupAuthenticated()
      mockUpdateUserById.mockResolvedValue({
        data: { user: { id: MOCK_USER.id } },
        error: null,
      })

      const { changePassword } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      })

      const result = await changePassword(null, formData)

      expect(result).toEqual({
        success: true,
        message: expect.stringContaining("パスワード"),
      })
      expect(mockUpdateUserById).toHaveBeenCalledWith(
        MOCK_USER.id,
        { password: "newpassword123" }
      )
    })

    it("未認証の場合にエラーを返す", async () => {
      setupUnauthenticated()

      const { changePassword } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      })

      const result = await changePassword(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("認証"),
      })
      expect(mockUpdateUserById).not.toHaveBeenCalled()
    })

    it("パスワードが8文字未満の場合にバリデーションエラーを返す", async () => {
      setupAuthenticated()

      const { changePassword } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        newPassword: "short",
        confirmPassword: "short",
      })

      const result = await changePassword(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("8文字"),
      })
      expect(mockUpdateUserById).not.toHaveBeenCalled()
    })

    it("パスワードが一致しない場合にバリデーションエラーを返す", async () => {
      setupAuthenticated()

      const { changePassword } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        newPassword: "newpassword123",
        confirmPassword: "differentpassword",
      })

      const result = await changePassword(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("一致"),
      })
      expect(mockUpdateUserById).not.toHaveBeenCalled()
    })

    it("新しいパスワードが空欄の場合にバリデーションエラーを返す", async () => {
      setupAuthenticated()

      const { changePassword } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        newPassword: "",
        confirmPassword: "",
      })

      const result = await changePassword(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
      expect(mockUpdateUserById).not.toHaveBeenCalled()
    })

    it("Supabase Admin API のエラーを適切にハンドリングする", async () => {
      setupAuthenticated()
      mockUpdateUserById.mockResolvedValue({
        data: { user: null },
        error: { message: "Password update failed" },
      })

      const { changePassword } = await import(
        "@/app/(authenticated)/settings/actions"
      )
      const formData = createFormData({
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      })

      const result = await changePassword(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })
  })
})
