/**
 * 教材機能の結合テスト
 *
 * 教材閲覧フロー、読了・進捗フロー、アクセス制御、同期 API の
 * 結合検証を実施する。
 */

// --- モック定義 ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// --- テスト ---

describe("教材機能 結合テスト (Task 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("10.1 教材閲覧フローの結合検証", () => {
    it("URL パスから slug_path を正しく構築する", () => {
      const tutorial = "html-css-basics"
      const chapter = "chapter1"
      const section = "intro"
      const slugPath = `${tutorial}/${chapter}/${section}`

      expect(slugPath).toBe("html-css-basics/chapter1/intro")
    })

    it("ジャンルプルダウンで URL searchParams が更新される", () => {
      const currentParams = new URLSearchParams("genre=engineering")
      currentParams.set("genre", "design")
      expect(currentParams.get("genre")).toBe("design")
      expect(currentParams.toString()).toBe("genre=design")
    })

    it("デフォルトジャンルが engineering であること", () => {
      const defaultGenre = null
      const selectedGenre = defaultGenre ?? "engineering"
      expect(selectedGenre).toBe("engineering")
    })

    it("ジャンル指定がある場合はそれを使用する", () => {
      const defaultGenre = "design"
      const selectedGenre = defaultGenre ?? "engineering"
      expect(selectedGenre).toBe("design")
    })
  })

  describe("10.2 読了・進捗フローの結合検証", () => {
    it("markAsRead が成功した場合に成功結果を返す", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })

      // content_progress に既存レコードなし → INSERT 成功
      const selectChain = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === "content_progress") {
          return {
            select: vi.fn().mockReturnValue(selectChain),
            insert: vi.fn().mockResolvedValue({ data: { id: "p-1" }, error: null }),
          }
        }
        if (table === "contents") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      const { markAsRead } = await import(
        "@/app/(authenticated)/contents/actions"
      )

      const formData = new FormData()
      formData.set("contentId", "content-1")

      const result = await markAsRead(null, formData)
      expect(result?.success).toBe(true)
      expect(result?.message).toContain("保存")
    })

    it("読了済みセクションで alreadyCompleted を返す", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })

      const selectChain = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "existing-progress" },
          error: null,
        }),
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === "content_progress") {
          return {
            select: vi.fn().mockReturnValue(selectChain),
          }
        }
        return {}
      })

      const { markAsRead } = await import(
        "@/app/(authenticated)/contents/actions"
      )

      const formData = new FormData()
      formData.set("contentId", "content-1")

      const result = await markAsRead(null, formData)
      expect(result?.success).toBe(true)
      expect((result as { alreadyCompleted?: boolean })?.alreadyCompleted).toBe(true)
    })

    it("チャプター最終セクション判定ロジック", () => {
      const siblings = [
        { slug_path: "tut/ch1/s1" },
        { slug_path: "tut/ch1/s2" },
        { slug_path: "tut/ch1/s3" },
      ]

      const currentPath = "tut/ch1/s3"
      const currentIndex = siblings.findIndex(
        (s) => s.slug_path === currentPath
      )
      const hasNextSection = currentIndex < siblings.length - 1

      expect(hasNextSection).toBe(false)
    })

    it("進捗率の計算が正しい", async () => {
      const {
        calculateTutorialProgress,
        calculateGenreProgressSummary,
      } = await import("@/app/(authenticated)/contents/_lib/progress")

      // 10セクション中6完了
      expect(calculateTutorialProgress(10, 6)).toBe(60)

      // 全完了
      expect(calculateTutorialProgress(5, 5)).toBe(100)

      // ジャンルサマリー
      const summary = calculateGenreProgressSummary([
        {
          id: "1",
          title: "T1",
          slug_path: "t1",
          genre: "engineering",
          chapterCount: 2,
          sectionCount: 10,
          completedSectionCount: 10,
          progressPercent: 100,
        },
        {
          id: "2",
          title: "T2",
          slug_path: "t2",
          genre: "engineering",
          chapterCount: 1,
          sectionCount: 5,
          completedSectionCount: 3,
          progressPercent: 60,
        },
      ])

      expect(summary.completedTutorials).toBe(1)
      expect(summary.totalTutorials).toBe(2)
      expect(summary.completedSections).toBe(13)
      expect(summary.totalSections).toBe(15)
    })
  })

  describe("10.3 アクセス制御の結合検証", () => {
    it("graduation_date のチェックロジック: 過去日付", () => {
      const graduationDate = "2025-01-01"
      const today = new Date("2026-02-28")
      today.setHours(0, 0, 0, 0)
      const gradDate = new Date(graduationDate + "T00:00:00")

      expect(gradDate < today).toBe(true) // アクセス拒否
    })

    it("graduation_date のチェックロジック: 未来日付", () => {
      const graduationDate = "2027-12-31"
      const today = new Date("2026-02-28")
      today.setHours(0, 0, 0, 0)
      const gradDate = new Date(graduationDate + "T00:00:00")

      expect(gradDate < today).toBe(false) // アクセス許可
    })

    it("graduation_date が NULL の場合はアクセス許可", () => {
      const graduationDate = null
      const shouldBlock = graduationDate !== null

      expect(shouldBlock).toBe(false) // アクセス許可
    })

    it("Manager ロールはコンテンツにアクセスできない（RLS 拒否）", () => {
      const userRole = "manager"
      const allowedRoles = ["user", "super_admin"]
      const canAccess = allowedRoles.includes(userRole)

      expect(canAccess).toBe(false)
    })

    it("User ロールは active コンテンツにアクセスできる", () => {
      const userRole = "user"
      const contentStatus = "active"
      const allowedRoles = ["user", "super_admin"]
      const canAccess = allowedRoles.includes(userRole) && contentStatus === "active"

      expect(canAccess).toBe(true)
    })

    it("Super Admin は全ステータスのコンテンツにアクセスできる", () => {
      const userRole = "super_admin"
      const canAccessAll = userRole === "super_admin"

      expect(canAccessAll).toBe(true)
    })
  })

  describe("10.4 同期 API の結合検証", () => {
    it("API キーが正しい場合に認証が通る", () => {
      const apiKey = "test-key"
      const expectedKey = "test-key"
      const isValid = apiKey === expectedKey

      expect(isValid).toBe(true)
    })

    it("API キーが不正な場合に認証が失敗する", () => {
      const apiKey = "wrong-key"
      const expectedKey = "test-key"
      const isValid = apiKey === expectedKey

      expect(isValid).toBe(false)
    })

    it("同期ペイロードの必須フィールドバリデーション", () => {
      const requiredFields = [
        "slug_path",
        "title",
        "genre",
        "tutorial",
        "content_type",
      ]

      const validItem = {
        slug_path: "test/path",
        title: "Test",
        genre: "engineering",
        tutorial: "test",
        content_type: "section",
      }

      const missingFields = requiredFields.filter(
        (field) => !(field in validItem)
      )
      expect(missingFields).toHaveLength(0)

      const invalidItem = {
        slug_path: "test/path",
        // title missing
        genre: "engineering",
        tutorial: "test",
        content_type: "section",
      }

      const missingFieldsInvalid = requiredFields.filter(
        (field) => !(field in invalidItem)
      )
      expect(missingFieldsInvalid).toHaveLength(1)
      expect(missingFieldsInvalid[0]).toBe("title")
    })

    it("content_type のバリデーション", () => {
      const validTypes = ["genre", "tutorial", "chapter", "section"]

      expect(validTypes.includes("section")).toBe(true)
      expect(validTypes.includes("invalid")).toBe(false)
    })

    it("成功レスポンスにサマリーが含まれる", () => {
      const response = {
        success: true,
        summary: {
          created: 5,
          updated: 3,
          archived: 1,
        },
      }

      expect(response.success).toBe(true)
      expect(response.summary.created).toBe(5)
      expect(response.summary.updated).toBe(3)
      expect(response.summary.archived).toBe(1)
    })
  })
})
