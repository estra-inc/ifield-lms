/**
 * @vitest-environment jsdom
 */

/**
 * SubmissionHistory Server Component テスト
 *
 * Task 9.1: 提出履歴タブの実装
 * Requirements: 7.1, 7.2, 7.3
 *
 * - 提出履歴の表示（ステータスバッジ、GitHub URL、提出日時）
 * - 提出が存在しない場合の空状態メッセージ
 * - 5件ごとのページネーション
 * - ページネーションの URL searchParams 管理
 */
import { render, screen } from "@testing-library/react"

// Mock Supabase client
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const mockFrom = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

// Setup chainable mock
function setupSupabaseMock(data: unknown[], count: number) {
  mockFrom.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ order: mockOrder })
  mockOrder.mockReturnValue({ range: mockRange })
  mockRange.mockResolvedValue({ data, count, error: null })
}

function setupSupabaseMockWithError() {
  mockFrom.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ order: mockOrder })
  mockOrder.mockReturnValue({ range: mockRange })
  mockRange.mockResolvedValue({ data: null, count: 0, error: { message: "DB error" } })
}

import { SubmissionHistory } from "@/app/(authenticated)/projects/_components/submission-history"

describe("SubmissionHistory (Task 9.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("提出が存在しない場合は空状態メッセージを表示する", async () => {
    setupSupabaseMock([], 0)

    const component = await SubmissionHistory({
      assignmentId: "assignment-1",
      currentPage: 1,
      slug: "test-project",
    })
    render(component)

    expect(screen.getByText("まだ提出がありません")).toBeInTheDocument()
  })

  it("提出履歴を表示する（ステータスバッジ、GitHub URL、提出日時）", async () => {
    const submissions = [
      {
        id: "sub-1",
        assignment_id: "assignment-1",
        github_url: "https://github.com/user/repo1",
        status: "submitted",
        score: null,
        result_data: null,
        created_at: "2026-03-01T10:00:00+09:00",
        updated_at: "2026-03-01T10:00:00+09:00",
      },
      {
        id: "sub-2",
        assignment_id: "assignment-1",
        github_url: "https://github.com/user/repo2",
        status: "graded",
        score: 85,
        result_data: null,
        created_at: "2026-02-28T14:30:00+09:00",
        updated_at: "2026-02-28T14:30:00+09:00",
      },
    ]
    setupSupabaseMock(submissions, 2)

    const component = await SubmissionHistory({
      assignmentId: "assignment-1",
      currentPage: 1,
      slug: "test-project",
    })
    render(component)

    // ステータスバッジ表示
    expect(screen.getByText("提出済み")).toBeInTheDocument()
    expect(screen.getByText("採点完了")).toBeInTheDocument()

    // GitHub URL 表示
    expect(screen.getByText("https://github.com/user/repo1")).toBeInTheDocument()
    expect(screen.getByText("https://github.com/user/repo2")).toBeInTheDocument()

    // URL がリンクとして表示されている
    const links = screen.getAllByRole("link")
    expect(links.some((link) => link.getAttribute("href") === "https://github.com/user/repo1")).toBe(true)
    expect(links.some((link) => link.getAttribute("href") === "https://github.com/user/repo2")).toBe(true)
  })

  it("各ステータスに対応する日本語ラベルが表示される", async () => {
    const submissions = [
      {
        id: "sub-1",
        assignment_id: "assignment-1",
        github_url: "https://github.com/user/repo1",
        status: "submitted",
        score: null,
        result_data: null,
        created_at: "2026-03-01T10:00:00+09:00",
        updated_at: "2026-03-01T10:00:00+09:00",
      },
      {
        id: "sub-2",
        assignment_id: "assignment-1",
        github_url: "https://github.com/user/repo2",
        status: "grading",
        score: null,
        result_data: null,
        created_at: "2026-02-28T14:30:00+09:00",
        updated_at: "2026-02-28T14:30:00+09:00",
      },
      {
        id: "sub-3",
        assignment_id: "assignment-1",
        github_url: "https://github.com/user/repo3",
        status: "graded",
        score: 90,
        result_data: null,
        created_at: "2026-02-27T09:00:00+09:00",
        updated_at: "2026-02-27T09:00:00+09:00",
      },
      {
        id: "sub-4",
        assignment_id: "assignment-1",
        github_url: "https://github.com/user/repo4",
        status: "rejected",
        score: null,
        result_data: null,
        created_at: "2026-02-26T16:00:00+09:00",
        updated_at: "2026-02-26T16:00:00+09:00",
      },
    ]
    setupSupabaseMock(submissions, 4)

    const component = await SubmissionHistory({
      assignmentId: "assignment-1",
      currentPage: 1,
      slug: "test-project",
    })
    render(component)

    expect(screen.getByText("提出済み")).toBeInTheDocument()
    expect(screen.getByText("採点中")).toBeInTheDocument()
    expect(screen.getByText("採点完了")).toBeInTheDocument()
    expect(screen.getByText("差し戻し")).toBeInTheDocument()
  })

  it("提出日時を日本語フォーマットで表示する", async () => {
    const submissions = [
      {
        id: "sub-1",
        assignment_id: "assignment-1",
        github_url: "https://github.com/user/repo1",
        status: "submitted",
        score: null,
        result_data: null,
        created_at: "2026-03-01T10:00:00+09:00",
        updated_at: "2026-03-01T10:00:00+09:00",
      },
    ]
    setupSupabaseMock(submissions, 1)

    const component = await SubmissionHistory({
      assignmentId: "assignment-1",
      currentPage: 1,
      slug: "test-project",
    })
    render(component)

    // 日本語ロケールのフォーマットで表示されることを確認
    // Intl.DateTimeFormat("ja-JP") produces: "2026/3/1 10:00"
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })

  it("5件ごとのページネーションで正しい range を指定する", async () => {
    setupSupabaseMock([], 0)

    await SubmissionHistory({
      assignmentId: "assignment-1",
      currentPage: 2,
      slug: "test-project",
    })

    // Page 2 = items 5-9 (0-indexed range)
    expect(mockRange).toHaveBeenCalledWith(5, 9)
  })

  it("ページ1では range 0-4 を指定する", async () => {
    setupSupabaseMock([], 0)

    await SubmissionHistory({
      assignmentId: "assignment-1",
      currentPage: 1,
      slug: "test-project",
    })

    expect(mockRange).toHaveBeenCalledWith(0, 4)
  })

  it("assignment_id で eq フィルタを適用する", async () => {
    setupSupabaseMock([], 0)

    await SubmissionHistory({
      assignmentId: "assignment-123",
      currentPage: 1,
      slug: "test-project",
    })

    expect(mockEq).toHaveBeenCalledWith("assignment_id", "assignment-123")
  })

  it("created_at DESC でソートする", async () => {
    setupSupabaseMock([], 0)

    await SubmissionHistory({
      assignmentId: "assignment-1",
      currentPage: 1,
      slug: "test-project",
    })

    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false })
  })

  it("総件数が5件を超える場合にページネーションコントロールを表示する", async () => {
    const submissions = Array.from({ length: 5 }, (_, i) => ({
      id: `sub-${i}`,
      assignment_id: "assignment-1",
      github_url: `https://github.com/user/repo${i}`,
      status: "submitted",
      score: null,
      result_data: null,
      created_at: `2026-03-0${i + 1}T10:00:00+09:00`,
      updated_at: `2026-03-0${i + 1}T10:00:00+09:00`,
    }))
    setupSupabaseMock(submissions, 8) // Total 8 items = 2 pages

    const component = await SubmissionHistory({
      assignmentId: "assignment-1",
      currentPage: 1,
      slug: "test-project",
    })
    render(component)

    // ページネーションリンクが存在する
    const paginationLinks = screen.getAllByRole("link").filter(
      (link) => link.getAttribute("href")?.includes("page=")
    )
    expect(paginationLinks.length).toBeGreaterThan(0)
  })

  it("総件数が5件以下の場合はページネーションコントロールを表示しない", async () => {
    const submissions = [
      {
        id: "sub-1",
        assignment_id: "assignment-1",
        github_url: "https://github.com/user/repo1",
        status: "submitted",
        score: null,
        result_data: null,
        created_at: "2026-03-01T10:00:00+09:00",
        updated_at: "2026-03-01T10:00:00+09:00",
      },
    ]
    setupSupabaseMock(submissions, 1)

    const component = await SubmissionHistory({
      assignmentId: "assignment-1",
      currentPage: 1,
      slug: "test-project",
    })
    render(component)

    // ページネーションリンクが存在しない
    const paginationLinks = screen.queryAllByRole("link").filter(
      (link) => link.getAttribute("href")?.includes("page=")
    )
    expect(paginationLinks.length).toBe(0)
  })

  it("ページネーションリンクに正しい URL が設定される", async () => {
    const submissions = Array.from({ length: 5 }, (_, i) => ({
      id: `sub-${i}`,
      assignment_id: "assignment-1",
      github_url: `https://github.com/user/repo${i}`,
      status: "submitted",
      score: null,
      result_data: null,
      created_at: `2026-03-0${i + 1}T10:00:00+09:00`,
      updated_at: `2026-03-0${i + 1}T10:00:00+09:00`,
    }))
    setupSupabaseMock(submissions, 12) // 3 pages

    const component = await SubmissionHistory({
      assignmentId: "assignment-1",
      currentPage: 1,
      slug: "test-project",
    })
    render(component)

    // Page 2 リンクが存在する
    const page2Link = screen.getAllByRole("link").find(
      (link) => link.getAttribute("href")?.includes("page=2")
    )
    expect(page2Link).toBeDefined()
  })

  it("DB エラーの場合も空状態メッセージを表示する", async () => {
    setupSupabaseMockWithError()

    const component = await SubmissionHistory({
      assignmentId: "assignment-1",
      currentPage: 1,
      slug: "test-project",
    })
    render(component)

    expect(screen.getByText("まだ提出がありません")).toBeInTheDocument()
  })
})
