/**
 * @vitest-environment jsdom
 */

/**
 * CoachingCard コンポーネントテスト
 *
 * Task 4.2: コーチング情報カード
 * - クレジット残高表示
 * - 次回セッション情報表示
 * - 予約なし時のフォールバック
 * - /coaching へのリンク
 */

import { render, screen } from "@testing-library/react"
import { CoachingCard } from "@/app/(authenticated)/dashboard/_components/coaching-card"
import type { CoachingData } from "@/lib/types/dashboard"

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("CoachingCard", () => {
  describe("セッション予約あり", () => {
    const dataWithSession: CoachingData = {
      creditBalance: 3,
      nextSession: {
        sessionDate: "2026-03-15",
        startTime: "10:00",
        endTime: "11:00",
        genre: "engineering",
      },
    }

    it("クレジット残高が表示される", () => {
      render(<CoachingCard data={dataWithSession} />)

      const bodyText = document.body.textContent ?? ""
      expect(bodyText).toContain("3")
    })

    it("次回セッションの日付が表示される", () => {
      render(<CoachingCard data={dataWithSession} />)

      expect(screen.getByText(/2026-03-15/)).toBeInTheDocument()
    })

    it("次回セッションの時間帯が表示される", () => {
      render(<CoachingCard data={dataWithSession} />)

      expect(screen.getByText(/10:00/)).toBeInTheDocument()
    })

    it("次回セッションのジャンルが表示される", () => {
      render(<CoachingCard data={dataWithSession} />)

      const bodyText = document.body.textContent ?? ""
      expect(bodyText).toContain("engineering")
    })

    it("/coaching へのリンクが存在する", () => {
      render(<CoachingCard data={dataWithSession} />)

      const links = screen.getAllByRole("link")
      const coachingLinks = links.filter(
        (link) => link.getAttribute("href") === "/coaching"
      )
      expect(coachingLinks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("予約なしの場合", () => {
    const dataWithoutSession: CoachingData = {
      creditBalance: 5,
      nextSession: null,
    }

    it("「予約なし」と表示する", () => {
      render(<CoachingCard data={dataWithoutSession} />)

      expect(screen.getByText("予約なし")).toBeInTheDocument()
    })

    it("/coaching への予約リンクが存在する", () => {
      render(<CoachingCard data={dataWithoutSession} />)

      const links = screen.getAllByRole("link")
      const coachingLinks = links.filter(
        (link) => link.getAttribute("href") === "/coaching"
      )
      expect(coachingLinks.length).toBeGreaterThanOrEqual(1)
    })
  })
})
