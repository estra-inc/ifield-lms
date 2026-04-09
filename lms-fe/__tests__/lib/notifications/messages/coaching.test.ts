import { describe, it, expect } from "vitest"
import {
  buildBookingBlocks,
  buildCancellationBlocks,
  formatCoachingDateTime,
  type CoachingNotificationInput,
} from "@/lib/notifications/messages/coaching"
import { HERE_MENTION } from "@/lib/notifications/mentions"

const baseInput: CoachingNotificationInput = {
  studentName: "山田太郎",
  coachId: "coach-uuid",
  coachName: "佐藤花子",
  genre: "engineering",
  sessionDate: "2026-04-15",
  startTime: "14:00",
  endTime: "15:00",
}

describe("formatCoachingDateTime", () => {
  it("YYYY-MM-DD と HH:MM を結合して曜日付きの日時文字列を返す", () => {
    expect(formatCoachingDateTime("2026-04-15", "14:00", "15:00")).toBe(
      "2026/04/15 (水) 14:00〜15:00"
    )
  })

  it("月日が1桁の日付もゼロパディングされる", () => {
    expect(formatCoachingDateTime("2026-01-05", "09:00", "10:00")).toBe(
      "2026/01/05 (月) 09:00〜10:00"
    )
  })
})

describe("buildBookingBlocks", () => {
  it("メンション付きの場合のブロック構造（snapshot）", () => {
    const blocks = buildBookingBlocks(baseInput, "<@U01ABCDEF>")
    expect(blocks).toMatchSnapshot()
  })

  it("@here フォールバックの場合のブロック構造（snapshot）", () => {
    const blocks = buildBookingBlocks(baseInput, HERE_MENTION)
    expect(blocks).toMatchSnapshot()
  })

  it("デザインジャンルの場合 fields に『デザイン』が含まれる", () => {
    const blocks = buildBookingBlocks(
      { ...baseInput, genre: "design" },
      "<@U01ABCDEF>"
    )
    const fieldsBlock = blocks[2] as { fields: { text: string }[] }
    const fieldsText = fieldsBlock.fields.map((f) => f.text).join("\n")
    expect(fieldsText).toContain("デザイン")
    expect(fieldsText).not.toContain("エンジニアリング")
  })

  it("coachName が null の場合は『未割当』が表示される", () => {
    const blocks = buildBookingBlocks(
      { ...baseInput, coachName: null },
      "<@U01ABCDEF>"
    )
    const fieldsBlock = blocks[2] as { fields: { text: string }[] }
    const fieldsText = fieldsBlock.fields.map((f) => f.text).join("\n")
    expect(fieldsText).toContain("未割当")
  })

  it("管理画面リンクのボタンが含まれる", () => {
    const blocks = buildBookingBlocks(baseInput, "<@U01ABCDEF>")
    const actionsBlock = blocks[3] as {
      elements: { url: string; text: { text: string } }[]
    }
    expect(actionsBlock.elements[0].url).toBe(
      "https://ifield-lms.vercel.app/admin/coaching"
    )
    expect(actionsBlock.elements[0].text.text).toBe("管理画面で開く")
  })

  it("ヘッダーに『新規コーチング予約』が含まれる", () => {
    const blocks = buildBookingBlocks(baseInput, "<@U01ABCDEF>")
    const headerBlock = blocks[0] as { text: { text: string } }
    expect(headerBlock.text.text).toBe("📅 新規コーチング予約")
  })

  it("メンション文字列が本文 section に埋め込まれる", () => {
    const blocks = buildBookingBlocks(baseInput, "<@U01ABCDEF>")
    const sectionBlock = blocks[1] as { text: { text: string } }
    expect(sectionBlock.text.text).toContain("<@U01ABCDEF>")
    expect(sectionBlock.text.text).toContain("新しいコーチング予約が入りました")
  })
})

describe("buildCancellationBlocks", () => {
  it("メンション付きの場合のブロック構造（snapshot）", () => {
    const blocks = buildCancellationBlocks(baseInput, "<@U01ABCDEF>")
    expect(blocks).toMatchSnapshot()
  })

  it("@here フォールバックの場合のブロック構造（snapshot）", () => {
    const blocks = buildCancellationBlocks(baseInput, HERE_MENTION)
    expect(blocks).toMatchSnapshot()
  })

  it("ヘッダーに『コーチング予約キャンセル』が含まれる", () => {
    const blocks = buildCancellationBlocks(baseInput, HERE_MENTION)
    const headerBlock = blocks[0] as { text: { text: string } }
    expect(headerBlock.text.text).toBe("❌ コーチング予約キャンセル")
  })

  it("fields に『元の日時』が含まれる（予約時の『日時』とは区別される）", () => {
    const blocks = buildCancellationBlocks(baseInput, HERE_MENTION)
    const fieldsBlock = blocks[2] as { fields: { text: string }[] }
    const fieldsText = fieldsBlock.fields.map((f) => f.text).join("\n")
    expect(fieldsText).toContain("元の日時")
  })
})
