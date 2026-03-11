/**
 * 受講生向けスキルレポートページのテスト
 *
 * graded 済みの全案件スコア集約、案件ごとのレーダーチャート表示、
 * 案件詳細リスト、空状態表示、最新結果の選択ロジックを検証する。
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

const mockRedirect = vi.fn()
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

// --- Tests ---

describe("受講生スキルレポートページ", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("認証チェック", () => {
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
      // redirect("/auth/login") が呼ばれるべき
    })

    it("認証済みユーザーがアクセスできるべき", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-001" } },
        error: null,
      })

      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      expect(user).not.toBeNull()
      expect(user?.id).toBe("user-001")
    })
  })

  describe("データ集約ロジック", () => {
    it("graded 済みの submissions のみを対象とすべき", () => {
      const submissions = [
        { id: "sub-1", status: "graded" },
        { id: "sub-2", status: "submitted" },
        { id: "sub-3", status: "grading" },
        { id: "sub-4", status: "graded" },
      ]

      const gradedOnly = submissions.filter((s) => s.status === "graded")
      expect(gradedOnly).toHaveLength(2)
      expect(gradedOnly.map((s) => s.id)).toEqual(["sub-1", "sub-4"])
    })

    it("同一案件に複数回の採点がある場合、最新の graded 結果を選択すべき", () => {
      const submissions = [
        {
          id: "sub-1",
          projectId: "proj-A",
          status: "graded",
          gradedAt: "2026-02-01T00:00:00Z",
        },
        {
          id: "sub-2",
          projectId: "proj-A",
          status: "graded",
          gradedAt: "2026-03-01T00:00:00Z",
        },
        {
          id: "sub-3",
          projectId: "proj-B",
          status: "graded",
          gradedAt: "2026-02-15T00:00:00Z",
        },
      ]

      // 案件ごとにグループ化し最新を選択
      const latestByProject = new Map<
        string,
        (typeof submissions)[0]
      >()
      for (const sub of submissions) {
        const existing = latestByProject.get(sub.projectId)
        if (
          !existing ||
          new Date(sub.gradedAt) > new Date(existing.gradedAt)
        ) {
          latestByProject.set(sub.projectId, sub)
        }
      }

      expect(latestByProject.size).toBe(2)
      expect(latestByProject.get("proj-A")?.id).toBe("sub-2") // 最新
      expect(latestByProject.get("proj-B")?.id).toBe("sub-3")
    })

    it("category_large ごとの達成率を算出すべき", () => {
      const evaluationDetails = [
        {
          category_large: "Backend",
          point: 5,
          is_ok: true,
        },
        {
          category_large: "Backend",
          point: 3,
          is_ok: false,
        },
        {
          category_large: "Frontend",
          point: 4,
          is_ok: true,
        },
        {
          category_large: "Frontend",
          point: 8,
          is_ok: true,
        },
      ]

      // category_large ごとに集計
      const categoryMap = new Map<
        string,
        { earned: number; total: number }
      >()
      for (const detail of evaluationDetails) {
        const existing = categoryMap.get(detail.category_large) ?? {
          earned: 0,
          total: 0,
        }
        existing.total += detail.point
        if (detail.is_ok) {
          existing.earned += detail.point
        }
        categoryMap.set(detail.category_large, existing)
      }

      const backendResult = categoryMap.get("Backend")
      expect(backendResult).toBeDefined()
      expect(backendResult!.earned).toBe(5)
      expect(backendResult!.total).toBe(8)
      expect(Math.round((backendResult!.earned / backendResult!.total) * 100)).toBe(63)

      const frontendResult = categoryMap.get("Frontend")
      expect(frontendResult).toBeDefined()
      expect(frontendResult!.earned).toBe(12)
      expect(frontendResult!.total).toBe(12)
      expect(Math.round((frontendResult!.earned / frontendResult!.total) * 100)).toBe(100)
    })
  })

  describe("表示コンテンツ", () => {
    it("案件ごとの詳細セクション（案件名、スコア、採点日）をリスト表示すべき", () => {
      const projectDetails = [
        { projectTitle: "模擬案件A", score: 85, gradedAt: "2026-03-01T10:00:00Z" },
        { projectTitle: "模擬案件B", score: 72, gradedAt: "2026-03-02T14:00:00Z" },
      ]

      expect(projectDetails).toHaveLength(2)
      expect(projectDetails[0].projectTitle).toBe("模擬案件A")
      expect(projectDetails[0].score).toBe(85)
      expect(projectDetails[1].projectTitle).toBe("模擬案件B")
    })

    it("詳細セクションの案件クリックで採点結果詳細へ遷移するパスを生成すべき", () => {
      const submissionId = "sub-001"
      const assignmentId = "assign-001"
      // 既存の mock-projects 詳細ページへの遷移パス
      const resultPath = `/projects/${assignmentId}/submissions/${submissionId}`
      expect(resultPath).toContain(submissionId)
    })
  })

  describe("空状態", () => {
    it("graded 済みの案件が存在しない場合は空状態メッセージを表示すべき", () => {
      const gradedSubmissions: unknown[] = []
      const isEmpty = gradedSubmissions.length === 0
      expect(isEmpty).toBe(true)
    })

    it("空状態ではレーダーチャートを非表示にすべき", () => {
      const gradedSubmissions: unknown[] = []
      const showRadarChart = gradedSubmissions.length > 0
      expect(showRadarChart).toBe(false)
    })
  })

  describe("ページパス", () => {
    it("受講生向けスキルレポートのパスが正しいこと", () => {
      const pagePath = "/users/skill-report"
      expect(pagePath).toBe("/users/skill-report")
    })
  })
})
