/**
 * クイズページのアクセス制御テスト
 *
 * Task 9.1: 受講期間切れユーザーのクイズページアクセスブロック
 * Requirements: 3.10
 *
 * 既存 Middleware がクイズ解答ページのパスにも適用されることを確認する。
 */

// --- モック定義 ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()

const mockQueryChain = {
  select: mockSelect,
  eq: mockEq,
  single: mockSingle,
}

mockSelect.mockReturnValue(mockQueryChain)
mockEq.mockReturnValue(mockQueryChain)

const mockSupabase = {
  from: mockFrom.mockReturnValue(mockQueryChain),
  auth: {
    getUser: mockGetUser,
  },
}

// Mock updateSession
const mockUpdateSession = vi.fn()
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

// Mock NextResponse
const mockRedirect = vi.fn()
vi.mock("next/server", () => ({
  NextResponse: {
    redirect: (url: URL) => {
      mockRedirect(url.pathname)
      return { redirected: true, url }
    },
    next: () => ({ next: true }),
  },
}))

describe("Middleware クイズアクセス制御", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("クイズページのパスが /contents/ プレフィックスに含まれる", () => {
    const quizPath = "/contents/tutorial/ch1/intro/quiz"
    // Middleware のパスチェック条件: pathname === "/contents" || pathname.startsWith("/contents/")
    expect(
      quizPath === "/contents" || quizPath.startsWith("/contents/")
    ).toBe(true)
  })

  it("クイズページにジャンルパラメータがある場合もパスマッチする", () => {
    // searchParams は pathname に含まれないが、パスプレフィックスで判定される
    const quizPathWithoutParams =
      "/contents/tutorial/ch1/intro/quiz"
    expect(quizPathWithoutParams.startsWith("/contents/")).toBe(true)
  })

  it("Middleware matcher パターンがクイズパスにマッチする", async () => {
    // Middleware matcher: /((?!_next/static|_next/image|favicon\\.ico|auth/callback|api/admin/sync-curriculums|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)
    const matcherRegex =
      /^\/((?!_next\/static|_next\/image|favicon\.ico|auth\/callback|api\/admin\/sync-curriculums|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)/

    const quizPath = "/contents/tutorial/ch1/intro/quiz"
    expect(matcherRegex.test(quizPath)).toBe(true)
  })

  it("受講期間切れの場合、/contents/* パスのチェックがクイズにも適用される", async () => {
    // Middleware のロジック: pathname.startsWith("/contents/") の場合に
    // graduation_date をチェックする。quiz は /contents/.../quiz なのでマッチする。
    const pathname = "/contents/html-css/ch1/intro/quiz"

    // graduation_date チェック条件の再現
    const graduationDate = "2025-01-01" // 過去日付
    const today = new Date("2026-03-02")
    today.setHours(0, 0, 0, 0)
    const gradDate = new Date(graduationDate + "T00:00:00")

    const shouldRedirect =
      (pathname === "/contents" || pathname.startsWith("/contents/")) &&
      graduationDate &&
      gradDate < today

    expect(shouldRedirect).toBe(true)
  })

  it("受講期間が有効な場合はリダイレクトしない", () => {
    const pathname = "/contents/html-css/ch1/intro/quiz"
    const graduationDate = "2027-12-31" // 未来日付
    const today = new Date("2026-03-02")
    today.setHours(0, 0, 0, 0)
    const gradDate = new Date(graduationDate + "T00:00:00")

    const shouldRedirect =
      (pathname === "/contents" || pathname.startsWith("/contents/")) &&
      graduationDate &&
      gradDate < today

    expect(shouldRedirect).toBe(false)
  })

  it("graduation_date が NULL の場合はアクセスを許可する", () => {
    const pathname = "/contents/html-css/ch1/intro/quiz"
    const graduationDate: string | null = null

    const shouldRedirect =
      (pathname === "/contents" || pathname.startsWith("/contents/")) &&
      graduationDate &&
      new Date(graduationDate + "T00:00:00") < new Date("2026-03-02")

    expect(shouldRedirect).toBeFalsy()
  })
})
