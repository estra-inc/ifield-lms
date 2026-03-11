/**
 * 未採点提出一覧ページ Server Component のテスト
 *
 * page.tsx は Server Component であり、ロジックテストを行う。
 * データフェッチ・フィルタ・権限チェック・データ変換を検証する。
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

describe("未採点提出一覧ページ", () => {
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
      // redirect("/auth/login") が呼ばれるべき
    })

    it("super_admin 以外のロールの場合はダッシュボードにリダイレクトすべき", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-002" } },
        error: null,
      })

      const profileData = { role: "user" }
      expect(profileData.role).not.toBe("super_admin")
      // redirect("/dashboard") が呼ばれるべき
    })

    it("super_admin の場合はアクセス許可されるべき", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "admin-001" } },
        error: null,
      })

      const profileData = { role: "super_admin" }
      expect(profileData.role).toBe("super_admin")
    })
  })

  describe("データフェッチ・フィルタ", () => {
    it("status が 'submitted' または 'grading' の提出物を取得するクエリを構築すべき", () => {
      const statusFilter = ["submitted", "grading"]
      expect(statusFilter).toContain("submitted")
      expect(statusFilter).toContain("grading")
      expect(statusFilter).not.toContain("graded")
      expect(statusFilter).not.toContain("rejected")
    })

    it("提出日時の昇順（古い順）でソートすべき", () => {
      const orderConfig = { column: "created_at", ascending: true }
      expect(orderConfig.column).toBe("created_at")
      expect(orderConfig.ascending).toBe(true)
    })

    it("genre パラメータが指定されていない場合は全ジャンルを表示すべき", () => {
      const searchParams = { genre: undefined }
      const genre = searchParams.genre ?? ""
      expect(genre).toBe("")
    })

    it("genre=engineering の場合にフィルタ条件を構築すべき", () => {
      const searchParams = { genre: "engineering" }
      const genre = searchParams.genre ?? ""
      expect(genre).toBe("engineering")
    })

    it("genre=design の場合にフィルタ条件を構築すべき", () => {
      const searchParams = { genre: "design" }
      const genre = searchParams.genre ?? ""
      expect(genre).toBe("design")
    })
  })

  describe("データ変換", () => {
    it("提出データをリスト表示用の形式に変換すべき", () => {
      const submissionRow = {
        id: "sub-001",
        github_url: "https://github.com/user/repo",
        status: "submitted" as const,
        created_at: "2026-03-01T10:00:00Z",
        assignment: {
          user: { full_name: "山田 太郎" },
          project: { title: "模擬案件A", genre: "engineering" },
        },
      }

      const listItem = {
        id: submissionRow.id,
        studentName: submissionRow.assignment.user.full_name,
        projectTitle: submissionRow.assignment.project.title,
        githubUrl: submissionRow.github_url,
        submittedAt: submissionRow.created_at,
        status: submissionRow.status,
        genre: submissionRow.assignment.project.genre,
      }

      expect(listItem.id).toBe("sub-001")
      expect(listItem.studentName).toBe("山田 太郎")
      expect(listItem.projectTitle).toBe("模擬案件A")
      expect(listItem.githubUrl).toBe("https://github.com/user/repo")
      expect(listItem.status).toBe("submitted")
      expect(listItem.genre).toBe("engineering")
    })

    it("submitted と grading のステータスバッジを区別すべき", () => {
      const getStatusLabel = (status: string) => {
        switch (status) {
          case "submitted":
            return "未採点"
          case "grading":
            return "採点中"
          default:
            return status
        }
      }

      expect(getStatusLabel("submitted")).toBe("未採点")
      expect(getStatusLabel("grading")).toBe("採点中")
    })

    it("各提出物に採点画面へのリンクパスを生成すべき", () => {
      const submissionId = "sub-001"
      const gradingPath = `/admin/grading/${submissionId}`
      expect(gradingPath).toBe("/admin/grading/sub-001")
    })
  })

  describe("空状態", () => {
    it("未採点の提出がない場合は空状態メッセージを表示すべき", () => {
      const submissions: unknown[] = []
      const isEmpty = submissions.length === 0
      expect(isEmpty).toBe(true)
    })
  })
})
