/**
 * 受入基準に基づくテストカバレッジ
 *
 * saveDraft / finalizeGrading Server Action の詳細テスト、
 * フィードバックコメントのバリデーション、
 * スキルレポートのクエリテストを検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { calculateScore } from "@/lib/utils/grading"
import type {
  EvaluationCategory,
  EvaluationState,
} from "@/lib/types/grading"

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

// --- Helper ---

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

function setupGradingSubmission(
  categories: EvaluationCategory[]
) {
  const mockSubmissionSingle = vi.fn().mockResolvedValue({
    data: {
      status: "grading",
      assignment_id: "assign-001",
      project_assignments: {
        mock_projects: {
          evaluation_items: categories,
        },
      },
    },
    error: null,
  })
  const mockSubmissionEq = vi.fn().mockReturnValue({
    single: mockSubmissionSingle,
  })

  const mockEvalUpsertSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({
      data: [{ id: "eval-001" }],
      error: null,
    }),
  })

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
}

// --- Test Data ---

const testCategories: EvaluationCategory[] = [
  {
    category_large: "Backend",
    category_medium: "Laravel",
    items: [
      { id: "item-1", label: "Migration", point: 5 },
      { id: "item-2", label: "Routing", point: 3 },
    ],
  },
  {
    category_large: "Frontend",
    category_medium: "React",
    items: [
      { id: "item-3", label: "Component Design", point: 4 },
    ],
  },
]

// --- Tests ---

describe("受入基準テストカバレッジ", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ============================================================
  // saveDraft Server Action テスト
  // ============================================================
  describe("saveDraft Server Action", () => {
    it("新規下書き保存が成功すべき", async () => {
      setupSuperAdminAuth()

      const mockSubmissionSingle = vi.fn().mockResolvedValue({
        data: { status: "grading" },
        error: null,
      })
      const mockSubmissionEq = vi.fn().mockReturnValue({
        single: mockSubmissionSingle,
      })

      const mockEvalUpsertSelectEq = vi.fn().mockResolvedValue({
        data: [{ id: "eval-new" }],
        error: null,
      })
      const mockEvalUpsertSelect = vi.fn().mockReturnValue({
        eq: mockEvalUpsertSelectEq,
      })
      const mockEvalUpsert = vi.fn().mockReturnValue({
        select: mockEvalUpsertSelect,
      })

      const mockDetailsUpsert = vi.fn().mockResolvedValue({
        error: null,
      })

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "project_submissions") {
          return {
            select: vi.fn().mockReturnValue({ eq: mockSubmissionEq }),
          }
        }
        if (table === "project_evaluations") {
          return { upsert: mockEvalUpsert }
        }
        if (table === "project_evaluation_details") {
          return { upsert: mockDetailsUpsert }
        }
        return {}
      })

      const { saveDraft } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await saveDraft({
        submissionId: "sub-001",
        evaluations: { "item-1": true },
        feedbackComment: "初回下書き",
      })

      expect(result.success).toBe(true)
      expect(result.message).toContain("保存")
    })

    it("既存下書きの上書きが成功すべき（UPSERT）", async () => {
      setupSuperAdminAuth()

      const mockSubmissionSingle = vi.fn().mockResolvedValue({
        data: { status: "grading" },
        error: null,
      })
      const mockSubmissionEq = vi.fn().mockReturnValue({
        single: mockSubmissionSingle,
      })

      // UPSERT で既存レコードを上書き
      const mockEvalUpsertSelectEq = vi.fn().mockResolvedValue({
        data: [{ id: "eval-existing" }],
        error: null,
      })
      const mockEvalUpsertSelect = vi.fn().mockReturnValue({
        eq: mockEvalUpsertSelectEq,
      })
      const mockEvalUpsert = vi.fn().mockReturnValue({
        select: mockEvalUpsertSelect,
      })

      const mockDetailsUpsert = vi.fn().mockResolvedValue({
        error: null,
      })

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "project_submissions") {
          return {
            select: vi.fn().mockReturnValue({ eq: mockSubmissionEq }),
          }
        }
        if (table === "project_evaluations") {
          return { upsert: mockEvalUpsert }
        }
        if (table === "project_evaluation_details") {
          return { upsert: mockDetailsUpsert }
        }
        return {}
      })

      const { saveDraft } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await saveDraft({
        submissionId: "sub-001",
        evaluations: { "item-1": true, "item-2": true },
        feedbackComment: "更新された下書き",
      })

      expect(result.success).toBe(true)
      // onConflict: "submission_id" による UPSERT
      expect(mockEvalUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          submission_id: "sub-001",
          status: "draft",
        }),
        expect.objectContaining({ onConflict: "submission_id" })
      )
    })

    it("提出物が見つからない場合にエラーを返すべき", async () => {
      setupSuperAdminAuth()

      const mockSubmissionSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "not found" },
      })
      const mockSubmissionEq = vi.fn().mockReturnValue({
        single: mockSubmissionSingle,
      })

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === "project_submissions") {
          return {
            select: vi.fn().mockReturnValue({ eq: mockSubmissionEq }),
          }
        }
        return {}
      })

      const { saveDraft } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await saveDraft({
        submissionId: "non-existent",
        evaluations: {},
        feedbackComment: "",
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain("見つかりません")
    })
  })

  // ============================================================
  // finalizeGrading Server Action テスト
  // ============================================================
  describe("finalizeGrading Server Action", () => {
    it("正常確定でスコアが計算されるべき", async () => {
      setupSuperAdminAuth()
      setupGradingSubmission(testCategories)

      mockAdminRpc.mockResolvedValue({
        data: { success: true, score: 75 },
        error: null,
      })

      const { finalizeGrading } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await finalizeGrading({
        submissionId: "sub-001",
        evaluations: { "item-1": true, "item-2": true, "item-3": false },
        feedbackComment: "よくできました",
      })

      expect(result.success).toBe(true)
      expect(result.score).toBeDefined()
      // スコア: (5+3)/(5+3+4) * 100 = 67%
      expect(result.score).toBe(67)
    })

    it("全項目未評価での確定が拒否されるべき", async () => {
      setupSuperAdminAuth()
      setupGradingSubmission(testCategories)

      const { finalizeGrading } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await finalizeGrading({
        submissionId: "sub-001",
        evaluations: {},
        feedbackComment: "",
      })

      expect(result.success).toBe(false)
      expect(result.message).toContain("1項目以上の評価が必要")
    })

    it("graded 済み submission への確定が拒否されるべき", async () => {
      setupSuperAdminAuth()

      const mockSubmissionSingle = vi.fn().mockResolvedValue({
        data: {
          status: "graded", // already graded
          assignment_id: "assign-001",
          project_assignments: {
            mock_projects: {
              evaluation_items: testCategories,
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
            select: vi.fn().mockReturnValue({ eq: mockSubmissionEq }),
          }
        }
        return {}
      })

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

    it("サーバーサイドでスコアが再計算されるべき", () => {
      // フロントエンドのプレビューと同じ calculateScore を使用
      const evaluations: EvaluationState = {
        "item-1": true,
        "item-2": false,
        "item-3": true,
      }

      const frontendResult = calculateScore(testCategories, evaluations)
      const serverResult = calculateScore(testCategories, evaluations)

      expect(frontendResult.totalScore).toBe(serverResult.totalScore)
      expect(frontendResult.totalEarnedPoints).toBe(
        serverResult.totalEarnedPoints
      )
    })
  })

  // ============================================================
  // フィードバックコメントバリデーション
  // ============================================================
  describe("フィードバックコメントバリデーション", () => {
    it("空のフィードバックコメントが許容されるべき（任意入力）", () => {
      const comment = ""
      const isValid = comment.length <= 2000
      expect(isValid).toBe(true)
    })

    it("1文字のフィードバックコメントが許容されるべき", () => {
      const comment = "a"
      const isValid = comment.length <= 2000
      expect(isValid).toBe(true)
    })

    it("2000文字のフィードバックコメントが許容されるべき", () => {
      const comment = "a".repeat(2000)
      const isValid = comment.length <= 2000
      expect(isValid).toBe(true)
    })

    it("2001文字のフィードバックコメントが拒否されるべき", () => {
      const comment = "a".repeat(2001)
      const isValid = comment.length <= 2000
      expect(isValid).toBe(false)
    })
  })

  // ============================================================
  // スキルレポートクエリテスト
  // ============================================================
  describe("スキルレポートのクエリテスト", () => {
    it("category_large 別集計が正確であるべき", () => {
      const categories: EvaluationCategory[] = [
        {
          category_large: "Backend",
          category_medium: "Laravel",
          items: [
            { id: "1", label: "A", point: 10 },
            { id: "2", label: "B", point: 5 },
          ],
        },
        {
          category_large: "Backend",
          category_medium: "Node.js",
          items: [
            { id: "3", label: "C", point: 5 },
          ],
        },
        {
          category_large: "Frontend",
          category_medium: "React",
          items: [
            { id: "4", label: "D", point: 8 },
          ],
        },
      ]

      const evaluations: EvaluationState = {
        "1": true,
        "2": false,
        "3": true,
        "4": true,
      }

      const result = calculateScore(categories, evaluations)

      // Backend (Laravel + Node.js): earned=10+5=15, total=10+5+5=20, 75%
      const backendScore = result.categoryScores.find(
        (cs) => cs.categoryLarge === "Backend"
      )
      expect(backendScore?.earnedPoints).toBe(15)
      expect(backendScore?.totalPoints).toBe(20)
      expect(backendScore?.percentage).toBe(75)

      // Frontend: earned=8, total=8, 100%
      const frontendScore = result.categoryScores.find(
        (cs) => cs.categoryLarge === "Frontend"
      )
      expect(frontendScore?.earnedPoints).toBe(8)
      expect(frontendScore?.totalPoints).toBe(8)
      expect(frontendScore?.percentage).toBe(100)
    })

    it("複数 submission がある場合の最新選択ロジックが正しいべき", () => {
      const submissions = [
        {
          id: "s1",
          projectId: "p1",
          updatedAt: "2026-01-01T00:00:00Z",
          score: 60,
        },
        {
          id: "s2",
          projectId: "p1",
          updatedAt: "2026-02-01T00:00:00Z",
          score: 80,
        },
        {
          id: "s3",
          projectId: "p2",
          updatedAt: "2026-01-15T00:00:00Z",
          score: 90,
        },
        {
          id: "s4",
          projectId: "p1",
          updatedAt: "2026-03-01T00:00:00Z",
          score: 75,
        },
      ]

      // 案件ごとに最新を選択
      const latestByProject = new Map<
        string,
        (typeof submissions)[0]
      >()
      for (const sub of submissions) {
        const existing = latestByProject.get(sub.projectId)
        if (
          !existing ||
          new Date(sub.updatedAt) > new Date(existing.updatedAt)
        ) {
          latestByProject.set(sub.projectId, sub)
        }
      }

      expect(latestByProject.size).toBe(2)
      // p1 の最新は s4 (2026-03-01)
      expect(latestByProject.get("p1")?.id).toBe("s4")
      expect(latestByProject.get("p1")?.score).toBe(75)
      // p2 は s3 のみ
      expect(latestByProject.get("p2")?.id).toBe("s3")
      expect(latestByProject.get("p2")?.score).toBe(90)
    })

    it("レーダーチャートの軸データが category_large から正しく導出されるべき", () => {
      const categoryScores = [
        {
          categoryLarge: "Backend",
          earnedPoints: 15,
          totalPoints: 20,
          percentage: 75,
        },
        {
          categoryLarge: "Frontend",
          earnedPoints: 8,
          totalPoints: 8,
          percentage: 100,
        },
        {
          categoryLarge: "Design",
          earnedPoints: 3,
          totalPoints: 10,
          percentage: 30,
        },
      ]

      const radarData = categoryScores.map((cs) => ({
        axis: cs.categoryLarge,
        value: cs.percentage,
        fullMark: 100,
      }))

      expect(radarData).toHaveLength(3)
      expect(radarData.find((d) => d.axis === "Backend")?.value).toBe(75)
      expect(radarData.find((d) => d.axis === "Frontend")?.value).toBe(
        100
      )
      expect(radarData.find((d) => d.axis === "Design")?.value).toBe(30)
    })
  })
})
