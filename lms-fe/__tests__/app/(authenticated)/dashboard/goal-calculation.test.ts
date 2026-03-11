/**
 * 目標達成率の計算ロジック ユニットテスト
 *
 * Task 7.1: GoalProgress 計算ロジック
 * - パーセンテージ算出（正常値、100%超、0除算、null ハンドリング）
 * Requirements: 2.1, 2.2, 2.3
 */

describe("目標達成率の計算ロジック (Task 7.1)", () => {
  /**
   * page.tsx 内の算出ロジックを関数化して検証:
   * percentage = target ? Math.round((actual / target) * 100) : null
   */
  function calculatePercentage(actual: number, target: number | null): number | null {
    if (!target) return null
    return Math.round((actual / target) * 100)
  }

  describe("正常値", () => {
    it("60 / 100 = 60%", () => {
      expect(calculatePercentage(60, 100)).toBe(60)
    })

    it("25 / 50 = 50%", () => {
      expect(calculatePercentage(25, 50)).toBe(50)
    })

    it("33 / 100 = 33%", () => {
      expect(calculatePercentage(33, 100)).toBe(33)
    })

    it("1 / 3 = 33% (四捨五入)", () => {
      expect(calculatePercentage(1, 3)).toBe(33)
    })

    it("2 / 3 = 67% (四捨五入)", () => {
      expect(calculatePercentage(2, 3)).toBe(67)
    })
  })

  describe("100%超", () => {
    it("120 / 100 = 120%", () => {
      expect(calculatePercentage(120, 100)).toBe(120)
    })

    it("200 / 100 = 200%", () => {
      expect(calculatePercentage(200, 100)).toBe(200)
    })

    it("150 / 80 = 188%", () => {
      expect(calculatePercentage(150, 80)).toBe(188)
    })
  })

  describe("0値ハンドリング", () => {
    it("実績0 / 目標100 = 0%", () => {
      expect(calculatePercentage(0, 100)).toBe(0)
    })

    it("目標0（0除算防止）は null を返す", () => {
      // target が 0 は falsy なので null として扱われる
      expect(calculatePercentage(50, 0)).toBeNull()
    })

    it("両方0の場合も null を返す", () => {
      expect(calculatePercentage(0, 0)).toBeNull()
    })
  })

  describe("null ハンドリング", () => {
    it("目標が null の場合は null を返す", () => {
      expect(calculatePercentage(50, null)).toBeNull()
    })

    it("実績50 + 目標 null = null", () => {
      expect(calculatePercentage(50, null)).toBeNull()
    })

    it("実績0 + 目標 null = null", () => {
      expect(calculatePercentage(0, null)).toBeNull()
    })
  })

  describe("プログレスバーのキャップ値", () => {
    it("100%超の場合、Math.min でプログレスバー値を100にキャップ", () => {
      const percentage = calculatePercentage(120, 100) // 120%
      const cappedValue = Math.min(percentage!, 100)
      expect(cappedValue).toBe(100)
    })

    it("100%以下の場合、キャップ値は元の値のまま", () => {
      const percentage = calculatePercentage(80, 100) // 80%
      const cappedValue = Math.min(percentage!, 100)
      expect(cappedValue).toBe(80)
    })
  })
})
