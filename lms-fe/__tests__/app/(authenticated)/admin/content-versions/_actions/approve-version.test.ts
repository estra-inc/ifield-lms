/**
 * Server Action: approveVersion のテスト
 *
 * Task 5.2: 承認ボタンと確認ダイアログの実装
 * - Server Action 内で Super Admin 権限を検証し、RPC approve_content_version を呼び出す
 * - 処理完了後に revalidatePath でバージョン管理画面を更新する
 * - エラー時はエラーメッセージを返す
 *
 * Requirements: 8.3, 8.4, 5.1, 5.4
 */

// --- Mocks ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockAnonClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockAnonClient),
}))

const mockRpc = vi.fn()
const mockAdminClient = {
  rpc: mockRpc,
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

const mockRevalidatePath = vi.fn()
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

// --- Helpers ---

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

const DRAFT_VERSION_ID = "d1d1d1d1-e2e2-4f3f-a4a4-b5b5b5b5b5b5"

/** super_admin として認証されている状態をセットアップ */
function setupSuperAdminAuth() {
  mockGetUser.mockResolvedValue({
    data: { user: SUPER_ADMIN_USER },
    error: null,
  })

  const mockSingle = vi.fn().mockResolvedValue({
    data: { role: "super_admin" },
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

/** 一般ユーザーとして認証されている状態をセットアップ */
function setupNonAdminAuth() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "regular-user-id", email: "user@example.com" } },
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

// --- Tests ---

describe("Server Action: approveVersion (Task 5.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("認証・権限チェック", () => {
    it("未認証の場合はエラーを返す", async () => {
      setupUnauthenticated()

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({
        versionId: DRAFT_VERSION_ID,
      })

      const result = await approveVersion(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("認証"),
      })
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("super_admin 以外のロールではエラーを返す", async () => {
      setupNonAdminAuth()

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({
        versionId: DRAFT_VERSION_ID,
      })

      const result = await approveVersion(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe("バリデーション", () => {
    it("versionId が未指定の場合はエラーを返す", async () => {
      setupSuperAdminAuth()

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({})

      const result = await approveVersion(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("versionId が空文字の場合はエラーを返す", async () => {
      setupSuperAdminAuth()

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({
        versionId: "",
      })

      const result = await approveVersion(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe("RPC 呼び出し", () => {
    it("super_admin が有効な versionId で承認を実行し成功する", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: { success: true, archived_version_id: "old-active-id", deleted_contents_count: 10 },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({
        versionId: DRAFT_VERSION_ID,
      })

      const result = await approveVersion(null, formData)

      expect(result).toEqual({
        success: true,
        message: expect.stringContaining("公開"),
      })
      expect(mockRpc).toHaveBeenCalledWith("approve_content_version", {
        p_version_id: DRAFT_VERSION_ID,
        p_approved_by: SUPER_ADMIN_USER.id,
      })
    })

    it("RPC 呼び出し時に createAdminClient を使用する", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: { success: true },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const { createAdminClient } = await import("@/lib/supabase/admin")

      const formData = createFormData({
        versionId: DRAFT_VERSION_ID,
      })

      await approveVersion(null, formData)

      expect(createAdminClient).toHaveBeenCalled()
    })

    it("RPC エラー時はエラーメッセージを返す", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "指定されたバージョンは draft ステータスではありません" },
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({
        versionId: DRAFT_VERSION_ID,
      })

      const result = await approveVersion(null, formData)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })
  })

  describe("revalidatePath", () => {
    it("成功時に /admin/content-versions を revalidate する", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: { success: true },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({
        versionId: DRAFT_VERSION_ID,
      })

      await approveVersion(null, formData)

      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/content-versions")
    })

    it("成功時に /contents を revalidate する", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: { success: true },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({
        versionId: DRAFT_VERSION_ID,
      })

      await approveVersion(null, formData)

      expect(mockRevalidatePath).toHaveBeenCalledWith("/contents")
    })

    it("エラー時は revalidatePath を呼び出さない", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "RPC error" },
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({
        versionId: DRAFT_VERSION_ID,
      })

      await approveVersion(null, formData)

      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })
  })

  describe("ActionResult 型", () => {
    it("成功時は { success: true, message: string } を返す", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: { success: true },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({
        versionId: DRAFT_VERSION_ID,
      })

      const result = await approveVersion(null, formData)

      expect(result).toHaveProperty("success", true)
      expect(result).toHaveProperty("message")
      expect(typeof result?.message).toBe("string")
    })

    it("失敗時は { success: false, message: string } を返す", async () => {
      setupUnauthenticated()

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({
        versionId: DRAFT_VERSION_ID,
      })

      const result = await approveVersion(null, formData)

      expect(result).toHaveProperty("success", false)
      expect(result).toHaveProperty("message")
      expect(typeof result?.message).toBe("string")
    })
  })
})
