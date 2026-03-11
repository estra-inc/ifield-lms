/**
 * @vitest-environment jsdom
 */

/**
 * 各カードコンポーネントのレンダリングテスト
 *
 * Task 7.4: 正常データ・空データ・エラー状態のパターン検証
 * - リンク先の正確性検証
 * Requirements: 4.2, 4.3, 4.4, 5.2, 5.3, 5.4, 6.3, 6.4, 6.5
 */

import { render, screen } from "@testing-library/react"
import { GoalProgressCard } from "@/app/(authenticated)/dashboard/_components/goal-progress-card"
import { TutorialProgressCard } from "@/app/(authenticated)/dashboard/_components/tutorial-progress-card"
import { DailyReportCard } from "@/app/(authenticated)/dashboard/_components/daily-report-card"
import { CoachingCard } from "@/app/(authenticated)/dashboard/_components/coaching-card"
import { ProjectStatusCard } from "@/app/(authenticated)/dashboard/_components/project-status-card"
import { SkillReportCard } from "@/app/(authenticated)/dashboard/_components/skill-report-card"
import type {
  GoalProgressData,
  TutorialProgressItem,
  DailyReportStatus,
  CoachingData,
  ProjectsData,
  SkillReportData,
} from "@/lib/types/dashboard"

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@nivo/radar", () => ({
  ResponsiveRadar: ({ data }: { data: unknown[] }) => (
    <div data-testid="radar-chart" data-items={data.length}>
      Radar Chart Mock
    </div>
  ),
}))

