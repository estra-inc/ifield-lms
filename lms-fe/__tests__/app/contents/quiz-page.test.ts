/**
 * クイズ解答ページ（Server Component）のテスト
 *
 * Task 4.1: クイズ解答ページのルートとデータフェッチ
 * Requirements: 3.2, 5.4, 7.1
 *
 * Server Component のため、データフェッチロジックをモック経由でテストする。
 */

// --- モック定義 ---

const mockMaybeSingle = vi.fn()
const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockEq = vi.fn()

const mockQueryChain = {
  select: mockSelect,
  eq: mockEq,
  limit: mockLimit,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
}

// each method returns the chain itself
mockSelect.mockReturnValue(mockQueryChain)
mockEq.mockReturnValue(mockQueryChain)
mockLimit.mockReturnValue(mockQueryChain)
mockOrder.mockReturnValue(mockQueryChain)

const mockFrom = vi.fn().mockReturnValue(mockQueryChain)

const mockGetUser = vi.fn()
const mockSupabase = {
  from: mockFrom,
  auth: {
    getUser: mockGetUser,
  },
}

// Mock createClient
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

// Mock resolveVersionId
const mockResolveVersionId = vi.fn()
vi.mock("@/lib/supabase/content-version", () => ({
  resolveVersionId: (...args: unknown[]) => mockResolveVersionId(...args),
}))

// Mock next/navigation
const mockNotFound = vi.fn()
const mockRedirect = vi.fn()
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound()
    throw new Error("NEXT_NOT_FOUND")
  },
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error("NEXT_REDIRECT")
  },
}))

describe("QuizPage データフェッチロジック", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    })
    mockResolveVersionId.mockResolvedValue("version-abc")
  })

  it("未認証ユーザーはログインページにリダイレクトされる", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { default: QuizPage } = await import(
      "@/app/(authenticated)/contents/[tutorial]/[chapter]/[section]/quiz/page"
    )

    await expect(
      QuizPage({
        params: Promise.resolve({
          tutorial: "html-css",
          chapter: "ch1",
          section: "intro",
        }),
        searchParams: Promise.resolve({ genre: "engineering" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT")

    expect(mockRedirect).toHaveBeenCalledWith("/auth/login")
  })

  it("active バージョンが存在しない場合 404 を返す", async () => {
    mockResolveVersionId.mockResolvedValue(null)

    const { default: QuizPage } = await import(
      "@/app/(authenticated)/contents/[tutorial]/[chapter]/[section]/quiz/page"
    )

    await expect(
      QuizPage({
        params: Promise.resolve({
          tutorial: "html-css",
          chapter: "ch1",
          section: "intro",
        }),
        searchParams: Promise.resolve({ genre: "engineering" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND")

    expect(mockNotFound).toHaveBeenCalled()
  })

  it("クイズが存在しない場合 404 を返す", async () => {
    // Quiz query returns null
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { default: QuizPage } = await import(
      "@/app/(authenticated)/contents/[tutorial]/[chapter]/[section]/quiz/page"
    )

    await expect(
      QuizPage({
        params: Promise.resolve({
          tutorial: "html-css",
          chapter: "ch1",
          section: "intro",
        }),
        searchParams: Promise.resolve({ genre: "engineering" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND")
  })
})
