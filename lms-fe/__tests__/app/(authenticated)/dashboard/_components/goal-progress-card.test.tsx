/**
 * @vitest-environment jsdom
 */

/**
 * GoalProgressCard コンポーネントテスト
 *
 * Task 3.1: 目標達成率カード
 * - 月次・週次の達成率をプログレスバーとパーセンテージで表示
 * - 達成率100%超でもテキストは実値表示、バーは100%キャップ
 * - 目標未設定時は「目標未設定」+設定リンク表示
 */

import { render, screen } from "@testing-library/react"
import { GoalProgressCard } from "@/app/(authenticated)/dashboard/_components/goal-progress-card"
import type { GoalProgressData } from "@/lib/types/dashboard"

// next/link のモック
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("GoalProgressCard", () => {
  describe("正常データ表示", () => {
    it("月次達成率をパーセンテージテキストで表示する", () => {
      const data: GoalProgressData = {
        monthly: { actual: 68, target: 100, percentage: 68 },
        weekly: { actual: 11, target: 25, percentage: 44 },
      }

      render(<GoalProgressCard data={data} />)

      expect(screen.getByText(/68%/)).toBeInTheDocument()
    })

    it("週次達成率をパーセンテージテキストで表示する", () => {
      const data: GoalProgressData = {
        monthly: { actual: 68, target: 100, percentage: 68 },
        weekly: { actual: 11, target: 25, percentage: 44 },
      }

      render(<GoalProgressCard data={data} />)

      expect(screen.getByText(/44%/)).toBeInTheDocument()
    })

    it("月次のプログレスバーが表示される", () => {
      const data: GoalProgressData = {
        monthly: { actual: 68, target: 100, percentage: 68 },
        weekly: { actual: 11, target: 25, percentage: 44 },
      }

      render(<GoalProgressCard data={data} />)

      const progressBars = screen.getAllByRole("progressbar")
      expect(progressBars.length).toBeGreaterThanOrEqual(2)
    })

    it("月次目標のラベル「月次目標」が表示される", () => {
      const data: GoalProgressData = {
        monthly: { actual: 68, target: 100, percentage: 68 },
        weekly: { actual: 11, target: 25, percentage: 44 },
      }

      render(<GoalProgressCard data={data} />)

      expect(screen.getByText("月次目標")).toBeInTheDocument()
    })

    it("週次目標のラベル「週次目標」が表示される", () => {
      const data: GoalProgressData = {
        monthly: { actual: 68, target: 100, percentage: 68 },
        weekly: { actual: 11, target: 25, percentage: 44 },
      }

      render(<GoalProgressCard data={data} />)

      expect(screen.getByText("週次目標")).toBeInTheDocument()
    })
  })

  describe("達成率100%超", () => {
    it("テキストは実値(120%)を表示する", () => {
      const data: GoalProgressData = {
        monthly: { actual: 120, target: 100, percentage: 120 },
        weekly: { actual: 11, target: 25, percentage: 44 },
      }

      render(<GoalProgressCard data={data} />)

      expect(screen.getByText(/120%/)).toBeInTheDocument()
    })

    it("プログレスバーの value は100でキャップされる", () => {
      const data: GoalProgressData = {
        monthly: { actual: 120, target: 100, percentage: 120 },
        weekly: { actual: 11, target: 25, percentage: 44 },
      }

      render(<GoalProgressCard data={data} />)

      const progressBars = screen.getAllByRole("progressbar")
      // 月次バーの aria-valuenow は 100 以下であること
      const monthlyBar = progressBars[0]
      const valueNow = Number(monthlyBar.getAttribute("aria-valuenow"))
      expect(valueNow).toBeLessThanOrEqual(100)
    })
  })

  describe("目標未設定", () => {
    it("月次目標が未設定の場合「目標未設定」と表示する", () => {
      const data: GoalProgressData = {
        monthly: { actual: 0, target: null, percentage: null },
        weekly: { actual: 11, target: 25, percentage: 44 },
      }

      render(<GoalProgressCard data={data} />)

      expect(screen.getByText("目標未設定")).toBeInTheDocument()
    })

    it("週次目標が未設定の場合「目標未設定」と表示する", () => {
      const data: GoalProgressData = {
        monthly: { actual: 68, target: 100, percentage: 68 },
        weekly: { actual: 0, target: null, percentage: null },
      }

      render(<GoalProgressCard data={data} />)

      expect(screen.getByText("目標未設定")).toBeInTheDocument()
    })

    it("目標未設定時に /daily-reports への設定リンクが表示される", () => {
      const data: GoalProgressData = {
        monthly: { actual: 0, target: null, percentage: null },
        weekly: { actual: 0, target: null, percentage: null },
      }

      render(<GoalProgressCard data={data} />)

      const links = screen.getAllByRole("link")
      const dailyReportLinks = links.filter(
        (link) => link.getAttribute("href") === "/daily-reports"
      )
      expect(dailyReportLinks.length).toBeGreaterThanOrEqual(1)
    })

    it("両方とも未設定の場合「目標未設定」が2つ表示される", () => {
      const data: GoalProgressData = {
        monthly: { actual: 0, target: null, percentage: null },
        weekly: { actual: 0, target: null, percentage: null },
      }

      render(<GoalProgressCard data={data} />)

      const notSetTexts = screen.getAllByText("目標未設定")
      expect(notSetTexts).toHaveLength(2)
    })
  })
})
