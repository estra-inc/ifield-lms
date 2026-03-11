/**
 * @vitest-environment jsdom
 */

/**
 * ProjectStatusCard コンポーネントテスト
 *
 * Task 4.3: 模擬案件ステータスカード
 * - 進行中の案件一覧表示
 * - 直近完了案件表示（最新3件）
 * - ステータスBadge表示
 * - /projects/{slug} へのリンク
 * - 案件なし時のフォールバック
 */

import { render, screen } from "@testing-library/react"
import { ProjectStatusCard } from "@/app/(authenticated)/dashboard/_components/project-status-card"
import type { ProjectsData } from "@/lib/types/dashboard"

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe("ProjectStatusCard", () => {
  describe("進行中案件あり", () => {
    const data: ProjectsData = {
      activeProjects: [
        { projectSlug: "web-portfolio", projectTitle: "Webポートフォリオ", status: "着手済み", latestScore: null },
        { projectSlug: "api-design", projectTitle: "API設計", status: "提出済み", latestScore: null },
      ],
      recentCompleted: [
        { projectSlug: "html-layout", projectTitle: "HTMLレイアウト", status: "採点完了", latestScore: 85 },
      ],
    }

    it("進行中案件のタイトルが表示される", () => {
      render(<ProjectStatusCard data={data} />)

      expect(screen.getByText("Webポートフォリオ")).toBeInTheDocument()
      expect(screen.getByText("API設計")).toBeInTheDocument()
    })

    it("進行中案件のステータスBadgeが表示される", () => {
      render(<ProjectStatusCard data={data} />)

      expect(screen.getByText("着手済み")).toBeInTheDocument()
      expect(screen.getByText("提出済み")).toBeInTheDocument()
    })

    it("案件名が /projects/{slug} へのリンクになっている", () => {
      render(<ProjectStatusCard data={data} />)

      const portfolioLink = screen.getByRole("link", { name: "Webポートフォリオ" })
      expect(portfolioLink).toHaveAttribute("href", "/projects/web-portfolio")

      const apiLink = screen.getByRole("link", { name: "API設計" })
      expect(apiLink).toHaveAttribute("href", "/projects/api-design")
    })

    it("完了済み案件のタイトルが表示される", () => {
      render(<ProjectStatusCard data={data} />)

      expect(screen.getByText("HTMLレイアウト")).toBeInTheDocument()
    })

    it("完了済み案件のステータスBadgeが表示される", () => {
      render(<ProjectStatusCard data={data} />)

      expect(screen.getByText("採点完了")).toBeInTheDocument()
    })
  })

  describe("進行中案件なし", () => {
    const data: ProjectsData = {
      activeProjects: [],
      recentCompleted: [],
    }

    it("「進行中の案件なし」と表示する", () => {
      render(<ProjectStatusCard data={data} />)

      expect(screen.getByText("進行中の案件なし")).toBeInTheDocument()
    })

    it("/projects へのリンクが存在する", () => {
      render(<ProjectStatusCard data={data} />)

      const links = screen.getAllByRole("link")
      const projectLinks = links.filter(
        (link) => link.getAttribute("href") === "/projects"
      )
      expect(projectLinks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe("差し戻しステータス", () => {
    it("差し戻しステータスのBadgeが表示される", () => {
      const data: ProjectsData = {
        activeProjects: [
          { projectSlug: "react-app", projectTitle: "Reactアプリ", status: "差し戻し", latestScore: null },
        ],
        recentCompleted: [],
      }

      render(<ProjectStatusCard data={data} />)

      expect(screen.getByText("差し戻し")).toBeInTheDocument()
    })
  })
})
