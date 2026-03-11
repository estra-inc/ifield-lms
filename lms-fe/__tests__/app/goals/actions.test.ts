
// --- Mock: next/cache ---
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

// --- Mock: Supabase server client ---
const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockUpsert = jest.fn()

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

import {
  upsertMonthlyGoal,
  upsertWeeklyGoal,
} from "@/app/(authenticated)/goals/actions"
import { revalidatePath } from "next/cache"

describe("upsertMonthlyGoal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("認証されていない場合エラーを返す", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "not authenticated" },
    })

    const formData = new FormData()
    formData.set("year_month", "2026-02")
    formData.set("target_hours", "40")

    const result = await upsertMonthlyGoal(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
    expect(result?.message).toContain("認証")
  })

  it("バリデーションエラーの場合エラーを返す（不正な year_month 形式）", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })

    const formData = new FormData()
    formData.set("year_month", "2026/02")
    formData.set("target_hours", "40")

    const result = await upsertMonthlyGoal(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })

  it("バリデーションエラーの場合エラーを返す（目標時間が0）", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })

    const formData = new FormData()
    formData.set("year_month", "2026-02")
    formData.set("target_hours", "0")

    const result = await upsertMonthlyGoal(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })

  it("UPSERT 成功時に success を返し revalidatePath を呼ぶ", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })
    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
    }))
    mockUpsert.mockResolvedValue({ error: null })

    const formData = new FormData()
    formData.set("year_month", "2026-02")
    formData.set("target_hours", "40")

    const result = await upsertMonthlyGoal(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith("/goals")
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        year_month: "2026-02",
        target_hours: 40,
      }),
      { onConflict: "user_id,year_month" }
    )
  })

  it("DB UPSERT エラー時に失敗を返す", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })
    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
    }))
    mockUpsert.mockResolvedValue({ error: { message: "DB error" } })

    const formData = new FormData()
    formData.set("year_month", "2026-02")
    formData.set("target_hours", "40")

    const result = await upsertMonthlyGoal(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })

  it("user_id をサーバーサイドで設定する", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "server-user-id" } },
      error: null,
    })
    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
    }))
    mockUpsert.mockResolvedValue({ error: null })

    const formData = new FormData()
    formData.set("user_id", "malicious-user-id")
    formData.set("year_month", "2026-02")
    formData.set("target_hours", "40")

    await upsertMonthlyGoal(null, formData)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "server-user-id",
      }),
      expect.anything()
    )
  })
})

describe("upsertWeeklyGoal", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("認証されていない場合エラーを返す", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "not authenticated" },
    })

    const formData = new FormData()
    formData.set("start_date", "2026-02-23")
    formData.set("end_date", "2026-03-01")
    formData.set("target_hours", "20")

    const result = await upsertWeeklyGoal(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
    expect(result?.message).toContain("認証")
  })

  it("バリデーションエラーの場合エラーを返す（月曜日以外の start_date）", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })

    const formData = new FormData()
    formData.set("start_date", "2026-02-24") // 火曜日
    formData.set("end_date", "2026-03-01")
    formData.set("target_hours", "20")

    const result = await upsertWeeklyGoal(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })

  it("バリデーションエラーの場合エラーを返す（日曜日以外の end_date）", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })

    const formData = new FormData()
    formData.set("start_date", "2026-02-23") // 月曜日
    formData.set("end_date", "2026-02-28")   // 土曜日
    formData.set("target_hours", "20")

    const result = await upsertWeeklyGoal(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })

  it("バリデーションエラーの場合エラーを返す（目標時間が負の数）", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })

    const formData = new FormData()
    formData.set("start_date", "2026-02-23")
    formData.set("end_date", "2026-03-01")
    formData.set("target_hours", "-5")

    const result = await upsertWeeklyGoal(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })

  it("UPSERT 成功時に success を返し revalidatePath を呼ぶ", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })
    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
    }))
    mockUpsert.mockResolvedValue({ error: null })

    const formData = new FormData()
    formData.set("start_date", "2026-02-23") // 月曜日
    formData.set("end_date", "2026-03-01")   // 日曜日
    formData.set("target_hours", "20")

    const result = await upsertWeeklyGoal(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith("/goals")
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        start_date: "2026-02-23",
        end_date: "2026-03-01",
        target_hours: 20,
      }),
      { onConflict: "user_id,start_date" }
    )
  })

  it("DB UPSERT エラー時に失敗を返す", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })
    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
    }))
    mockUpsert.mockResolvedValue({ error: { message: "DB error" } })

    const formData = new FormData()
    formData.set("start_date", "2026-02-23")
    formData.set("end_date", "2026-03-01")
    formData.set("target_hours", "20")

    const result = await upsertWeeklyGoal(null, formData)

    expect(result).not.toBeNull()
    expect(result?.success).toBe(false)
  })

  it("user_id をサーバーサイドで設定する", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "server-user-id" } },
      error: null,
    })
    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
    }))
    mockUpsert.mockResolvedValue({ error: null })

    const formData = new FormData()
    formData.set("user_id", "malicious-user-id")
    formData.set("start_date", "2026-02-23")
    formData.set("end_date", "2026-03-01")
    formData.set("target_hours", "20")

    await upsertWeeklyGoal(null, formData)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "server-user-id",
      }),
      expect.anything()
    )
  })
})
