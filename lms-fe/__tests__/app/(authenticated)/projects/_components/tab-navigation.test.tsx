/**
 * @vitest-environment jsdom
 */

/**
 * TabNavigation Client Component テスト
 *
 * Task 6.2: TabNavigation の作成
 * Requirements: 10.2, 10.4
 *
 * - 3つのタブを表示
 * - アクティブタブのスタイリング
 * - タブクリック時の URL searchParams 更新
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock next/navigation
const mockReplace = vi.fn()
const mockSearchParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/projects/test-slug",
}))

import { TabNavigation } from "@/app/(authenticated)/projects/_components/tab-navigation"

describe("TabNavigation (Task 6.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("3つのタブを表示する", () => {
    render(<TabNavigation activeTab="progress" />)

    expect(screen.getByText("進捗")).toBeInTheDocument()
    expect(screen.getByText("案件要件")).toBeInTheDocument()
    expect(screen.getByText("タスク管理")).toBeInTheDocument()
  })

  it("アクティブタブにスタイリングが適用される", () => {
    render(<TabNavigation activeTab="progress" />)

    const activeTab = screen.getByText("進捗")
    expect(activeTab.closest("a, button")).toHaveClass("border-primary")
  })

  it("非アクティブタブにはアクティブスタイリングが適用されない", () => {
    render(<TabNavigation activeTab="progress" />)

    const inactiveTab = screen.getByText("タスク管理")
    expect(inactiveTab.closest("a, button")).not.toHaveClass("border-primary")
  })

  it("タブクリック時に URL searchParams を更新する", async () => {
    const user = userEvent.setup()
    render(<TabNavigation activeTab="progress" />)

    await user.click(screen.getByText("タスク管理"))

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("tab=tasks")
    )
  })

  it("デフォルトタブは progress である", () => {
    render(<TabNavigation activeTab="progress" />)

    const activeTab = screen.getByText("進捗")
    expect(activeTab.closest("a, button")).toHaveClass("border-primary")

    const inactiveTab = screen.getByText("案件要件")
    expect(inactiveTab.closest("a, button")).not.toHaveClass("border-primary")
  })

  it("異なるアクティブタブで正しくスタイリングが適用される", () => {
    render(<TabNavigation activeTab="requirements" />)

    const activeTab = screen.getByText("案件要件")
    expect(activeTab.closest("a, button")).toHaveClass("border-primary")

    const inactiveTab = screen.getByText("進捗")
    expect(inactiveTab.closest("a, button")).not.toHaveClass("border-primary")
  })
})
