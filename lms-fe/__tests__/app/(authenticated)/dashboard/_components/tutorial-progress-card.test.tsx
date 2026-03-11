/**
 * @vitest-environment jsdom
 */

/**
 * TutorialProgressCard コンポーネントテスト
 *
 * Task 3.2: 教材完了率カード
 * - チュートリアル一覧と各チュートリアルの完了率をプログレスバーで表示
 * - セクション数テキスト（例: "12 / 15 セクション (80%)"）
 * - チュートリアル名クリックで /contents/{tutorialSlug} に遷移
 * - 教材なし・ジャンル未設定のフォールバック
 */

import { render, screen } from "@testing-library/react"
import { TutorialProgressCard } from "@/app/(authenticated)/dashboard/_components/tutorial-progress-card"
import type { TutorialProgressItem } from "@/lib/types/dashboard"

// next/link のモック
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const sampleItems: TutorialProgressItem[] = [
  {
    tutorialSlug: "html-basics",
    tutorialTitle: "HTML基礎",
    genre: "engineering",
    completedSections: 12,
    totalSections: 15,
    percentage: 80,
  },
  {
    tutorialSlug: "css-advanced",
    tutorialTitle: "CSS応用",
    genre: "engineering",
    completedSections: 5,
    totalSections: 10,
    percentage: 50,
  },
]

describe("TutorialProgressCard", () => {
  describe("正常データ表示", () => {
    it("各チュートリアルのタイトルが表示される", () => {
      render(<TutorialProgressCard items={sampleItems} defaultGenre="engineering" />)

      expect(screen.getByText("HTML基礎")).toBeInTheDocument()
      expect(screen.getByText("CSS応用")).toBeInTheDocument()
    })

    it("各チュートリアルの完了率パーセンテージが表示される", () => {
      render(<TutorialProgressCard items={sampleItems} defaultGenre="engineering" />)

      const allText = document.body.textContent ?? ""
      expect(allText).toContain("80%")
      expect(allText).toContain("50%")
    })

    it("セクション数テキスト（例: '12 / 15'）が表示される", () => {
      render(<TutorialProgressCard items={sampleItems} defaultGenre="engineering" />)

      expect(screen.getByText(/12 \/ 15/)).toBeInTheDocument()
      expect(screen.getByText(/5 \/ 10/)).toBeInTheDocument()
    })

    it("各チュートリアルにプログレスバーが表示される", () => {
      render(<TutorialProgressCard items={sampleItems} defaultGenre="engineering" />)

      const progressBars = screen.getAllByRole("progressbar")
      expect(progressBars).toHaveLength(2)
    })

    it("チュートリアル名が /contents/{tutorialSlug} へのリンクになっている", () => {
      render(<TutorialProgressCard items={sampleItems} defaultGenre="engineering" />)

      const htmlLink = screen.getByRole("link", { name: "HTML基礎" })
      expect(htmlLink).toHaveAttribute("href", "/contents/html-basics")

      const cssLink = screen.getByRole("link", { name: "CSS応用" })
      expect(cssLink).toHaveAttribute("href", "/contents/css-advanced")
    })
  })

  describe("フォールバック表示", () => {
    it("教材が存在しない場合「教材なし」と表示する", () => {
      render(<TutorialProgressCard items={[]} defaultGenre="engineering" />)

      expect(screen.getByText("教材なし")).toBeInTheDocument()
    })

    it("defaultGenre が null の場合「ジャンルが設定されていません」と表示する", () => {
      render(<TutorialProgressCard items={[]} defaultGenre={null} />)

      expect(screen.getByText("ジャンルが設定されていません")).toBeInTheDocument()
    })
  })
})
