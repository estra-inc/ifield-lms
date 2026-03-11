/**
 * ダッシュボードページ統合テスト
 *
 * Task 6.1: 全カードコンポーネントの統合とレイアウト
 * - page.tsx に全カードコンポーネントが import されていること
 * - プレースホルダが実カードコンポーネントに置き換わっていること
 * - レスポンシブグリッドレイアウトが適用されていること
 * - 閲覧専用（form/button[type=submit] がないこと）
 */

import fs from "fs"
import path from "path"

describe("ダッシュボードページ統合 (Task 6.1)", () => {
  const pagePath = path.resolve(
    __dirname,
    "../../../../app/(authenticated)/dashboard/page.tsx"
  )

  let pageContent: string

  beforeAll(() => {
    pageContent = fs.readFileSync(pagePath, "utf-8")
  })

  it("page.tsx ファイルが存在する", () => {
    expect(fs.existsSync(pagePath)).toBe(true)
  })

  // カードコンポーネントの import 確認
  describe("カードコンポーネントの import", () => {
    it("GoalMetricCard がインポートされている", () => {
      expect(pageContent).toContain("GoalMetricCard")
    })

    it("TutorialProgressCard がインポートされている", () => {
      expect(pageContent).toContain("TutorialProgressCard")
    })

    it("DailyReportCard がインポートされている", () => {
      expect(pageContent).toContain("DailyReportCard")
    })

    it("CoachingCard がインポートされている", () => {
      expect(pageContent).toContain("CoachingCard")
    })

    it("ProjectStatusCard がインポートされている", () => {
      expect(pageContent).toContain("ProjectStatusCard")
    })

    it("SkillReportCard がインポートされている", () => {
      expect(pageContent).toContain("SkillReportCard")
    })
  })

  // プレースホルダの除去確認
  describe("プレースホルダの除去", () => {
    it("GoalProgressCard placeholder が除去されている", () => {
      expect(pageContent).not.toContain('data-testid="goal-progress-section"')
    })

    it("TutorialProgressCard placeholder が除去されている", () => {
      expect(pageContent).not.toContain('data-testid="tutorial-progress-section"')
    })

    it("DailyReportCard placeholder が除去されている", () => {
      expect(pageContent).not.toContain('data-testid="daily-report-section"')
    })

    it("CoachingCard placeholder が除去されている", () => {
      expect(pageContent).not.toContain('data-testid="coaching-section"')
    })

    it("ProjectStatusCard placeholder が除去されている", () => {
      expect(pageContent).not.toContain('data-testid="project-status-section"')
    })

    it("SkillReportCard placeholder が除去されている", () => {
      expect(pageContent).not.toContain('data-testid="skill-report-section"')
    })
  })

  // レイアウト確認
  describe("レイアウト", () => {
    it("グリッドレイアウトクラスが適用されている", () => {
      expect(pageContent).toMatch(/grid/)
    })

    it("page.tsx は Server Component のまま（use client がないこと）", () => {
      expect(pageContent).not.toContain('"use client"')
      expect(pageContent).not.toContain("'use client'")
    })
  })

  // 閲覧専用確認
  describe("閲覧専用", () => {
    it("form 要素が存在しない", () => {
      expect(pageContent).not.toMatch(/<form[\s>]/)
    })

    it("submit ボタンが存在しない", () => {
      expect(pageContent).not.toContain('type="submit"')
    })
  })

  // _components ディレクトリの確認
  describe("コンポーネントファイルの存在確認", () => {
    const componentsDir = path.resolve(
      __dirname,
      "../../../../app/(authenticated)/dashboard/_components"
    )

    it("goal-progress-card.tsx が存在する", () => {
      expect(fs.existsSync(path.join(componentsDir, "goal-progress-card.tsx"))).toBe(true)
    })

    it("tutorial-progress-card.tsx が存在する", () => {
      expect(fs.existsSync(path.join(componentsDir, "tutorial-progress-card.tsx"))).toBe(true)
    })

    it("daily-report-card.tsx が存在する", () => {
      expect(fs.existsSync(path.join(componentsDir, "daily-report-card.tsx"))).toBe(true)
    })

    it("coaching-card.tsx が存在する", () => {
      expect(fs.existsSync(path.join(componentsDir, "coaching-card.tsx"))).toBe(true)
    })

    it("project-status-card.tsx が存在する", () => {
      expect(fs.existsSync(path.join(componentsDir, "project-status-card.tsx"))).toBe(true)
    })

    it("skill-report-card.tsx が存在する", () => {
      expect(fs.existsSync(path.join(componentsDir, "skill-report-card.tsx"))).toBe(true)
    })
  })
})
