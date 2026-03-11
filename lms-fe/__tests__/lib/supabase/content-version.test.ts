/**
 * getActiveVersionId ユーティリティのテスト
 *
 * content_versions テーブルから active バージョンの ID を取得する
 * 共通ユーティリティ関数のテスト。
 *
 * Requirements: 7.1, 7.2, 7.3
 */

// --- モック定義 ---

const mockFrom = vi.fn()

const mockSupabaseClient = {
  from: mockFrom,
}

// --- テスト ---

describe("getActiveVersionId", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("active バージョンが存在する場合、その ID を返す", async () => {
    const activeVersionId = "550e8400-e29b-41d4-a716-446655440000"

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: activeVersionId },
        error: null,
      }),
    }

    mockFrom.mockReturnValue(mockChain)

    const { getActiveVersionId } = await import(
      "@/lib/supabase/content-version"
    )

    const result = await getActiveVersionId(mockSupabaseClient as any)

    expect(result).toBe(activeVersionId)
    expect(mockFrom).toHaveBeenCalledWith("content_versions")
    expect(mockChain.select).toHaveBeenCalledWith("id")
    expect(mockChain.eq).toHaveBeenCalledWith("status", "active")
    expect(mockChain.limit).toHaveBeenCalledWith(1)
    expect(mockChain.maybeSingle).toHaveBeenCalled()
  })

  it("active バージョンが存在しない場合、null を返す", async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }

    mockFrom.mockReturnValue(mockChain)

    const { getActiveVersionId } = await import(
      "@/lib/supabase/content-version"
    )

    const result = await getActiveVersionId(mockSupabaseClient as any)

    expect(result).toBeNull()
  })

  it("クエリエラーが発生した場合、null を返す", async () => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "RLS policy violation", code: "42501" },
      }),
    }

    mockFrom.mockReturnValue(mockChain)

    const { getActiveVersionId } = await import(
      "@/lib/supabase/content-version"
    )

    const result = await getActiveVersionId(mockSupabaseClient as any)

    expect(result).toBeNull()
  })
})
