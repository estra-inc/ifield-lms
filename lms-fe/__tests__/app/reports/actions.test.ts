
// --- Mock: next/cache ---
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

// --- Mock: Supabase server client ---
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    })
  ),
}))

// チェーンの設定ヘルパー
function setupFromChain(options: {
  selectReturn?: unknown
  insertReturn?: unknown
  updateReturn?: unknown
}) {
  mockFrom.mockImplementation(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  }))

  if (options.selectReturn !== undefined) {
    mockSelect.mockReturnValue({
      eq: mockEq,
    })
    mockEq.mockReturnValue({
      single: mockSingle,
    })
    mockSingle.mockResolvedValue(options.selectReturn)
  }

  if (options.insertReturn !== undefined) {
    mockInsert.mockResolvedValue(options.insertReturn)
  }

  if (options.updateReturn !== undefined) {
    mockUpdate.mockReturnValue({
      eq: jest.fn().mockResolvedValue(options.updateReturn),
    })
  }
}

import { createDailyReport, toggleLike } from "@/app/(authenticated)/reports/actions"
import { revalidatePath } from "next/cache"

describe("createDailyReport", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("認証されていない場合エラーを返す", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "not authenticated" },
    })

    const formData = new FormData()
    formData.set("report_date", "2026-02-27")
    formData.set("actual_hours", "2")
    formData.set("content", "学習内容")

    const result = await createDailyReport(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
    expect(result?.message).toContain("認証")
  })

  it("バリデーションエラーの場合エラーを返す（空の内容）", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })

    const formData = new FormData()
    formData.set("report_date", "2026-02-27")
    formData.set("actual_hours", "2")
    formData.set("content", "")

    const result = await createDailyReport(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })

  it("バリデーションエラーの場合エラーを返す（0.5刻みでない学習時間）", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })

    const formData = new FormData()
    formData.set("report_date", "2026-02-27")
    formData.set("actual_hours", "0.3")
    formData.set("content", "学習内容")

    const result = await createDailyReport(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })

  it("バリデーションエラーの場合エラーを返す（未来の日付）", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const futureDateStr = futureDate.toISOString().split("T")[0]

    const formData = new FormData()
    formData.set("report_date", futureDateStr)
    formData.set("actual_hours", "2")
    formData.set("content", "学習内容")

    const result = await createDailyReport(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })

  it("DB INSERT 成功時に success を返し revalidatePath を呼ぶ", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })
    setupFromChain({
      insertReturn: { error: null },
    })

    const formData = new FormData()
    formData.set("report_date", "2026-02-27")
    formData.set("actual_hours", "2")
    formData.set("content", "TypeScriptの学習")

    const result = await createDailyReport(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith("/reports")
    // user_id がサーバーサイドで設定されていることを確認
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        report_date: "2026-02-27",
        actual_hours: 2,
        content: "TypeScriptの学習",
      })
    )
  })

  it("DB INSERT エラー時に失敗を返す", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })
    setupFromChain({
      insertReturn: { error: { message: "DB error" } },
    })

    const formData = new FormData()
    formData.set("report_date", "2026-02-27")
    formData.set("actual_hours", "2")
    formData.set("content", "学習内容")

    const result = await createDailyReport(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })

  it("user_id をフォームデータからは取得しない", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "server-user-id" } },
      error: null,
    })
    setupFromChain({
      insertReturn: { error: null },
    })

    const formData = new FormData()
    formData.set("user_id", "malicious-user-id")
    formData.set("report_date", "2026-02-27")
    formData.set("actual_hours", "1")
    formData.set("content", "内容")

    await createDailyReport(null, formData)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "server-user-id",
      })
    )
  })
})

describe("toggleLike", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("認証されていない場合エラーを返す", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "not authenticated" },
    })

    const formData = new FormData()
    formData.set("reportId", "report-1")
    formData.set("liked", "false")

    const result = await toggleLike(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
    expect(result?.message).toContain("認証")
  })

  it("Manager 以外のロールの場合エラーを返す", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })
    setupFromChain({
      selectReturn: { data: { role: "user" }, error: null },
    })

    const formData = new FormData()
    formData.set("reportId", "report-1")
    formData.set("liked", "false")

    const result = await toggleLike(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
    expect(result?.message).toContain("権限")
  })

  it("Manager ロールの場合 liked_by_manager をトグルして成功を返す", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "manager-1" } },
      error: null,
    })

    // profiles.role 取得
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { role: "manager" }, error: null }),
            }),
          }),
        }
      }
      if (table === "daily_reports") {
        return {
          update: (data: Record<string, unknown>) => {
            mockUpdate(data)
            return {
              eq: () => Promise.resolve({ error: null }),
            }
          },
        }
      }
      return {}
    })

    const formData = new FormData()
    formData.set("reportId", "report-1")
    formData.set("liked", "false")

    const result = await toggleLike(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(true)
    // liked=false を送信 → トグルで true に更新
    expect(mockUpdate).toHaveBeenCalledWith({ liked_by_manager: true })
    expect(revalidatePath).toHaveBeenCalled()
  })

  it("liked=true を送信した場合 false にトグルする", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "manager-1" } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { role: "manager" }, error: null }),
            }),
          }),
        }
      }
      if (table === "daily_reports") {
        return {
          update: (data: Record<string, unknown>) => {
            mockUpdate(data)
            return {
              eq: () => Promise.resolve({ error: null }),
            }
          },
        }
      }
      return {}
    })

    const formData = new FormData()
    formData.set("reportId", "report-1")
    formData.set("liked", "true")

    const result = await toggleLike(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ liked_by_manager: false })
  })

  it("DB UPDATE エラー時に失敗を返す", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "manager-1" } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { role: "manager" }, error: null }),
            }),
          }),
        }
      }
      if (table === "daily_reports") {
        return {
          update: (data: Record<string, unknown>) => {
            mockUpdate(data)
            return {
              eq: () =>
                Promise.resolve({ error: { message: "update failed" } }),
            }
          },
        }
      }
      return {}
    })

    const formData = new FormData()
    formData.set("reportId", "report-1")
    formData.set("liked", "false")

    const result = await toggleLike(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })
})
