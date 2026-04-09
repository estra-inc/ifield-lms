import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { notifySlack } from "@/lib/notifications/slack"

describe("notifySlack", () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  const samplePayload = {
    text: "test summary",
    blocks: [{ type: "section", text: { type: "mrkdwn", text: "hello" } }],
  }

  it("SLACK_WEBHOOK_URL が未設定の場合は fetch を呼ばずに no-op となる", async () => {
    delete process.env.SLACK_WEBHOOK_URL
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    await notifySlack(samplePayload)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("SLACK_WEBHOOK_URL is not set")
    )
  })

  it("Webhook URL が設定済みの場合、JSON ペイロードを POST する", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/TEST"
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }))

    await notifySlack(samplePayload)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0]
    expect(calledUrl).toBe("https://hooks.slack.com/services/TEST")
    expect(calledInit?.method).toBe("POST")
    expect(calledInit?.headers).toEqual({ "Content-Type": "application/json" })
    expect(JSON.parse(calledInit?.body as string)).toEqual(samplePayload)
  })

  it("HTTP 5xx 応答時は console.error を呼ぶが例外を投げない", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/TEST"
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("internal error", { status: 500 })
    )

    await expect(notifySlack(samplePayload)).resolves.toBeUndefined()

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Slack webhook failed")
    )
  })

  it("HTTP 4xx 応答時も例外を投げず error ログを出す", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/TEST"
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not found", { status: 404 })
    )

    await expect(notifySlack(samplePayload)).resolves.toBeUndefined()

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("status=404")
    )
  })

  it("ネットワークエラーが発生しても例外を投げない", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/TEST"
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("ECONNREFUSED")
    )

    await expect(notifySlack(samplePayload)).resolves.toBeUndefined()

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("network error"),
      expect.any(Error)
    )
  })
})
