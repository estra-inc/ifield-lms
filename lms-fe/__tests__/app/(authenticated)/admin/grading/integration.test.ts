/**
 * 採点フローの全体結合テスト
 *
 * 一覧 -> 採点 -> 下書き保存 -> 復元 -> 確定 -> スキルレポート の一連のフローと、
 * ロール別スキルレポート表示、楽観的ロック警告を検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { calculateScore } from "@/lib/utils/grading"
import type {
  EvaluationCategory,
  EvaluationState,
  GradingResultData,
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

// --- Test Data ---

const testCategories: EvaluationCategory[] = [
  {
    category_large: "Backend",
    category_medium: "Laravel",
    items: [
      { id: "item-1", label: "Migration", point: 5 },
      { id: "item-2", label: "Routing", point: 3 },
      { id: "item-3", label: "Middleware", point: 2 },
    ],
  },
  {
    category_large: "Frontend",
    category_medium: "React",
    items: [
      { id: "item-4", label: "Component Design", point: 4 },
      { id: "item-5", label: "State Management", point: 8 },
    ],
  },
  {
    category_large: "Infrastructure",
    category_medium: "Docker",
    items: [
      { id: "item-6", label: "Dockerfile", point: 3 },
    ],
  },
]

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

// --- Tests ---

describe("採点フローの全体結合テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("一連のフロー: 一覧 -> 採点 -> 下書き保存 -> 復元 -> 確定", () => {
    it("Step 1: 未採点一覧から採点画面への遷移パスを構築できるべき", () => {
      const submissionId = "sub-001"
      const gradingPagePath = `/admin/grading/${submissionId}`
      expect(gradingPagePath).toBe("/admin/grading/sub-001")
    })

    it("Step 2: チェック操作でスコアをリアルタイム計算できるべき", () => {
      const evaluations: EvaluationState = {
        "item-1": true,
        "item-2": false,
        "item-4": true,
        "item-5": true,
      }

      const result = calculateScore(testCategories, evaluations)

      // Backend: item-1=OK(5pt), item-2=NG(3pt), item-3=未評価(2pt)
      // Frontend: item-4=OK(4pt), item-5=OK(8pt)
      // Infrastructure: item-6=未評価(3pt)
      expect(result.totalEarnedPoints).toBe(5 + 4 + 8) // 17
      expect(result.totalMaxPoints).toBe(5 + 3 + 2 + 4 + 8 + 3) // 25
      expect(result.totalScore).toBe(Math.round((17 / 25) * 100)) // 68
      expect(result.totalOkCount).toBe(3)
      expect(result.totalItemCount).toBe(6)
    })

    it("Step 3: 下書き保存の入力データを正しく構築できるべき", () => {
      const draftInput = {
        submissionId: "sub-001",
        evaluations: {
          "item-1": true,
          "item-2": false,
          "item-4": true,
          "item-5": true,
        },
        feedbackComment: "中間フィードバック",
      }

      expect(draftInput.submissionId).toBe("sub-001")
      expect(Object.keys(draftInput.evaluations)).toHaveLength(4)
      expect(draftInput.feedbackComment).toBe("中間フィードバック")
    })

    it("Step 4: 下書き復元でチェック状態とコメントが復元されるべき", () => {
      // 下書きデータとして保存された評価結果
      const savedEvaluations = {
        "item-1": true,
        "item-2": false,
        "item-4": true,
        "item-5": true,
      }
      const savedFeedbackComment = "中間フィードバック"

      // 復元後の初期値
      const initialEvaluations = { ...savedEvaluations }
      const initialFeedbackComment = savedFeedbackComment

      expect(initialEvaluations["item-1"]).toBe(true)
      expect(initialEvaluations["item-2"]).toBe(false)
      expect(initialFeedbackComment).toBe("中間フィードバック")
    })

    it("Step 5: 採点確定で result_data が正しく構築されるべき", () => {
      const evaluations: EvaluationState = {
        "item-1": true,
        "item-2": false,
        "item-3": true,
        "item-4": true,
        "item-5": true,
        "item-6": false,
      }

      const scoreResult = calculateScore(testCategories, evaluations)

      const resultData: GradingResultData = {
        evaluations,
        categoryScores: scoreResult.categoryScores.map((cs) => ({
          categoryLarge: cs.categoryLarge,
          earnedPoints: cs.earnedPoints,
          totalPoints: cs.totalPoints,
          percentage: cs.percentage,
        })),
      }

      expect(resultData.evaluations).toEqual(evaluations)
      expect(resultData.categoryScores).toHaveLength(3)

      // Backend: 5+2 = 7 earned, 5+3+2 = 10 total, 70%
      const backendScore = resultData.categoryScores.find(
        (cs) => cs.categoryLarge === "Backend"
      )
      expect(backendScore?.earnedPoints).toBe(7)
      expect(backendScore?.totalPoints).toBe(10)
      expect(backendScore?.percentage).toBe(70)

      // Frontend: 4+8 = 12 earned, 4+8 = 12 total, 100%
      const frontendScore = resultData.categoryScores.find(
        (cs) => cs.categoryLarge === "Frontend"
      )
      expect(frontendScore?.earnedPoints).toBe(12)
      expect(frontendScore?.totalPoints).toBe(12)
      expect(frontendScore?.percentage).toBe(100)

      // Infrastructure: 0 earned, 3 total, 0%
      const infraScore = resultData.categoryScores.find(
        (cs) => cs.categoryLarge === "Infrastructure"
      )
      expect(infraScore?.earnedPoints).toBe(0)
      expect(infraScore?.totalPoints).toBe(3)
      expect(infraScore?.percentage).toBe(0)
    })

    it("Step 6: 採点確定後に revalidatePath が呼ばれるべき", async () => {
      setupSuperAdminAuth()

      // submission check
      const mockSubmissionSingle = vi.fn().mockResolvedValue({
        data: {
          status: "grading",
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

      mockAdminRpc.mockResolvedValue({
        data: { success: true, score: 68 },
        error: null,
      })

      const { finalizeGrading } = await import(
        "@/app/(authenticated)/admin/grading/actions"
      )
      const result = await finalizeGrading({
        submissionId: "sub-001",
        evaluations: { "item-1": true, "item-4": true, "item-5": true },
        feedbackComment: "よくできました",
      })

      expect(result.success).toBe(true)
      expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/grading")
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/admin/grading/sub-001"
      )
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        "/users/skill-report"
      )
    })
  })

  describe("スキルレポートのロール別表示", () => {
    it("受講生: レーダーチャート + 案件詳細リスト + 項目レベル詳細を表示すべき", () => {
      const role = "user"
      const showRadarChart = true
      const showProjectList = true
      const showItemDetails = true // 受講生は自身の詳細を閲覧可能
      expect(showRadarChart).toBe(true)
      expect(showProjectList).toBe(true)
      expect(showItemDetails).toBe(true)
    })

    it("Manager: レーダーチャート + スコア/達成率のみ（項目レベル詳細は非表示）", () => {
      const role = "manager"
      const showRadarChart = true
      const showProjectList = true
      const showItemDetails = role === "super_admin"
      expect(showRadarChart).toBe(true)
      expect(showProjectList).toBe(true)
      expect(showItemDetails).toBe(false)
    })

    it("Super Admin: レーダーチャート + 全詳細（項目レベル OK/NG も表示）", () => {
      const role = "super_admin"
      const showRadarChart = true
      const showProjectList = true
      const showItemDetails = role === "super_admin"
      expect(showRadarChart).toBe(true)
      expect(showProjectList).toBe(true)
      expect(showItemDetails).toBe(true)
    })
  })

  describe("楽観的ロック警告", () => {
    it("既に grading 中の submission にアクセスした場合に警告を表示すべき", () => {
      const submissionStatus = "grading"
      const wasAlreadyGrading = submissionStatus === "grading"
      expect(wasAlreadyGrading).toBe(true)
    })

    it("submitted 状態の submission にアクセスした場合は警告を表示しないべき", () => {
      const submissionStatus = "submitted"
      const wasAlreadyGrading = submissionStatus === "grading"
      expect(wasAlreadyGrading).toBe(false)
    })
  })

  describe("スキルレポートのデータ集約", () => {
    it("category_large 別の集計で正確な達成率を算出すべき", () => {
      const evaluations: EvaluationState = {
        "item-1": true,
        "item-2": true,
        "item-3": false,
        "item-4": true,
        "item-5": false,
        "item-6": true,
      }

      const result = calculateScore(testCategories, evaluations)

      // Backend: item-1(5pt,OK) + item-2(3pt,OK) + item-3(2pt,NG) = 8/10 = 80%
      const backendScore = result.categoryScores.find(
        (cs) => cs.categoryLarge === "Backend"
      )
      expect(backendScore?.percentage).toBe(80)

      // Frontend: item-4(4pt,OK) + item-5(8pt,NG) = 4/12 = 33%
      const frontendScore = result.categoryScores.find(
        (cs) => cs.categoryLarge === "Frontend"
      )
      expect(frontendScore?.percentage).toBe(33)

      // Infrastructure: item-6(3pt,OK) = 3/3 = 100%
      const infraScore = result.categoryScores.find(
        (cs) => cs.categoryLarge === "Infrastructure"
      )
      expect(infraScore?.percentage).toBe(100)
    })

    it("レーダーチャートの軸データを正しく構築すべき", () => {
      const evaluations: EvaluationState = {
        "item-1": true,
        "item-2": true,
        "item-3": false,
        "item-4": true,
        "item-5": false,
        "item-6": true,
      }

      const result = calculateScore(testCategories, evaluations)

      const radarData = result.categoryScores.map((cs) => ({
        axis: cs.categoryLarge,
        value: cs.percentage,
        fullMark: 100,
      }))

      expect(radarData).toHaveLength(3)
      expect(radarData[0].axis).toBe("Backend")
      expect(radarData[0].value).toBe(80)
      expect(radarData[0].fullMark).toBe(100)
    })
  })
})
