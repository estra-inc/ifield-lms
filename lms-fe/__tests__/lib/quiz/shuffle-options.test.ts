/**
 * shuffleOptions シャッフル関数のテスト
 *
 * Task 3.2: 選択肢のランダムシャッフル関数
 * Requirements: 3.7, 4.8
 *
 * - Fisher-Yates アルゴリズムによるランダムシャッフル
 * - 元の配列を変更しない（イミュータブル）
 * - シャッフル後に全要素が含まれる
 */
import type { OptionItem } from "@/lib/types/quiz"

describe("shuffleOptions", () => {
  let shuffleOptions: <T>(options: readonly T[]) => T[]

  beforeEach(async () => {
    const mod = await import("@/lib/quiz/shuffle-options")
    shuffleOptions = mod.shuffleOptions
  })

  it("シャッフル後の配列は元の配列と同じ要素を持つ", () => {
    const options: OptionItem[] = [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
      { id: "d", text: "D" },
    ]

    const shuffled = shuffleOptions(options)

    expect(shuffled).toHaveLength(options.length)
    for (const option of options) {
      expect(shuffled).toContainEqual(option)
    }
  })

  it("元の配列を変更しない（イミュータブル）", () => {
    const options: OptionItem[] = [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
    ]
    const original = [...options]

    shuffleOptions(options)

    expect(options).toEqual(original)
  })

  it("新しい配列インスタンスを返す", () => {
    const options: OptionItem[] = [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ]

    const shuffled = shuffleOptions(options)

    expect(shuffled).not.toBe(options)
  })

  it("空配列の場合は空配列を返す", () => {
    const result = shuffleOptions([])
    expect(result).toEqual([])
  })

  it("1要素の場合はそのまま返す", () => {
    const options = [{ id: "a", text: "A" }]
    const result = shuffleOptions(options)
    expect(result).toEqual([{ id: "a", text: "A" }])
  })

  it("プリミティブ型の配列でも動作する", () => {
    const numbers = [1, 2, 3, 4, 5]
    const shuffled = shuffleOptions(numbers)

    expect(shuffled).toHaveLength(5)
    expect(shuffled.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it("複数回呼び出しても元の配列に影響がない", () => {
    const options: OptionItem[] = [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
      { id: "d", text: "D" },
    ]
    const original = JSON.stringify(options)

    for (let i = 0; i < 10; i++) {
      shuffleOptions(options)
    }

    expect(JSON.stringify(options)).toBe(original)
  })

  it("十分な回数シャッフルすると異なる順序が生成される（統計的検証）", () => {
    const options = ["a", "b", "c", "d", "e"]
    const results = new Set<string>()

    for (let i = 0; i < 100; i++) {
      const shuffled = shuffleOptions(options)
      results.add(shuffled.join(","))
    }

    // 100回シャッフルで2種類以上の順序が出現するはず
    expect(results.size).toBeGreaterThan(1)
  })
})
