/**
 * submitWork Server Action テスト
 *
 * Task 8.1: submitWork Server Action の作成
 * Requirements: 5.3, 5.8, 6.5, 6.6
 *
 * - 認証チェック
 * - grading 中の提出拒否（排他制御の二重防御、サーバーサイド）
 * - project_submissions に status='submitted' でレコード作成
 * - 成功時の revalidatePath
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

// createAdminClient mock (required by actions.ts import)
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
}))

// ---- Helpers ----

const TEST_USER = {
  id: "user-1111-2222-3333-444444444444",
  email: "user@example.com",
}

const TEST_ASSIGNMENT_ID = "assign-aaaa-bbbb-cccc-dddddddddddd"
const TEST_GITHUB_URL = "https://github.com/user/repo"

function setupAuthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: TEST_USER },
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
 * project_submissions テーブルへのクエリチェーンをモックする
 *
 * @param latestSubmissionStatus - 最新提出のステータス（null = 提出なし）
 * @param insertSuccess - INSERT 操作が成功するか
 */
function setupSubmissionQueries(
  latestSubmissionStatus: string | null,
  insertSuccess: boolean = true
) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "project_submissions") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(
                  latestSubmissionStatus
                    ? {
                        data: {
                          id: "sub-latest",
                          status: latestSubmissionStatus,
                        },
                        error: null,
                      }
                    : {
                        data: null,
                        error: { code: "PGRST116", message: "No rows" },
                      }
                ),
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              insertSuccess
                ? {
                    data: {
                      id: "sub-new-1",
                      assignment_id: TEST_ASSIGNMENT_ID,
                      github_url: TEST_GITHUB_URL,
                      status: "submitted",
                    },
                    error: null,
                  }
                : {
                    data: null,
                    error: { message: "Insert failed" },
                  }
            ),
          }),
        }),
      }
    }
    return {}
  })
}

// ---- Tests ----

describe("submitWork Server Action (Task 8.1)", () => {
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

      const { submitWork } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await submitWork(TEST_ASSIGNMENT_ID, TEST_GITHUB_URL)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("認証"),
      })
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  // ==============================
  // grading 中の提出拒否（排他制御の二重防御）
  // ==============================
  describe("grading 中の提出拒否", () => {
    it("最新 submission が grading 状態の場合は提出を拒否する", async () => {
      setupAuthenticated()
      setupSubmissionQueries("grading")

      const { submitWork } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await submitWork(TEST_ASSIGNMENT_ID, TEST_GITHUB_URL)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("採点中"),
      })
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })
  })

  // ==============================
  // 正常な提出
  // ==============================
  describe("正常な提出", () => {
    it("提出が存在しない場合に正常に提出できる", async () => {
      setupAuthenticated()
      setupSubmissionQueries(null, true)

      const { submitWork } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await submitWork(TEST_ASSIGNMENT_ID, TEST_GITHUB_URL)

      expect(result).toEqual({
        success: true,
        message: expect.any(String),
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith("/projects")
    })

    it("最新 submission が submitted 状態の場合は再提出できる", async () => {
      setupAuthenticated()
      setupSubmissionQueries("submitted", true)

      const { submitWork } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await submitWork(TEST_ASSIGNMENT_ID, TEST_GITHUB_URL)

      expect(result).toEqual({
        success: true,
        message: expect.any(String),
      })
    })

    it("最新 submission が rejected 状態の場合は再提出できる", async () => {
      setupAuthenticated()
      setupSubmissionQueries("rejected", true)

      const { submitWork } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await submitWork(TEST_ASSIGNMENT_ID, TEST_GITHUB_URL)

      expect(result).toEqual({
        success: true,
        message: expect.any(String),
      })
    })

    it("最新 submission が graded 状態の場合は再提出できる", async () => {
      setupAuthenticated()
      setupSubmissionQueries("graded", true)

      const { submitWork } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await submitWork(TEST_ASSIGNMENT_ID, TEST_GITHUB_URL)

      expect(result).toEqual({
        success: true,
        message: expect.any(String),
      })
    })
  })

  // ==============================
  // DB エラー
  // ==============================
  describe("DB エラー", () => {
    it("INSERT が失敗した場合はエラーを返す", async () => {
      setupAuthenticated()
      setupSubmissionQueries(null, false)

      const { submitWork } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await submitWork(TEST_ASSIGNMENT_ID, TEST_GITHUB_URL)

      expect(result).toEqual({
        success: false,
        message: expect.any(String),
      })
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })
  })

  // ==============================
  // revalidatePath
  // ==============================
  describe("revalidatePath", () => {
    it("成功時に /projects パスを再検証する", async () => {
      setupAuthenticated()
      setupSubmissionQueries(null, true)

      const { submitWork } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      await submitWork(TEST_ASSIGNMENT_ID, TEST_GITHUB_URL)

      expect(mockRevalidatePath).toHaveBeenCalledWith("/projects")
    })
  })
})
