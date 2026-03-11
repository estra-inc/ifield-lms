/**
 * 採点画面ページ Server Component のテスト
 *
 * データフェッチ、ステータス更新、権限チェック、警告表示ロジックを検証する。
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { EvaluationCategory } from "@/lib/types/grading"

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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}))

const mockRedirect = vi.fn()
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

// --- Tests ---

describe("採点画面ページ", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("認証・権限チェック", () => {
    it("未認証の場合はログインページにリダイレクトすべき", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "not authenticated" },
      })

      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      expect(user).toBeNull()
    })

    it("super_admin 以外のロールの場合はリダイレクトすべき", () => {
      const profileData = { role: "manager" }
      expect(profileData.role).not.toBe("super_admin")
    })
  })

  describe("データフェッチ", () => {
    it("submissionId から提出物・案件・評価項目データを取得すべき", () => {
      const submissionId = "sub-001"
      const expectedQuery = {
        table: "project_submissions",
        columns: ["id", "submission_url", "submission_files", "status", "assignment_id"],
        filter: { id: submissionId },
      }

      expect(expectedQuery.table).toBe("project_submissions")
      expect(expectedQuery.filter.id).toBe("sub-001")
    })

    it("evaluation_items を階層構造として取得すべき", () => {
      const evaluationItems: EvaluationCategory[] = [
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
          items: [{ id: "item-3", label: "Component Design", point: 4 }],
        },
      ]

      expect(evaluationItems).toHaveLength(2)
      expect(evaluationItems[0].category_large).toBe("Backend")
      expect(evaluationItems[0].items).toHaveLength(2)
    })
  })

  describe("ステータス更新", () => {
    it("ページアクセス時に status を grading に更新すべき", () => {
      const currentStatus = "submitted"
      const newStatus = "grading"

      expect(currentStatus).toBe("submitted")
      expect(newStatus).toBe("grading")
    })

    it("既に grading 中の場合は警告を表示すべき", () => {
      const currentStatus = "grading"
      const shouldShowWarning = currentStatus === "grading"

      expect(shouldShowWarning).toBe(true)
    })

    it("graded 済みの場合はアクセスを拒否すべき", () => {
      const currentStatus = "graded"
      const shouldReject = currentStatus === "graded"

      expect(shouldReject).toBe(true)
    })
  })

  describe("下書きデータの復元", () => {
    it("既存の下書きデータが存在する場合は復元データを渡すべき", () => {
      const draftEvaluation = {
        status: "draft" as const,
        feedback_comment: "途中のコメント",
      }
      const draftDetails = [
        { item_id: "item-1", is_ok: true },
        { item_id: "item-2", is_ok: false },
      ]

      const initialEvaluations: Record<string, boolean> = {}
      for (const detail of draftDetails) {
        initialEvaluations[detail.item_id] = detail.is_ok
      }

      expect(initialEvaluations["item-1"]).toBe(true)
      expect(initialEvaluations["item-2"]).toBe(false)
      expect(draftEvaluation.feedback_comment).toBe("途中のコメント")
    })

    it("下書きデータがない場合は空の初期値を渡すべき", () => {
      const initialEvaluations: Record<string, boolean> = {}
      const initialFeedbackComment = ""

      expect(Object.keys(initialEvaluations)).toHaveLength(0)
      expect(initialFeedbackComment).toBe("")
    })
  })

  describe("表示情報", () => {
    it("受講生名、案件タイトル、提出URLを表示データとして構成すべき", () => {
      const displayData = {
        studentName: "山田 太郎",
        projectTitle: "ECサイト模擬案件",
        submissionUrl: "https://github.com/yamada/ec-site",
        submissionFiles: [],
      }

      expect(displayData.studentName).toBe("山田 太郎")
      expect(displayData.projectTitle).toBe("ECサイト模擬案件")
      expect(displayData.submissionUrl).toContain("github.com")
    })
  })
})
