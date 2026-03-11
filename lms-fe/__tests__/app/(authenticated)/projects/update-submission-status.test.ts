/**
 * updateSubmissionStatus Server Action テスト
 *
 * Task 11.1: Super Admin 手動ステータス変更
 * Requirements: 6.7
 *
 * - Super Admin ロール限定
 * - Supabase Admin Client (service_role) を使用して RLS をバイパス
 * - submission のステータスを graded に手動変更
 * - 権限がない場合はエラーを返却
 */

// ---- Mock Setup ----

const mockRevalidatePath = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseClient),
}))

const mockAdminFrom = vi.fn()
const mockAdminClient = {
  from: mockAdminFrom,
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}))

// ---- Helpers ----

const SUPER_ADMIN_USER = {
  id: "admin-1111-2222-3333-444444444444",
  email: "admin@example.com",
}

const REGULAR_USER = {
  id: "user-1111-2222-3333-444444444444",
  email: "user@example.com",
}

const TEST_SUBMISSION_ID = "sub-aaaa-bbbb-cccc-dddddddddddd"

function setupAuthenticated(user: { id: string; email: string }) {
  mockGetUser.mockResolvedValue({
    data: { user },
    error: null,
  })
}

function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  })
}

/**
 * profiles テーブルからのロール取得をモックする
 */
function setupProfileRole(role: "user" | "manager" | "super_admin") {
  const selectChain = {
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { role },
        error: null,
      }),
    }),
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue(selectChain),
      }
    }
    return {}
  })
}

/**
 * Admin Client の update チェーンをモックする
 */
function setupAdminUpdate(success: boolean, errorMessage?: string) {
  const eqChain = vi.fn().mockResolvedValue({
    data: success ? { id: TEST_SUBMISSION_ID } : null,
    error: success ? null : { message: errorMessage ?? "DB error" },
  })

  const updateChain = {
    eq: eqChain,
  }

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "project_submissions") {
      return {
        update: vi.fn().mockReturnValue(updateChain),
      }
    }
    return {}
  })

  return { eqChain }
}

// ---- Tests ----

describe("updateSubmissionStatus Server Action (Task 11.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ==============================
  // 認証チェック
  // ==============================
  describe("認証チェック", () => {
    it("未認証の場合はエラーを返す", async () => {
      setupUnauthenticated()

      const { updateSubmissionStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateSubmissionStatus(TEST_SUBMISSION_ID, "graded")

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("認証"),
      })
    })
  })

  // ==============================
  // ロール権限チェック
  // ==============================
  describe("ロール権限チェック", () => {
    it("Super Admin ロールの場合は処理を実行する", async () => {
      setupAuthenticated(SUPER_ADMIN_USER)
      setupProfileRole("super_admin")
      setupAdminUpdate(true)

      const { updateSubmissionStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateSubmissionStatus(TEST_SUBMISSION_ID, "graded")

      expect(result.success).toBe(true)
    })

    it("User ロールの場合はエラーを返す", async () => {
      setupAuthenticated(REGULAR_USER)
      setupProfileRole("user")

      const { updateSubmissionStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateSubmissionStatus(TEST_SUBMISSION_ID, "graded")

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
    })

    it("Manager ロールの場合はエラーを返す", async () => {
      setupAuthenticated(REGULAR_USER)
      setupProfileRole("manager")

      const { updateSubmissionStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateSubmissionStatus(TEST_SUBMISSION_ID, "graded")

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
    })
  })

  // ==============================
  // ステータス更新処理
  // ==============================
  describe("ステータス更新処理", () => {
    it("submission のステータスを graded に更新する", async () => {
      setupAuthenticated(SUPER_ADMIN_USER)
      setupProfileRole("super_admin")
      setupAdminUpdate(true)

      const { updateSubmissionStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateSubmissionStatus(TEST_SUBMISSION_ID, "graded")

      expect(result).toEqual({
        success: true,
        message: expect.any(String),
      })

      // Admin Client の from が project_submissions で呼ばれたことを確認
      expect(mockAdminFrom).toHaveBeenCalledWith("project_submissions")
    })

    it("更新成功後に revalidatePath を呼び出す", async () => {
      setupAuthenticated(SUPER_ADMIN_USER)
      setupProfileRole("super_admin")
      setupAdminUpdate(true)

      const { updateSubmissionStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      await updateSubmissionStatus(TEST_SUBMISSION_ID, "graded")

      expect(mockRevalidatePath).toHaveBeenCalledWith("/projects")
    })

    it("DB エラーが発生した場合はエラーを返す", async () => {
      setupAuthenticated(SUPER_ADMIN_USER)
      setupProfileRole("super_admin")
      setupAdminUpdate(false, "Update failed")

      const { updateSubmissionStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateSubmissionStatus(TEST_SUBMISSION_ID, "graded")

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
      // エラー時は revalidatePath を呼ばない
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })
  })

  // ==============================
  // 引数バリデーション
  // ==============================
  describe("引数バリデーション", () => {
    it("submissionId が空文字の場合はエラーを返す", async () => {
      setupAuthenticated(SUPER_ADMIN_USER)
      setupProfileRole("super_admin")

      const { updateSubmissionStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateSubmissionStatus("", "graded")

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })

    it("status が graded のみ許可される", async () => {
      setupAuthenticated(SUPER_ADMIN_USER)
      setupProfileRole("super_admin")

      const { updateSubmissionStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      // "submitted" は手動変更対象外
      const result = await updateSubmissionStatus(
        TEST_SUBMISSION_ID,
        "submitted" as "graded"
      )

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
    })
  })
})
