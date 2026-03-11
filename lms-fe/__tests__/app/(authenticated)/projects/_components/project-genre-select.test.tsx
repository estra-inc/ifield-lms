/**
 * @vitest-environment jsdom
 */

/**
 * ProjectGenreSelect テスト
 *
 * Task 5.2: ジャンルフィルタの実装
 * Requirements: 1.8, 1.9
 *
 * - projects ページ向けの GenreSelect ラッパー
 * - URL searchParams ?genre= でフィルタ状態を管理
 * - contents ページの GenreSelect パターンを踏襲
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockRefresh = vi.fn()
const mockSearchParamsString = ""

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams(mockSearchParamsString),
}))

// Mock updateDefaultGenre action
vi.mock("@/app/(authenticated)/contents/actions", () => ({
  updateDefaultGenre: vi.fn().mockResolvedValue({ success: true, message: "" }),
}))

import { ProjectGenreSelect } from "@/app/(authenticated)/projects/_components/project-genre-select"

describe("ProjectGenreSelect (Task 5.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("ジャンルドロップダウンを表示する", () => {
    render(
      <ProjectGenreSelect
        currentGenre="engineering"
        defaultGenre="engineering"
      />
    )

    expect(screen.getByText("エンジニアリング")).toBeInTheDocument()
  })

  it("ジャンル選択時に /projects?genre= パスへ遷移する", async () => {
    const user = userEvent.setup()
    render(
      <ProjectGenreSelect
        currentGenre="engineering"
        defaultGenre="engineering"
      />
    )

    // ドロップダウンを開く
    await user.click(screen.getByText("エンジニアリング"))

    // デザインを選択
    await user.click(screen.getByText("デザイン"))

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/projects")
    )
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("genre=design")
    )
  })
})
