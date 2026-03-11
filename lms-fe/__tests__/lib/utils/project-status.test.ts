/**
 * 着手状況の導出ユーティリティのテスト
 *
 * Task 2.2: assignment と submission の組み合わせから受講生の着手状況を導出する
 * Requirements: 1.2, 1.3, 1.6, 1.7
 *
 * 6状態: 未着手 / 着手済み / 提出済み / 採点中 / 採点完了 / 差し戻し
 */
import {
  deriveProjectStatus,
  type ProjectStatus,
  type ProjectStatusInput,
} from "@/lib/utils/project-status"

describe("deriveProjectStatus (Task 2.2)", () => {
  describe("未着手状態", () => {
    it("assignment が存在しない場合は '未着手' を返す", () => {
      const input: ProjectStatusInput = {
        assignment: null,
        latestSubmission: null,
      }

      const result = deriveProjectStatus(input)
      expect(result).toBe("未着手")
    })
  })

  describe("着手済み状態", () => {
    it("assignment が存在し submission が存在しない場合は '着手済み' を返す", () => {
      const input: ProjectStatusInput = {
        assignment: { id: "assignment-1", status: "started" },
        latestSubmission: null,
      }

      const result = deriveProjectStatus(input)
      expect(result).toBe("着手済み")
    })
  })

  describe("提出済み状態", () => {
    it("直近 submission の status が 'submitted' の場合は '提出済み' を返す", () => {
      const input: ProjectStatusInput = {
        assignment: { id: "assignment-1", status: "started" },
        latestSubmission: { id: "sub-1", status: "submitted" },
      }

      const result = deriveProjectStatus(input)
      expect(result).toBe("提出済み")
    })
  })

  describe("採点中状態", () => {
    it("直近 submission の status が 'grading' の場合は '採点中' を返す", () => {
      const input: ProjectStatusInput = {
        assignment: { id: "assignment-1", status: "started" },
        latestSubmission: { id: "sub-1", status: "grading" },
      }

      const result = deriveProjectStatus(input)
      expect(result).toBe("採点中")
    })
  })

  describe("採点完了状態", () => {
    it("直近 submission の status が 'graded' の場合は '採点完了' を返す", () => {
      const input: ProjectStatusInput = {
        assignment: { id: "assignment-1", status: "started" },
        latestSubmission: { id: "sub-1", status: "graded" },
      }

      const result = deriveProjectStatus(input)
      expect(result).toBe("採点完了")
    })
  })

  describe("差し戻し状態", () => {
    it("直近 submission の status が 'rejected' の場合は '差し戻し' を返す", () => {
      const input: ProjectStatusInput = {
        assignment: { id: "assignment-1", status: "started" },
        latestSubmission: { id: "sub-1", status: "rejected" },
      }

      const result = deriveProjectStatus(input)
      expect(result).toBe("差し戻し")
    })
  })

  describe("型安全性", () => {
    it("戻り値が ProjectStatus 型の6状態のいずれかである", () => {
      const allStatuses: ProjectStatus[] = [
        "未着手",
        "着手済み",
        "提出済み",
        "採点中",
        "採点完了",
        "差し戻し",
      ]
      expect(allStatuses).toHaveLength(6)
    })
  })
})

describe("isProjectActive ユーティリティ (Task 2.2)", () => {
  it("未着手の場合は false を返す", async () => {
    const { isProjectActive } = await import("@/lib/utils/project-status")
    expect(isProjectActive("未着手")).toBe(false)
  })

  it("着手済みの場合は true を返す", async () => {
    const { isProjectActive } = await import("@/lib/utils/project-status")
    expect(isProjectActive("着手済み")).toBe(true)
  })

  it("提出済みの場合は true を返す", async () => {
    const { isProjectActive } = await import("@/lib/utils/project-status")
    expect(isProjectActive("提出済み")).toBe(true)
  })

  it("採点中の場合は true を返す", async () => {
    const { isProjectActive } = await import("@/lib/utils/project-status")
    expect(isProjectActive("採点中")).toBe(true)
  })

  it("採点完了の場合は false を返す（着手中ではない）", async () => {
    const { isProjectActive } = await import("@/lib/utils/project-status")
    expect(isProjectActive("採点完了")).toBe(false)
  })

  it("差し戻しの場合は true を返す（再提出が必要）", async () => {
    const { isProjectActive } = await import("@/lib/utils/project-status")
    expect(isProjectActive("差し戻し")).toBe(true)
  })
})