describe("カードコンポーネント レンダリングテスト (Task 7.4)", () => {
  // ─── GoalProgressCard ───
  describe("GoalProgressCard", () => {
    it("正常データでエラーなくレンダリングされる", () => {
      const data: GoalProgressData = {
        monthly: { actual: 68, target: 100, percentage: 68 },
        weekly: { actual: 11, target: 25, percentage: 44 },
      }
      const { container } = render(<GoalProgressCard data={data} />)
      expect(container.firstChild).toBeTruthy()
    })

    it("空データ（両方 null）でエラーなくレンダリングされる", () => {
      const data: GoalProgressData = {
        monthly: { actual: 0, target: null, percentage: null },
        weekly: { actual: 0, target: null, percentage: null },
      }
      const { container } = render(<GoalProgressCard data={data} />)
      expect(container.firstChild).toBeTruthy()
    })
  })

  // ─── TutorialProgressCard ───
  describe("TutorialProgressCard", () => {
    it("正常データでリンク先が正しい", () => {
      const items: TutorialProgressItem[] = [
        {
          tutorialSlug: "html-basics",
          tutorialTitle: "HTML基礎",
          genre: "engineering",
          completedSections: 10,
          totalSections: 15,
          percentage: 67,
        },
      ]
      render(<TutorialProgressCard items={items} defaultGenre="engineering" />)

      const link = screen.getByRole("link", { name: "HTML基礎" })
      expect(link).toHaveAttribute("href", "/contents/html-basics")
    })

    it("空データ（教材なし）でフォールバック表示される", () => {
      render(<TutorialProgressCard items={[]} defaultGenre="engineering" />)
      expect(screen.getByText("教材なし")).toBeInTheDocument()
    })

    it("ジャンル未設定でフォールバック表示される", () => {
      render(<TutorialProgressCard items={[]} defaultGenre={null} />)
      expect(screen.getByText("ジャンルが設定されていません")).toBeInTheDocument()
    })
  })

  // ─── DailyReportCard ───
  describe("DailyReportCard", () => {
    it("入力済み状態でリンク先 /daily-reports が正しい", () => {
      const status: DailyReportStatus = {
        type: "entered",
        totalHours: 3,
        entries: [{ actualHours: 3, content: "React学習" }],
      }
      render(<DailyReportCard status={status} />)

      const links = screen.getAllByRole("link")
      expect(links.some((l) => l.getAttribute("href") === "/daily-reports")).toBe(true)
    })

    it("未入力状態でCTA が表示され、リンク先 /daily-reports が正しい", () => {
      const status: DailyReportStatus = { type: "not_entered" }
      render(<DailyReportCard status={status} />)

      expect(screen.getByText("今日の日報を入力しましょう")).toBeInTheDocument()
      const links = screen.getAllByRole("link")
      expect(links.some((l) => l.getAttribute("href") === "/daily-reports")).toBe(true)
    })
  })

  // ─── CoachingCard ───
  describe("CoachingCard", () => {
    it("セッションあり状態でリンク先 /coaching が正しい", () => {
      const data: CoachingData = {
        creditBalance: 5,
        nextSession: {
          sessionDate: "2026-03-20",
          startTime: "14:00",
          endTime: "15:00",
          genre: "design",
        },
      }
      render(<CoachingCard data={data} />)

      const links = screen.getAllByRole("link")
      expect(links.some((l) => l.getAttribute("href") === "/coaching")).toBe(true)
    })

    it("予約なし状態でフォールバック表示される", () => {
      const data: CoachingData = {
        creditBalance: 0,
        nextSession: null,
      }
      render(<CoachingCard data={data} />)

      expect(screen.getByText("予約なし")).toBeInTheDocument()
      const links = screen.getAllByRole("link")
      expect(links.some((l) => l.getAttribute("href") === "/coaching")).toBe(true)
    })
  })

  // ─── ProjectStatusCard ───
  describe("ProjectStatusCard", () => {
    it("進行中案件ありでリンク先 /projects/{slug} が正しい", () => {
      const data: ProjectsData = {
        activeProjects: [
          { projectSlug: "test-project", projectTitle: "テスト案件", status: "着手済み", latestScore: null },
        ],
        recentCompleted: [],
      }
      render(<ProjectStatusCard data={data} />)

      const link = screen.getByRole("link", { name: "テスト案件" })
      expect(link).toHaveAttribute("href", "/projects/test-project")
    })

    it("案件なし状態でフォールバック表示され、/projects リンクが正しい", () => {
      const data: ProjectsData = {
        activeProjects: [],
        recentCompleted: [],
      }
      render(<ProjectStatusCard data={data} />)

      expect(screen.getByText("進行中の案件なし")).toBeInTheDocument()
      const links = screen.getAllByRole("link")
      expect(links.some((l) => l.getAttribute("href") === "/projects")).toBe(true)
    })

    it("差し戻しステータスが正しい Badge variant で表示される", () => {
      const data: ProjectsData = {
        activeProjects: [
          { projectSlug: "rejected-project", projectTitle: "差し戻し案件", status: "差し戻し", latestScore: null },
        ],
        recentCompleted: [],
      }
      render(<ProjectStatusCard data={data} />)

      const badge = screen.getByText("差し戻し")
      expect(badge).toBeInTheDocument()
      expect(badge.getAttribute("data-variant")).toBe("destructive")
    })
  })

  // ─── SkillReportCard ───
  describe("SkillReportCard", () => {
    it("採点データあり状態でレーダーチャートが表示される", () => {
      const data: SkillReportData = {
        categories: [
          { categoryLarge: "フロントエンド", okCount: 8, totalCount: 10, percentage: 80 },
        ],
        hasData: true,
      }
      render(<SkillReportCard data={data} />)

      expect(screen.getByTestId("radar-chart")).toBeInTheDocument()
    })

    it("採点データなし状態でフォールバック表示される", () => {
      const data: SkillReportData = {
        categories: [],
        hasData: false,
      }
      render(<SkillReportCard data={data} />)

      expect(screen.getByText("採点済みの案件がありません")).toBeInTheDocument()
      expect(screen.queryByTestId("radar-chart")).not.toBeInTheDocument()
    })
  })
})
