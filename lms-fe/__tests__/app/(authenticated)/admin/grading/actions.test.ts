/**
 * 採点 Server Actions のテスト
 *
 * saveDraft: 下書き保存
 * finalizeGrading: 採点確定
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// --- Mocks ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

const mockAdminFrom = vi.fn()
const mockAdminRpc = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    rpc: mockAdminRpc,
  })),
}))

const mockRevalidatePath = vi.fn()
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

// --- Helpers ---

function setupSuperAdminAuth(userId = "admin-001") {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
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

function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  })
}

function setupNonAdminAuth() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-001" } },
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

describe("Server Actions: 採点", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ============================================================
  // saveDraft
  // ============================================================
  describe("saveDraft", () => {
    it("super_admin が下書き保存を実行し成功すべき", async () => {
      setupSuperAdminAuth()

      // submission status check
      const mockSubmissionSingle = vi.fn().mockResolvedValue({
        data: { status: "grading" },
        error: null,
      })
      const mockSubmissionEq = vi.fn().mockReturnValue({
        single: mockSubmissionSingle,
      })

      // evaluation upsert chain: upsert().select().eq()
      const mockEvalUpsertSelectEq = vi.fn().mockResolvedValue({
        data: [{ id: "eval-001" }],
        error: null,
      })
      const mockEvalUpsertSelect = vi.fn().mockReturnValue({
        eq: mockEvalUpsertSelectEq,
      })
      const mockEvalUpsert = vi.fn().mockReturnValue({
        select: mockEvalUpsertSelect,
      })

      // details upsert
      const mockDetailsUpsert = vi.fn().mockResolvedValue({
        error: null,
      })

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "project_submissions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: mockSubmissionEq,
            }),
          }
        }
        if (table === "project_evaluations") {
          return {
            upsert: mockEvalUpsert,
          }
        }
        if (table === "project_evaluation_details") {
          return {
            upsert: mockDetailsUpsert,
          }
        }
        return {}
      })

      const { saveDraft } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await saveDraft({
        submissionId: "sub-001",
        evaluations: { "item-1": true, "item-2": false },
        feedbackComment: "テストコメント",
      })

      expect(result.success).toBe(true)
      expect(result.message).toBeDefined()
    })

    it("未認証の場合にエラーを返すべき", async () => {
      setupUnauthenticated()

      const { saveDraft } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await saveDraft({
        submissionId: "sub-001",
        evaluations: {},
        feedbackComment: "",
      })

      expect(result.success).toBe(false)
    })

    it("super_admin 以外のロールではエラーを返すべき", async () => {
      setupNonAdminAuth()

      const { saveDraft } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await saveDraft({
        submissionId: "sub-001",
        evaluations: {},
        feedbackComment: "",
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain("権限")
    })
  })

  // ============================================================
  // finalizeGrading
  // ============================================================
  describe("finalizeGrading", () => {
    it("super_admin が採点確定を実行し成功すべき", async () => {
      setupSuperAdminAuth()

      // submission check
      const mockSubmissionSingle = vi.fn().mockResolvedValue({
        data: {
          status: "grading",
          assignment_id: "assign-001",
          project_assignments: {
            mock_projects: {
              evaluation_items: [
                {
                  category_large: "Backend",
                  category_medium: "Laravel",
                  items: [
                    { id: "item-1", label: "Migration", point: 5 },
                    { id: "item-2", label: "Routing", point: 3 },
                  ],
                },
              ],
            },
          },
        },
        error: null,
      })
      const mockSubmissionEq = vi.fn().mockReturnValue({
        single: mockSubmissionSingle,
      })

      // RPC
      mockAdminRpc.mockResolvedValue({
        data: { success: true, score: 63, submission_id: "sub-001" },
        error: null,
      })

      // evaluation upsert
      const mockEvalUpsertSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: "eval-001" }],
          error: null,
        }),
      })

      // details upsert
      const mockDetailsUpsert = vi.fn().mockResolvedValue({
        error: null,
      })

      let submissionCalled = false
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "project_submissions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: mockSubmissionEq,
            }),
          }
        }
        if (table === "project_evaluations") {
          return {
            upsert: vi.fn().mockReturnValue({
              select: mockEvalUpsertSelect,
            }),
          }
        }
        if (table === "project_evaluation_details") {
          return {
            upsert: mockDetailsUpsert,
          }
        }
        return {}
      })

      const { finalizeGrading } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await finalizeGrading({
        submissionId: "sub-001",
        evaluations: { "item-1": true, "item-2": false },
        feedbackComment: "よくできました",
      })

      expect(result.success).toBe(true)
      expect(result.score).toBeDefined()
    })

    it("全項目未評価の場合にエラーを返すべき", async () => {
      setupSuperAdminAuth()

      // submission check - grading status
      const mockSubmissionSingle = vi.fn().mockResolvedValue({
        data: {
          status: "grading",
          assignment_id: "assign-001",
          project_assignments: {
            mock_projects: {
              evaluation_items: [
                {
                  category_large: "Backend",
                  category_medium: "Laravel",
                  items: [
                    { id: "item-1", label: "Migration", point: 5 },
                  ],
                },
              ],
            },
          },
        },
        error: null,
      })
      const mockSubmissionEq = vi.fn().mockReturnValue({
        single: mockSubmissionSingle,
      })

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "project_submissions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: mockSubmissionEq,
            }),
          }
        }
        return {}
      })

      const { finalizeGrading } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await finalizeGrading({
        submissionId: "sub-001",
        evaluations: {},
        feedbackComment: "",
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain("評価")
    })

    it("未認証の場合にエラーを返すべき", async () => {
      setupUnauthenticated()

      const { finalizeGrading } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await finalizeGrading({
        submissionId: "sub-001",
        evaluations: { "item-1": true },
        feedbackComment: "",
      })

      expect(result.success).toBe(false)
    })

    it("super_admin 以外のロールではエラーを返すべき", async () => {
      setupNonAdminAuth()

      const { finalizeGrading } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await finalizeGrading({
        submissionId: "sub-001",
        evaluations: { "item-1": true },
        feedbackComment: "",
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain("権限")
    })
  })
})
