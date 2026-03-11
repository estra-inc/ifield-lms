// @vitest-environment jsdom
/**
 * SearchTrigger コンポーネントのテスト
 *
 * Task 6: SearchTriggerコンポーネントの実装とAppHeaderへの統合
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SearchTrigger } from "@/components/search/search-trigger"

// next/navigation モック
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// fetch モック
global.fetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

describe("SearchTrigger", () => {
  describe("ロール制御", () => {
    it("User ロールで検索バーが表示される (Req 2.1)", () => {
      render(<SearchTrigger userRole="user" />)

      expect(screen.getByText("教材を検索...")).toBeInTheDocument()
    })

    it("Manager ロールでは何も表示されない", () => {
      const { container } = render(<SearchTrigger userRole="manager" />)

      expect(container.innerHTML).toBe("")
    })

    it("Super Admin ロールでは何も表示されない", () => {
      const { container } = render(<SearchTrigger userRole="super_admin" />)

      expect(container.innerHTML).toBe("")
    })
  })

  describe("ショートカットヒントバッジ (Req 2.2)", () => {
    it("キーボードショートカットのバッジが表示される", () => {
      render(<SearchTrigger userRole="user" />)

      // K の表示があること
      const kbd = screen.getByText(/K/)
      expect(kbd).toBeInTheDocument()
    })
  })

  describe("モーダル開閉 (Req 2.3)", () => {
    it("検索バーをクリックするとモーダルが開く", async () => {
      const user = userEvent.setup()
      render(<SearchTrigger userRole="user" />)

      const trigger = screen.getByText("教材を検索...")
      await user.click(trigger)

      // CommandDialog の入力フィールドが表示される
      expect(screen.getByPlaceholderText("教材を検索...")).toBeInTheDocument()
    })
  })

  describe("キーボードショートカット (Req 2.4)", () => {
    it("Cmd+K でモーダルが開く", async () => {
      const user = userEvent.setup()
      render(<SearchTrigger userRole="user" />)

      await user.keyboard("{Meta>}k{/Meta}")

      expect(screen.getByPlaceholderText("教材を検索...")).toBeInTheDocument()
    })

    it("Ctrl+K でモーダルが開く", async () => {
      const user = userEvent.setup()
      render(<SearchTrigger userRole="user" />)

      await user.keyboard("{Control>}k{/Control}")

      expect(screen.getByPlaceholderText("教材を検索...")).toBeInTheDocument()
    })
  })
})
