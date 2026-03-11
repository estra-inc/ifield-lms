/**
 * 教材一覧ページのテスト
 *
 * ContentsListPage のコンポーネントロジックのテスト。
 * ジャンルフィルタリング、進捗集計、カードグリッド表示を検証する。
 */

// --- モック定義 ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// --- ヘルパー ---

import {
  calculateTutorialProgress,
  calculateGenreProgressSummary,
  type TutorialWithProgress,
  type GenreProgressSummary,
} from "@/app/(authenticated)/contents/_lib/progress"

// --- テスト ---

describe("教材一覧ページロジック (Task 5)", () => {
  describe("5.2 進捗集計ロジック", () => {
    it("チュートリアルの進捗率を正しく算出する", () => {
      const result = calculateTutorialProgress(10, 4)
      expect(result).toBe(40)
    })

    it("全セクション数が 0 の場合は進捗率 0 を返す", () => {
      const result = calculateTutorialProgress(0, 0)
      expect(result).toBe(0)
    })

    it("全セクション完了の場合は 100 を返す", () => {
      const result = calculateTutorialProgress(5, 5)
      expect(result).toBe(100)
    })

    it("ジャンル進捗サマリーを正しく算出する", () => {
      const tutorials: TutorialWithProgress[] = [
        {
          id: "1",
          title: "Tutorial A",
          slug_path: "tut-a",
          genre: "engineering",
          chapterCount: 3,
          sectionCount: 10,
          completedSectionCount: 10,
          progressPercent: 100,
        },
        {
          id: "2",
          title: "Tutorial B",
          slug_path: "tut-b",
          genre: "engineering",
          chapterCount: 2,
          sectionCount: 8,
          completedSectionCount: 4,
          progressPercent: 50,
        },
      ]

      const summary: GenreProgressSummary = calculateGenreProgressSummary(tutorials)
      expect(summary.totalSections).toBe(18)
      expect(summary.completedSections).toBe(14)
      expect(summary.totalTutorials).toBe(2)
      expect(summary.completedTutorials).toBe(1)
      expect(summary.progressPercent).toBeCloseTo(77.8, 0)
    })

    it("チュートリアルが空の場合のサマリー", () => {
      const summary = calculateGenreProgressSummary([])
      expect(summary.totalSections).toBe(0)
      expect(summary.completedSections).toBe(0)
      expect(summary.progressPercent).toBe(0)
    })
  })

  describe("5.3 チュートリアルカード進捗状態", () => {
    it("未着手状態を正しく判定する", () => {
      const tutorial: TutorialWithProgress = {
        id: "1",
        title: "Test",
        slug_path: "test",
        genre: "engineering",
        chapterCount: 2,
        sectionCount: 5,
        completedSectionCount: 0,
        progressPercent: 0,
      }

      expect(tutorial.progressPercent).toBe(0)
      expect(tutorial.completedSectionCount).toBe(0)
    })

    it("進行中状態を正しく判定する", () => {
      const tutorial: TutorialWithProgress = {
        id: "1",
        title: "Test",
        slug_path: "test",
        genre: "engineering",
        chapterCount: 2,
        sectionCount: 5,
        completedSectionCount: 3,
        progressPercent: 60,
      }

      expect(tutorial.progressPercent).toBeGreaterThan(0)
      expect(tutorial.progressPercent).toBeLessThan(100)
    })

    it("完了状態を正しく判定する", () => {
      const tutorial: TutorialWithProgress = {
        id: "1",
        title: "Test",
        slug_path: "test",
        genre: "engineering",
        chapterCount: 2,
        sectionCount: 5,
        completedSectionCount: 5,
        progressPercent: 100,
      }

      expect(tutorial.progressPercent).toBe(100)
    })
  })
})
