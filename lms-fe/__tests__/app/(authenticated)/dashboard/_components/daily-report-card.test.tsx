/**
 * @vitest-environment jsdom
 */

/**
 * DailyReportCard コンポーネントテスト
 *
 * Task 4.1: 今日の日報カード
 * - 入力済み: 学習時間合計と内容サマリー表示
 * - 未入力: CTA「今日の日報を入力しましょう」表示
 * - /daily-reports へのリンク
 */

import { render, screen } from "@testing-library/react"
import { DailyReportCard } from "@/app/(authenticated)/dashboard/_components/daily-report-card"
import type { DailyReportStatus } from "@/lib/types/dashboard"

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("DailyReportCard", () => {
  describe("入力済みの場合", () => {
    const enteredStatus: DailyReportStatus = {
      type: "entered",
      totalHours: 5,
      entries: [
        { actualHours: 3, content: "React学習" },
        { actualHours: 2, content: "TypeScript学習" },
      ],
    }

    it("学習時間合計が表示される", () => {
      render(<DailyReportCard status={enteredStatus} />)

      expect(screen.getByText(/5/)).toBeInTheDocument()
    })

    it("各エントリの内容が表示される", () => {
      render(<DailyReportCard status={enteredStatus} />)

      expect(screen.getByText(/React学習/)).toBeInTheDocument()
      expect(screen.getByText(/TypeScript学習/)).toBeInTheDocument()
    })

    it("/daily-reports へのリンクが存在する", () => {
      render(<DailyReportCard status={enteredStatus} />)

      const links = screen.getAllByRole("link")
      const dailyReportLinks = links.filter(
        (link) => link.getAttribute("href") === "/daily-reports"
      )
      expect(dailyReportLinks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("未入力の場合", () => {
    const notEnteredStatus: DailyReportStatus = {
      type: "not_entered",
    }

    it("CTAテキスト「今日の日報を入力しましょう」が表示される", () => {
      render(<DailyReportCard status={notEnteredStatus} />)

      expect(screen.getByText("今日の日報を入力しましょう")).toBeInTheDocument()
    })

    it("/daily-reports への CTA リンクが存在する", () => {
      render(<DailyReportCard status={notEnteredStatus} />)

      const links = screen.getAllByRole("link")
      const dailyReportLinks = links.filter(
        (link) => link.getAttribute("href") === "/daily-reports"
      )
      expect(dailyReportLinks.length).toBeGreaterThanOrEqual(1)
    })
  })
})
