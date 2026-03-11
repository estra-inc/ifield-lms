/**
 * @vitest-environment jsdom
 */

/**
 * SkillReportCard コンポーネントテスト
 *
 * Task 5: スキルレポートカード
 * - Client Component with @nivo/radar
 * - カテゴリ別達成率をレーダーチャートで表示
 * - チャート下部にテキストで併記
 * - 採点データなし時のフォールバック
 */

import { render, screen } from "@testing-library/react"
import { SkillReportCard } from "@/app/(authenticated)/dashboard/_components/skill-report-card"
import type { SkillReportData } from "@/lib/types/dashboard"

// @nivo/radar はキャンバスベースのため、モックする
vi.mock("@nivo/radar", () => ({
  ResponsiveRadar: ({ data }: { data: unknown[] }) => (
    <div data-testid="radar-chart" data-items={data.length}>
      Radar Chart Mock
    </div>
  ),
}))

describe("SkillReportCard", () => {
  describe("採点データあり", () => {
    const dataWithSkills: SkillReportData = {
      categories: [
        { categoryLarge: "フロントエンド", okCount: 8, totalCount: 10, percentage: 80 },
        { categoryLarge: "バックエンド", okCount: 6, totalCount: 10, percentage: 60 },
        { categoryLarge: "インフラ", okCount: 3, totalCount: 5, percentage: 60 },
      ],
      hasData: true,
    }

    it("レーダーチャートが描画される", () => {
      render(<SkillReportCard data={dataWithSkills} />)

      expect(screen.getByTestId("radar-chart")).toBeInTheDocument()
    })

    it("カテゴリ名がテキストで表示される", () => {
      render(<SkillReportCard data={dataWithSkills} />)

      expect(screen.getByText("フロントエンド")).toBeInTheDocument()
      expect(screen.getByText("バックエンド")).toBeInTheDocument()
      expect(screen.getByText("インフラ")).toBeInTheDocument()
    })

    it("各カテゴリの達成率パーセンテージが表示される", () => {
      render(<SkillReportCard data={dataWithSkills} />)

      const bodyText = document.body.textContent ?? ""
      expect(bodyText).toContain("80%")
      expect(bodyText).toContain("60%")
    })
  })

  describe("採点データなし", () => {
    const emptyData: SkillReportData = {
      categories: [],
      hasData: false,
    }

    it("「採点済みの案件がありません」と表示する", () => {
      render(<SkillReportCard data={emptyData} />)

      expect(screen.getByText("採点済みの案件がありません")).toBeInTheDocument()
    })

    it("レーダーチャートが描画されない", () => {
      render(<SkillReportCard data={emptyData} />)

      expect(screen.queryByTestId("radar-chart")).not.toBeInTheDocument()
    })
  })
})
