/**
 * SectionQuizButton コンポーネントのテスト
 *
 * Task 7.1: セクション詳細ページに「演習問題に挑戦」ボタンを追加
 * Requirements: 3.1, 3.2, 5.3
 *
 * Server Component のため、データフェッチロジックをモック経由でテスト。
 */

// --- モック定義 ---

const mockMaybeSingle = vi.fn()
const mockSelectChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  maybeSingle: mockMaybeSingle,
}

const mockFrom = vi.fn().mockReturnValue(mockSelectChain)

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

describe("SectionQuizButton", () => {
  let SectionQuizButton: (props: {
    tutorial: string
    chapter: string
    section: string
    genre: string
  }) => Promise<React.JSX.Element | null>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    })

    const mod = await import(
      "@/app/(authenticated)/contents/_components/section-quiz-button"
    )
    SectionQuizButton = mod.SectionQuizButton
  })

  it("クイズが存在しない場合は null を返す", async () => {
    // quizzes query returns null
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const result = await SectionQuizButton({
      tutorial: "html-css",
      chapter: "ch1",
      section: "intro",
      genre: "engineering",
    })

    expect(result).toBeNull()
  })

  it("クイズが存在する場合はボタンを含むJSXを返す", async () => {
    // First call: quiz exists
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: "quiz-1" },
      error: null,
    })
    // Second call: no quiz_logs
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const result = await SectionQuizButton({
      tutorial: "html-css",
      chapter: "ch1",
      section: "intro",
      genre: "engineering",
    })

    expect(result).not.toBeNull()
  })

  it("未認証ユーザーの場合は null を返す", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await SectionQuizButton({
      tutorial: "html-css",
      chapter: "ch1",
      section: "intro",
      genre: "engineering",
    })

    expect(result).toBeNull()
  })
})
