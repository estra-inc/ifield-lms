import { describe, it, expect } from "vitest"
import { calculateScore } from "@/lib/utils/grading"
import type {
  EvaluationCategory,
  EvaluationState,
} from "@/lib/types/grading"

describe("calculateScore", () => {
  const sampleCategories: EvaluationCategory[] = [
    {
      category_large: "Backend",
      category_medium: "Laravel",
      items: [
        { id: "item-1", label: "Migration", point: 5 },
        { id: "item-2", label: "Routing", point: 3 },
      ],
    },
    {
      category_large: "Frontend",
      category_medium: "React",
      items: [
        { id: "item-3", label: "Component Design", point: 4 },
        { id: "item-4", label: "State Management", point: 8 },
      ],
    },
  ]

  it("全項目OKの場合、スコアは100を返す", () => {
    const evaluations: EvaluationState = {
      "item-1": true,
      "item-2": true,
      "item-3": true,
      "item-4": true,
    }

    const result = calculateScore(sampleCategories, evaluations)

    expect(result.totalScore).toBe(100)
    expect(result.totalOkCount).toBe(4)
    expect(result.totalItemCount).toBe(4)
    expect(result.totalEarnedPoints).toBe(20)
    expect(result.totalMaxPoints).toBe(20)
  })

  it("全項目NGの場合、スコアは0を返す", () => {
    const evaluations: EvaluationState = {
      "item-1": false,
      "item-2": false,
      "item-3": false,
      "item-4": false,
    }

    const result = calculateScore(sampleCategories, evaluations)

    expect(result.totalScore).toBe(0)
    expect(result.totalOkCount).toBe(0)
    expect(result.totalItemCount).toBe(4)
    expect(result.totalEarnedPoints).toBe(0)
    expect(result.totalMaxPoints).toBe(20)
  })

  it("全項目未評価の場合、スコアは0を返す", () => {
    const evaluations: EvaluationState = {}

    const result = calculateScore(sampleCategories, evaluations)

    expect(result.totalScore).toBe(0)
    expect(result.totalOkCount).toBe(0)
    expect(result.totalItemCount).toBe(4)
    expect(result.totalEarnedPoints).toBe(0)
    expect(result.totalMaxPoints).toBe(20)
  })

  it("OK/NG混在の場合、ポイント加重スコアを四捨五入して返す", () => {
    // item-1 (5pt) OK, item-2 (3pt) NG, item-3 (4pt) OK, item-4 (8pt) NG
    // earned = 5 + 4 = 9, total = 20
    // score = (9/20) * 100 = 45
    const evaluations: EvaluationState = {
      "item-1": true,
      "item-2": false,
      "item-3": true,
      "item-4": false,
    }

    const result = calculateScore(sampleCategories, evaluations)

    expect(result.totalScore).toBe(45)
    expect(result.totalOkCount).toBe(2)
    expect(result.totalItemCount).toBe(4)
    expect(result.totalEarnedPoints).toBe(9)
    expect(result.totalMaxPoints).toBe(20)
  })

  it("四捨五入が正しく動作する（小数点以下を四捨五入）", () => {
    // 3項目: 各 point=1, 全体合計=3
    // 1項目OKの場合: (1/3) * 100 = 33.333... -> 33
    const categories: EvaluationCategory[] = [
      {
        category_large: "Test",
        category_medium: "Sub",
        items: [
          { id: "a", label: "A", point: 1 },
          { id: "b", label: "B", point: 1 },
          { id: "c", label: "C", point: 1 },
        ],
      },
    ]
    const evaluations: EvaluationState = {
      a: true,
      b: false,
      c: false,
    }

    const result = calculateScore(categories, evaluations)

    expect(result.totalScore).toBe(33)
  })

  it("四捨五入 - 切り上げケース", () => {
    // 3項目: 各 point=1, 全体合計=3
    // 2項目OKの場合: (2/3) * 100 = 66.666... -> 67
    const categories: EvaluationCategory[] = [
      {
        category_large: "Test",
        category_medium: "Sub",
        items: [
          { id: "a", label: "A", point: 1 },
          { id: "b", label: "B", point: 1 },
          { id: "c", label: "C", point: 1 },
        ],
      },
    ]
    const evaluations: EvaluationState = {
      a: true,
      b: true,
      c: false,
    }

    const result = calculateScore(categories, evaluations)

    expect(result.totalScore).toBe(67)
  })

  it("大項目（category_large）ごとの小計を正しく計算する", () => {
    const evaluations: EvaluationState = {
      "item-1": true,  // Backend/Laravel: 5pt OK
      "item-2": false, // Backend/Laravel: 3pt NG
      "item-3": true,  // Frontend/React: 4pt OK
      "item-4": true,  // Frontend/React: 8pt OK
    }

    const result = calculateScore(sampleCategories, evaluations)

    expect(result.categoryScores).toHaveLength(2)

    const backend = result.categoryScores.find(
      (s) => s.categoryLarge === "Backend"
    )
    expect(backend).toBeDefined()
    expect(backend!.okCount).toBe(1)
    expect(backend!.totalCount).toBe(2)
    expect(backend!.earnedPoints).toBe(5)
    expect(backend!.totalPoints).toBe(8)
    expect(backend!.percentage).toBe(63) // (5/8)*100 = 62.5 -> 63

    const frontend = result.categoryScores.find(
      (s) => s.categoryLarge === "Frontend"
    )
    expect(frontend).toBeDefined()
    expect(frontend!.okCount).toBe(2)
    expect(frontend!.totalCount).toBe(2)
    expect(frontend!.earnedPoints).toBe(12)
    expect(frontend!.totalPoints).toBe(12)
    expect(frontend!.percentage).toBe(100)
  })

  it("同一category_largeの複数category_mediumが正しく集約される", () => {
    const categories: EvaluationCategory[] = [
      {
        category_large: "Backend",
        category_medium: "Laravel",
        items: [{ id: "item-1", label: "Migration", point: 5 }],
      },
      {
        category_large: "Backend",
        category_medium: "Database",
        items: [{ id: "item-2", label: "SQL Design", point: 3 }],
      },
      {
        category_large: "Frontend",
        category_medium: "React",
        items: [{ id: "item-3", label: "Component", point: 4 }],
      },
    ]

    const evaluations: EvaluationState = {
      "item-1": true,  // Backend/Laravel: 5pt
      "item-2": false, // Backend/Database: 3pt
      "item-3": true,  // Frontend/React: 4pt
    }

    const result = calculateScore(categories, evaluations)

    // Backend は 2つの category_medium を集約
    const backend = result.categoryScores.find(
      (s) => s.categoryLarge === "Backend"
    )
    expect(backend).toBeDefined()
    expect(backend!.okCount).toBe(1)
    expect(backend!.totalCount).toBe(2)
    expect(backend!.earnedPoints).toBe(5)
    expect(backend!.totalPoints).toBe(8)
    expect(backend!.percentage).toBe(63) // (5/8)*100 = 62.5 -> 63
  })

  it("ポイントが異なる項目が混在する場合の重み付き計算", () => {
    // heavy item (100pt) OK, light item (1pt) NG
    // score = (100/101) * 100 = 99.0099... -> 99
    const categories: EvaluationCategory[] = [
      {
        category_large: "Weighted",
        category_medium: "Mix",
        items: [
          { id: "heavy", label: "Heavy", point: 100 },
          { id: "light", label: "Light", point: 1 },
        ],
      },
    ]

    const evaluations: EvaluationState = {
      heavy: true,
      light: false,
    }

    const result = calculateScore(categories, evaluations)

    expect(result.totalScore).toBe(99)
    expect(result.totalEarnedPoints).toBe(100)
    expect(result.totalMaxPoints).toBe(101)
  })

  it("空のcategories配列の場合、スコア0を返す", () => {
    const result = calculateScore([], {})

    expect(result.totalScore).toBe(0)
    expect(result.totalOkCount).toBe(0)
    expect(result.totalItemCount).toBe(0)
    expect(result.totalEarnedPoints).toBe(0)
    expect(result.totalMaxPoints).toBe(0)
    expect(result.categoryScores).toHaveLength(0)
  })

  it("一部の項目のみ評価済み（残りは未評価=NG扱い）の場合", () => {
    // item-1 (5pt) OK, item-2 (3pt) 未評価, item-3 (4pt) 未評価, item-4 (8pt) OK
    // earned = 5 + 8 = 13, total = 20
    // score = (13/20) * 100 = 65
    const evaluations: EvaluationState = {
      "item-1": true,
      "item-4": true,
    }

    const result = calculateScore(sampleCategories, evaluations)

    expect(result.totalScore).toBe(65)
    expect(result.totalOkCount).toBe(2)
    expect(result.totalItemCount).toBe(4)
    expect(result.totalEarnedPoints).toBe(13)
    expect(result.totalMaxPoints).toBe(20)
  })
})
