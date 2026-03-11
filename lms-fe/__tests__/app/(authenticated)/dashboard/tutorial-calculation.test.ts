/**
 * 教材完了率の計算ロジック ユニットテスト
 *
 * Task 7.2: TutorialProgress 計算ロジック
 * - 完了セクション / 全セクションの算出（正常値、全完了、0セクション）
 * Requirements: 3.1, 3.2
 */

describe("教材完了率の計算ロジック (Task 7.2)", () => {
  /**
   * page.tsx 内の算出ロジック:
   * percentage = total > 0 ? Math.round((completed / total) * 100) : 0
   */
  function calculateTutorialPercentage(completed: number, total: number): number {
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  describe("正常値", () => {
    it("12 / 15 = 80%", () => {
      expect(calculateTutorialPercentage(12, 15)).toBe(80)
    })

    it("5 / 10 = 50%", () => {
      expect(calculateTutorialPercentage(5, 10)).toBe(50)
    })

    it("1 / 3 = 33% (四捨五入)", () => {
      expect(calculateTutorialPercentage(1, 3)).toBe(33)
    })

    it("2 / 3 = 67% (四捨五入)", () => {
      expect(calculateTutorialPercentage(2, 3)).toBe(67)
    })

    it("0 / 10 = 0%", () => {
      expect(calculateTutorialPercentage(0, 10)).toBe(0)
    })
  })

  describe("全完了", () => {
    it("5 / 5 = 100%", () => {
      expect(calculateTutorialPercentage(5, 5)).toBe(100)
    })

    it("1 / 1 = 100%", () => {
      expect(calculateTutorialPercentage(1, 1)).toBe(100)
    })

    it("100 / 100 = 100%", () => {
      expect(calculateTutorialPercentage(100, 100)).toBe(100)
    })
  })

  describe("0セクション（空チュートリアル）", () => {
    it("0 / 0 = 0% (0除算防止)", () => {
      expect(calculateTutorialPercentage(0, 0)).toBe(0)
    })
  })

  describe("completedIds Set を使った集計ロジック", () => {
    it("複数チュートリアルの完了率を正しく集計する", () => {
      const sections = [
        { id: "s1", tutorial: "tut-1" },
        { id: "s2", tutorial: "tut-1" },
        { id: "s3", tutorial: "tut-1" },
        { id: "s4", tutorial: "tut-2" },
        { id: "s5", tutorial: "tut-2" },
      ]
      const completedIds = new Set(["s1", "s3", "s5"])

      const tutorials = ["tut-1", "tut-2"]
      const results = tutorials.map((tut) => {
        const tutSections = sections.filter((s) => s.tutorial === tut)
        const completed = tutSections.filter((s) => completedIds.has(s.id)).length
        return {
          tutorial: tut,
          completed,
          total: tutSections.length,
          percentage: calculateTutorialPercentage(completed, tutSections.length),
        }
      })

      expect(results[0]).toEqual({
        tutorial: "tut-1",
        completed: 2,
        total: 3,
        percentage: 67,
      })

      expect(results[1]).toEqual({
        tutorial: "tut-2",
        completed: 1,
        total: 2,
        percentage: 50,
      })
    })

    it("完了セクションがない場合は全て 0%", () => {
      const sections = [
        { id: "s1", tutorial: "tut-1" },
        { id: "s2", tutorial: "tut-1" },
      ]
      const completedIds = new Set<string>()

      const tutSections = sections.filter((s) => s.tutorial === "tut-1")
      const completed = tutSections.filter((s) => completedIds.has(s.id)).length

      expect(completed).toBe(0)
      expect(calculateTutorialPercentage(completed, tutSections.length)).toBe(0)
    })

    it("全セクション完了の場合は 100%", () => {
      const sections = [
        { id: "s1", tutorial: "tut-1" },
        { id: "s2", tutorial: "tut-1" },
      ]
      const completedIds = new Set(["s1", "s2"])

      const tutSections = sections.filter((s) => s.tutorial === "tut-1")
      const completed = tutSections.filter((s) => completedIds.has(s.id)).length

      expect(completed).toBe(2)
      expect(calculateTutorialPercentage(completed, tutSections.length)).toBe(100)
    })
  })
})
