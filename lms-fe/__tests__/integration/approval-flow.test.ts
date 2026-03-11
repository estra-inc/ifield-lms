/**
 * 承認フローの結合検証 (Task 7.2)
 *
 * approveVersion Server Action を直接呼び出し、承認フロー全体を検証する。
 *
 * テストシナリオ:
 * 1. draft を承認 → active に昇格、approved_by/approved_at が記録される
 * 2. 旧 active → archived、紐づくコンテンツ行が削除される
 * 3. 初回承認（既存 active なし）→ draft が正常に active 昇格する
 * 4. 非 Super Admin は承認できない（権限チェック）
 * 5. draft 以外のバージョンは承認できない（バリデーション）
 * 6. 成功時に revalidatePath が呼ばれる
 * 7. RPC 失敗時はエラーメッセージを返す
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 4.2
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
  id: "sa-001-aaaa-bbbb-cccc-dddddddddddd",
  email: "super-admin@example.com",
}

const REGULAR_USER = {
  id: "user-002-aaaa-bbbb-cccc-dddddddddddd",
  email: "user@example.com",
}

const MANAGER_USER = {
  id: "mgr-003-aaaa-bbbb-cccc-dddddddddddd",
  email: "manager@example.com",
}

const DRAFT_VERSION_ID = "ver-draft-aaaa-bbbb-cccc-dddddddddd"
const OLD_ACTIVE_VERSION_ID = "ver-active-aaaa-bbbb-cccc-ddddddddd"

/** Super Admin として認証をセットアップ */
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

