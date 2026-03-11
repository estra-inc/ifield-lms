/**
 * ダッシュボード エッジケース・エラーバウンダリ テスト
 *
 * Task 6.2: エラーバウンダリとエッジケースの検証
 * - error.tsx の存在確認
 * - 各カードコンポーネントの空データ状態フォールバック
 * - コンポーネントファイル内のフォールバック表示テキスト確認
 */

import fs from "fs"
import path from "path"

describe("ダッシュボード エッジケースとエラーバウンダリ (Task 6.2)", () => {
  const basePath = path.resolve(
    __dirname,
    "../../../../app/(authenticated)/dashboard"
  )
  const componentsPath = path.join(basePath, "_components")

  // error.tsx の存在確認
  describe("error.tsx エラーバウンダリ", () => {
    it("error.tsx ファイルが存在する", () => {
      expect(fs.existsSync(path.join(basePath, "error.tsx"))).toBe(true)
    })

    it("error.tsx は 'use client' を宣言している（Client Component 必須）", () => {
      const content = fs.readFileSync(path.join(basePath, "error.tsx"), "utf-8")
      expect(content).toMatch(/"use client"|'use client'/)
    })

    it("error.tsx はリトライボタンまたはエラーメッセージを含む", () => {
      const content = fs.readFileSync(path.join(basePath, "error.tsx"), "utf-8")
      // reset 関数またはエラーメッセージが含まれていること
      expect(content).toMatch(/reset|エラー|error/i)
    })
  })

  // GoalProgressCard のフォールバック
  describe("GoalProgressCard フォールバック表示", () => {
    it("目標未設定テキストが含まれている", () => {
      const content = fs.readFileSync(
        path.join(componentsPath, "goal-progress-card.tsx"),
        "utf-8"
      )
      expect(content).toContain("目標未設定")
    })

    it("/goals への設定リンクが含まれている", () => {
      const content = fs.readFileSync(
        path.join(componentsPath, "goal-progress-card.tsx"),
        "utf-8"
      )
      expect(content).toContain("/goals")
    })
  })

  // TutorialProgressCard のフォールバック
  describe("TutorialProgressCard フォールバック表示", () => {
    it("教材なしテキストが含まれている", () => {
      const content = fs.readFileSync(
        path.join(componentsPath, "tutorial-progress-card.tsx"),
        "utf-8"
      )
      expect(content).toContain("教材なし")
    })

    it("ジャンル未設定テキストが含まれている", () => {
      const content = fs.readFileSync(
        path.join(componentsPath, "tutorial-progress-card.tsx"),
        "utf-8"
      )
      expect(content).toContain("ジャンルが設定されていません")
    })
  })

  // DailyReportCard のフォールバック
  describe("DailyReportCard フォールバック表示", () => {
    it("未入力時の CTA テキストが含まれている", () => {
      const content = fs.readFileSync(
        path.join(componentsPath, "daily-report-card.tsx"),
        "utf-8"
      )
      expect(content).toContain("今日の日報を入力しましょう")
    })

    it("/daily-reports へのリンクが含まれている", () => {
      const content = fs.readFileSync(
        path.join(componentsPath, "daily-report-card.tsx"),
        "utf-8"
      )
      expect(content).toContain("/daily-reports")
    })
  })

  // CoachingCard のフォールバック
  describe("CoachingCard フォールバック表示", () => {
    it("予約なしテキストが含まれている", () => {
      const content = fs.readFileSync(
        path.join(componentsPath, "coaching-card.tsx"),
        "utf-8"
      )
      expect(content).toContain("予約なし")
    })

    it("/coaching へのリンクが含まれている", () => {
      const content = fs.readFileSync(
        path.join(componentsPath, "coaching-card.tsx"),
        "utf-8"
      )
      expect(content).toContain("/coaching")
    })
  })

  // ProjectStatusCard のフォールバック
  describe("ProjectStatusCard フォールバック表示", () => {
    it("進行中の案件なしテキストが含まれている", () => {
      const content = fs.readFileSync(
        path.join(componentsPath, "project-status-card.tsx"),
        "utf-8"
      )
      expect(content).toContain("進行中の案件なし")
    })

    it("/projects へのリンクが含まれている", () => {
      const content = fs.readFileSync(
        path.join(componentsPath, "project-status-card.tsx"),
        "utf-8"
      )
      expect(content).toContain("/projects")
    })
  })

  // SkillReportCard のフォールバック
  describe("SkillReportCard フォールバック表示", () => {
    it("採点データなしテキストが含まれている", () => {
      const content = fs.readFileSync(
        path.join(componentsPath, "skill-report-card.tsx"),
        "utf-8"
      )
      expect(content).toContain("採点済みの案件がありません")
    })
  })
})
