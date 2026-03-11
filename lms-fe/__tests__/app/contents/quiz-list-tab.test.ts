/**
 * 演習問題タブ関連のテスト
 *
 * Task 8.1: 教材一覧ページに「演習問題」タブを追加し、クイズ一覧を表示
 * Requirements: 3.3, 5.5
 */

// --- モック定義 ---

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockMaybeSingle = vi.fn()
const mockIn = vi.fn()

const mockQueryChain = {
  select: mockSelect,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  maybeSingle: mockMaybeSingle,
  in: mockIn,
}

mockSelect.mockReturnValue(mockQueryChain)
mockEq.mockReturnValue(mockQueryChain)
mockOrder.mockReturnValue(mockQueryChain)
mockLimit.mockReturnValue(mockQueryChain)
mockIn.mockReturnValue(mockQueryChain)

const mockFrom = vi.fn().mockReturnValue(mockQueryChain)

const mockGetUser = vi.fn()
const mockSupabase = {
  from: mockFrom,
  auth: {
    getUser: mockGetUser,
  },
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

vi.mock("@/lib/supabase/content-version", () => ({
  getActiveVersionId: vi.fn().mockResolvedValue("version-abc"),
}))

describe("QuizListTab", () => {
  let QuizListTab: (props: {
    genre: string
  }) => Promise<React.JSX.Element>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    })

    const mod = await import(
      "@/app/(authenticated)/contents/_components/quiz-list-tab"
    )
    QuizListTab = mod.QuizListTab
  })

  it("QuizListTab が正常にインスタンス化できる", async () => {
    // Empty quiz list
    mockOrder.mockResolvedValue({ data: [], error: null })

    const result = await QuizListTab({ genre: "engineering" })
    expect(result).not.toBeNull()
  })

  it("quizzes テーブルからデータをフェッチする", async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })

    await QuizListTab({ genre: "engineering" })

    expect(mockFrom).toHaveBeenCalledWith("quizzes")
  })
})

describe("ContentsTabs", () => {
  let ContentsTabs: (props: {
    activeTab: string
    genre: string
  }) => React.JSX.Element

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import(
      "@/app/(authenticated)/contents/_components/contents-tabs"
    )
    ContentsTabs = mod.ContentsTabs
  })

  it("ContentsTabs が activeTab プロパティを受け取れる", () => {
    const result = ContentsTabs({ activeTab: "materials", genre: "engineering" })
    expect(result).not.toBeNull()
  })
})