/** 一般ユーザーとして認証をセットアップ */
function setupUserAuth() {
  mockGetUser.mockResolvedValue({
    data: { user: REGULAR_USER },
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

/** Manager として認証をセットアップ */
function setupManagerAuth() {
  mockGetUser.mockResolvedValue({
    data: { user: MANAGER_USER },
    error: null,
  })

  const mockSingle = vi.fn().mockResolvedValue({
    data: { role: "manager" },
    error: null,
  })
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

// --- Tests ---

describe("承認フロー結合検証 (Task 7.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("REQ-5.1: draft を承認し active に昇格する", () => {
    it("Super Admin が draft バージョンを承認すると成功を返す", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          archived_version_id: OLD_ACTIVE_VERSION_ID,
          deleted_contents_count: 15,
        },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      expect(result).not.toBeNull()
      expect(result?.success).toBe(true)
    })

    it("RPC approve_content_version が正しいパラメータで呼び出される", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: { success: true, archived_version_id: null, deleted_contents_count: 0 },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      await approveVersion(null, formData)

      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(mockRpc).toHaveBeenCalledWith("approve_content_version", {
        p_version_id: DRAFT_VERSION_ID,
        p_approved_by: SUPER_ADMIN_USER.id,
      })
    })
  })

  describe("REQ-5.2, REQ-5.3, REQ-4.2: 旧 active が archived に変更され、紐づくコンテンツ行が削除される", () => {
    it("承認成功時に RPC が旧 active の archived_version_id と deleted_contents_count を返す", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          archived_version_id: OLD_ACTIVE_VERSION_ID,
          deleted_contents_count: 25,
        },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      // Server Action は RPC の結果を受け取り成功を返す
      // 旧 active の archived 化とコンテンツ削除は RPC 内部で実行される
      expect(result?.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith("approve_content_version", {
        p_version_id: DRAFT_VERSION_ID,
        p_approved_by: SUPER_ADMIN_USER.id,
      })
    })

    it("createAdminClient を使用して RPC を呼び出す（SECURITY DEFINER の RPC を service_role 経由で実行）", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: { success: true, archived_version_id: OLD_ACTIVE_VERSION_ID, deleted_contents_count: 10 },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const { createAdminClient } = await import("@/lib/supabase/admin")

      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      await approveVersion(null, formData)

      expect(createAdminClient).toHaveBeenCalled()
      expect(mockRpc).toHaveBeenCalled()
    })
  })

  describe("REQ-5.4: approved_by と approved_at が正しく記録される", () => {
    it("RPC に承認者の user ID (p_approved_by) が渡される", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: { success: true, archived_version_id: null, deleted_contents_count: 0 },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      await approveVersion(null, formData)

      const rpcCallArgs = mockRpc.mock.calls[0]
      expect(rpcCallArgs[0]).toBe("approve_content_version")
      expect(rpcCallArgs[1]).toHaveProperty("p_approved_by", SUPER_ADMIN_USER.id)
    })

    it("認証済みユーザーの ID がそのまま p_approved_by として渡される", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: { success: true, archived_version_id: null, deleted_contents_count: 0 },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      await approveVersion(null, formData)

      // approved_at は RPC 関数内で NOW() を使用して記録される
      // Server Action からは p_approved_by のみ渡す
      expect(mockRpc).toHaveBeenCalledWith(
        "approve_content_version",
        expect.objectContaining({
          p_approved_by: SUPER_ADMIN_USER.id,
        })
      )
    })
  })

  describe("REQ-5.5: 初回同期時（active なし）に draft を承認し正常に active 昇格する", () => {
    it("初回承認（旧 active なし）で archived_version_id が null でも成功する", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          archived_version_id: null,
          deleted_contents_count: 0,
        },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      expect(result?.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith("approve_content_version", {
        p_version_id: DRAFT_VERSION_ID,
        p_approved_by: SUPER_ADMIN_USER.id,
      })
    })

    it("初回承認でもコンテンツ削除数が 0 で正常に処理される", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          archived_version_id: null,
          deleted_contents_count: 0,
        },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      expect(result?.success).toBe(true)
      expect(result?.message).toBeDefined()
      expect(typeof result?.message).toBe("string")
    })
  })

  describe("権限チェック: 非 Super Admin は承認できない", () => {
    it("User ロールで承認を試みるとエラーを返す", async () => {
      setupUserAuth()

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      expect(result?.success).toBe(false)
      expect(result?.message).toContain("権限")
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("Manager ロールで承認を試みるとエラーを返す", async () => {
      setupManagerAuth()

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      expect(result?.success).toBe(false)
      expect(result?.message).toContain("権限")
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("未認証ユーザーが承認を試みるとエラーを返す", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      expect(result?.success).toBe(false)
      expect(result?.message).toContain("認証")
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe("バリデーション: draft 以外のバージョンは承認できない", () => {
    it("RPC が draft ステータスでないバージョンの承認を拒否するとエラーを返す", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: null,
        error: {
          message: "指定されたバージョンは draft ステータスではありません",
        },
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: "non-draft-version-id" })

      const result = await approveVersion(null, formData)

      expect(result?.success).toBe(false)
      expect(result?.message).toBeDefined()
    })

    it("versionId が空の場合は RPC を呼び出さずエラーを返す", async () => {
      setupSuperAdminAuth()

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: "  " })

      const result = await approveVersion(null, formData)

      expect(result?.success).toBe(false)
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe("revalidatePath: 承認成功後に画面が更新される", () => {
    it("成功時に /admin/content-versions と /contents を revalidate する", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: { success: true, archived_version_id: OLD_ACTIVE_VERSION_ID, deleted_contents_count: 5 },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      await approveVersion(null, formData)

      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/content-versions")
      expect(mockRevalidatePath).toHaveBeenCalledWith("/contents")
    })

    it("RPC エラー時は revalidatePath を呼び出さない", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "DB connection error" },
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      await approveVersion(null, formData)

      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it("認証エラー時は revalidatePath を呼び出さない", async () => {
      setupUserAuth()

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      await approveVersion(null, formData)

      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })
  })

  describe("エラーハンドリング: RPC 失敗時のエラーメッセージ", () => {
    it("RPC のエラーメッセージが結果に含まれる", async () => {
      setupSuperAdminAuth()
      const errorMessage = "同時承認の競合が発生しました"
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      expect(result?.success).toBe(false)
      expect(result?.message).toContain(errorMessage)
    })

    it("DB 接続エラーもエラーメッセージとして返される", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "connection refused" },
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      expect(result?.success).toBe(false)
      expect(result?.message).toBeDefined()
    })

    it("プロフィール取得エラー時はエラーを返す", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: SUPER_ADMIN_USER },
        error: null,
      })

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Profile not found" },
      })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockFrom.mockReturnValue({ select: mockSelect })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      expect(result?.success).toBe(false)
      expect(mockRpc).not.toHaveBeenCalled()
    })
  })

  describe("E2E フローシナリオ: 承認フロー全体の一連の動作", () => {
    it("シナリオ 1: 通常承認フロー（既存 active あり）", async () => {
      // 1. Super Admin として認証
      setupSuperAdminAuth()

      // 2. RPC が成功を返す（旧 active の archived 化 + コンテンツ削除済み）
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          archived_version_id: OLD_ACTIVE_VERSION_ID,
          deleted_contents_count: 30,
        },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      // 3. Server Action を実行
      const result = await approveVersion(null, formData)

      // 4. 検証
      // 4a. 認証チェックが行われた
      expect(mockGetUser).toHaveBeenCalledTimes(1)
      // 4b. プロフィール（ロール）チェックが行われた
      expect(mockFrom).toHaveBeenCalledWith("profiles")
      // 4c. RPC が正しいパラメータで呼び出された
      expect(mockRpc).toHaveBeenCalledWith("approve_content_version", {
        p_version_id: DRAFT_VERSION_ID,
        p_approved_by: SUPER_ADMIN_USER.id,
      })
      // 4d. 成功結果が返された
      expect(result?.success).toBe(true)
      // 4e. revalidatePath が呼ばれた
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/content-versions")
      expect(mockRevalidatePath).toHaveBeenCalledWith("/contents")
    })

    it("シナリオ 2: 初回承認フロー（active なし）", async () => {
      setupSuperAdminAuth()

      // 初回 = archived_version_id が null、deleted_contents_count が 0
      mockRpc.mockResolvedValue({
        data: {
          success: true,
          archived_version_id: null,
          deleted_contents_count: 0,
        },
        error: null,
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      expect(result?.success).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith("approve_content_version", {
        p_version_id: DRAFT_VERSION_ID,
        p_approved_by: SUPER_ADMIN_USER.id,
      })
      expect(mockRevalidatePath).toHaveBeenCalled()
    })

    it("シナリオ 3: 権限不足で承認が拒否される", async () => {
      setupUserAuth()

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: DRAFT_VERSION_ID })

      const result = await approveVersion(null, formData)

      // RPC は呼ばれない
      expect(mockRpc).not.toHaveBeenCalled()
      // revalidatePath も呼ばれない
      expect(mockRevalidatePath).not.toHaveBeenCalled()
      // エラー結果
      expect(result?.success).toBe(false)
    })

    it("シナリオ 4: RPC エラーで承認が失敗する", async () => {
      setupSuperAdminAuth()
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "指定されたバージョンは draft ステータスではありません" },
      })

      const { approveVersion } = await import(
        "@/app/(authenticated)/admin/content-versions/_actions/approve-version"
      )
      const formData = createFormData({ versionId: "already-active-version-id" })

      const result = await approveVersion(null, formData)

      // RPC は呼ばれた（権限チェックは通過）
      expect(mockRpc).toHaveBeenCalled()
      // revalidatePath は呼ばれない（エラーのため）
      expect(mockRevalidatePath).not.toHaveBeenCalled()
      // エラー結果
      expect(result?.success).toBe(false)
      expect(result?.message).toBeDefined()
    })
  })
})
