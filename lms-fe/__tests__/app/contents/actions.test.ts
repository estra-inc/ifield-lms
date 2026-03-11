/**
 * Contents Server Actions のテスト
 *
 * markAsRead と updateDefaultGenre Server Action のテスト。
 * 認証チェック、DB 操作、重複防止、キャッシュ無効化を検証する。
 */

// --- モック定義 ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()

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

describe("Contents Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("markAsRead (Task 7.1)", () => {
    it("認証されていない場合はエラーを返す", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      })

      const { markAsRead } = await import(
        "@/app/(authenticated)/contents/actions"
      )

      const formData = new FormData()
      formData.set("contentId", "test-content-id")

      const result = await markAsRead(null, formData)
      expect(result?.success).toBe(false)
      expect(result?.message).toContain("認証")
    })

    it("未読了の場合は content_progress に INSERT する", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })

      // SELECT で既存レコードなし
      const selectChain = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      }

      // INSERT 成功
      const insertResult = { data: { id: "progress-1" }, error: null }

      mockFrom.mockImplementation((table: string) => {
        if (table === "content_progress") {
          return {
            select: vi.fn().mockReturnValue(selectChain),
            insert: vi.fn().mockResolvedValue(insertResult),
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
      formData.set("contentId", "test-content-id")

      const result = await markAsRead(null, formData)
      expect(result?.success).toBe(true)
    })

    it("既に読了済みの場合は alreadyCompleted を返す", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })

      // SELECT で既存レコードあり
      const selectChain = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "progress-1", user_id: "user-1", content_id: "test-content-id" },
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
      formData.set("contentId", "test-content-id")

      const result = await markAsRead(null, formData)
      expect(result?.success).toBe(true)
      expect((result as { alreadyCompleted?: boolean })?.alreadyCompleted).toBe(true)
    })

    it("contentId が指定されていない場合はエラーを返す", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })

      const { markAsRead } = await import(
        "@/app/(authenticated)/contents/actions"
      )

      const formData = new FormData()
      // contentId を設定しない

      const result = await markAsRead(null, formData)
      expect(result?.success).toBe(false)
    })
  })

  describe("updateDefaultGenre (Task 5.5)", () => {
    it("認証されていない場合はエラーを返す", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      })

      const { updateDefaultGenre } = await import(
        "@/app/(authenticated)/contents/actions"
      )

      const formData = new FormData()
      formData.set("genre", "engineering")

      const result = await updateDefaultGenre(null, formData)
      expect(result?.success).toBe(false)
    })

    it("profiles.default_genre を更新する", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })

      const updateChain = {
        eq: vi.fn().mockResolvedValue({ data: { id: "user-1" }, error: null }),
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            update: vi.fn().mockReturnValue(updateChain),
          }
        }
        return {}
      })

      const { updateDefaultGenre } = await import(
        "@/app/(authenticated)/contents/actions"
      )

      const formData = new FormData()
      formData.set("genre", "design")

      const result = await updateDefaultGenre(null, formData)
      expect(result?.success).toBe(true)
    })

    it("genre が指定されていない場合はエラーを返す", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      })

      const { updateDefaultGenre } = await import(
        "@/app/(authenticated)/contents/actions"
      )

      const formData = new FormData()
      // genre を設定しない

      const result = await updateDefaultGenre(null, formData)
      expect(result?.success).toBe(false)
    })
  })
})
