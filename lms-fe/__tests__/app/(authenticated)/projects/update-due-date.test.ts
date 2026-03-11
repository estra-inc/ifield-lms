/**
 * @vitest-environment node
 */

/**
 * updateDueDate Server Action テスト
 *
 * - 認証チェック
 * - 提出予定日の設定
 * - 提出予定日の解除（null）
 * - DB エラーハンドリング
 */

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Supabase mock setup
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockEq2 = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

import { updateDueDate } from "@/app/(authenticated)/projects/actions"

describe("updateDueDate Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupAuthMock(user: { id: string } | null) {
    mockGetUser.mockResolvedValue({
      data: { user },
      error: user ? null : { message: "No user" },
    })
  }

  function setupUpdateMock(error: { message: string } | null = null) {
    mockFrom.mockReturnValue({ update: mockUpdate })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ eq: mockEq2 })
    mockEq2.mockResolvedValue({ error })
  }

  it("未認証の場合はエラーを返す", async () => {
    setupAuthMock(null)

    const result = await updateDueDate("assignment-1", "2026-04-01T23:59:59.000Z")

    expect(result.success).toBe(false)
    expect(result.message).toContain("認証されていません")
  })

  it("提出予定日を設定できる", async () => {
    setupAuthMock({ id: "user-1" })
    setupUpdateMock()

    const result = await updateDueDate("assignment-1", "2026-04-01T23:59:59.000Z")

    expect(result.success).toBe(true)
    expect(result.message).toContain("設定しました")
    expect(mockUpdate).toHaveBeenCalledWith({ due_date: "2026-04-01T23:59:59.000Z" })
    expect(mockEq).toHaveBeenCalledWith("id", "assignment-1")
    expect(mockEq2).toHaveBeenCalledWith("user_id", "user-1")
  })

  it("提出予定日を解除できる（null）", async () => {
    setupAuthMock({ id: "user-1" })
    setupUpdateMock()

    const result = await updateDueDate("assignment-1", null)

    expect(result.success).toBe(true)
    expect(result.message).toContain("解除しました")
    expect(mockUpdate).toHaveBeenCalledWith({ due_date: null })
  })

  it("DB エラーの場合はエラーを返す", async () => {
    setupAuthMock({ id: "user-1" })
    setupUpdateMock({ message: "Update failed" })

    const result = await updateDueDate("assignment-1", "2026-04-01T23:59:59.000Z")

    expect(result.success).toBe(false)
    expect(result.message).toContain("失敗しました")
  })
})
