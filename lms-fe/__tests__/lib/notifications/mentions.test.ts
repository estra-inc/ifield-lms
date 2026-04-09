import { describe, it, expect, vi, beforeEach } from "vitest"
import { resolveCoachMention, HERE_MENTION } from "@/lib/notifications/mentions"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"

/**
 * Supabase クライアントのメソッドチェーンをモックするヘルパ。
 * .from("profiles").select("slack_user_id").eq("id", ...).single() の戻り値を制御する。
 */
function createMockClient(
  singleResult: { data: { slack_user_id: string | null } | null; error: { message: string } | null }
): SupabaseClient<Database> {
  const single = vi.fn().mockResolvedValue(singleResult)
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from } as unknown as SupabaseClient<Database>
}

describe("resolveCoachMention", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("coachId が null の場合、@here を返し警告ログを出す", async () => {
    const client = createMockClient({ data: null, error: null })

    const result = await resolveCoachMention(client, null)

    expect(result).toBe(HERE_MENTION)
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("coachId is null")
    )
    // クエリは発行されないこと
    expect(client.from).not.toHaveBeenCalled()
  })

  it("slack_user_id が登録済みの場合、<@...> 形式を返す", async () => {
    const client = createMockClient({
      data: { slack_user_id: "U01ABCDEF" },
      error: null,
    })

    const result = await resolveCoachMention(client, "coach-uuid-1")

    expect(result).toBe("<@U01ABCDEF>")
    expect(client.from).toHaveBeenCalledWith("profiles")
  })

  it("Enterprise Grid の W プレフィックス ID も正しくメンション文字列化される", async () => {
    const client = createMockClient({
      data: { slack_user_id: "W01XYZABC" },
      error: null,
    })

    const result = await resolveCoachMention(client, "coach-uuid-2")

    expect(result).toBe("<@W01XYZABC>")
  })

  it("slack_user_id が NULL の場合、@here を返す", async () => {
    const client = createMockClient({
      data: { slack_user_id: null },
      error: null,
    })

    const result = await resolveCoachMention(client, "coach-uuid-3")

    expect(result).toBe(HERE_MENTION)
  })

  it("profiles 取得エラーの場合、@here を返しエラーログを出す", async () => {
    const client = createMockClient({
      data: null,
      error: { message: "permission denied" },
    })

    const result = await resolveCoachMention(client, "coach-uuid-4")

    expect(result).toBe(HERE_MENTION)
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("failed to fetch coach profile"),
      expect.stringContaining("permission denied")
    )
  })

  it("data が null（レコード未存在）でも @here を返しエラーログを出す", async () => {
    const client = createMockClient({
      data: null,
      error: null,
    })

    const result = await resolveCoachMention(client, "coach-uuid-5")

    expect(result).toBe(HERE_MENTION)
    expect(console.error).toHaveBeenCalled()
  })
})
