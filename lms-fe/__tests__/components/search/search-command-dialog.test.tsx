// @vitest-environment jsdom
/**
 * SearchCommandDialog の結合テスト
 *
 * Task 7.2: 検索UIの結合テスト
 *
 * Requirements: 2.3, 2.5, 2.6, 2.7, 2.8, 3.1, 3.6, 3.7, 3.8, 4.6, 4.7, 5.1, 5.2, 5.3
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SearchCommandDialog } from "@/components/search/search-command-dialog"

// next/navigation モック
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// fetch モック
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockResults = [
  {
    id: "result-1",
    title: "JavaScript入門",
    snippet: "JavaScriptの基本構文について学びます",
    genre: "engineering",
    tutorial: "programming-basics",
    chapter: "javascript",
    section: "intro",
    genreTitle: "Engineering",
    tutorialTitle: "プログラミング基礎",
    chapterTitle: "JavaScript入門",
    score: 0.85,
  },
  {
    id: "result-2",
    title: "TypeScript概要",
    snippet: "TypeScriptの型システムについて",
    genre: "engineering",
    tutorial: "programming-basics",
    chapter: "typescript",
    section: "overview",
    genreTitle: "Engineering",
    tutorialTitle: "プログラミング基礎",
    chapterTitle: "TypeScript概要",
    score: 0.42,
  },
]

function createSuccessResponse(results = mockResults) {
  return {
    ok: true,
    json: () => Promise.resolve({ results, query: "test", total: results.length }),
  }
}

function createEmptyResponse() {
  return {
    ok: true,
    json: () => Promise.resolve({ results: [], query: "test", total: 0 }),
  }
}

function createErrorResponse() {
  return {
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error: "検索中にエラーが発生しました" }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("SearchCommandDialog", () => {
  describe("モーダル表示 (Req 2.3)", () => {
    it("open=true で検索モーダルが表示される", () => {
      render(
        <SearchCommandDialog open={true} onOpenChange={vi.fn()} />
      )

      expect(screen.getByPlaceholderText("教材を検索...")).toBeInTheDocument()
    })

    it("open=false でモーダルが表示されない", () => {
      render(
        <SearchCommandDialog open={false} onOpenChange={vi.fn()} />
      )

      expect(screen.queryByPlaceholderText("教材を検索...")).not.toBeInTheDocument()
    })
  })

  describe("初期状態", () => {
    it("初期状態でプレースホルダーメッセージが表示される", () => {
      render(
        <SearchCommandDialog open={true} onOpenChange={vi.fn()} />
      )

      expect(screen.getByText("キーワードを入力して検索")).toBeInTheDocument()
    })
  })

  describe("キーボード操作ヒント (Req 2.8)", () => {
    it("フッターにナビゲーション・選択・閉じるのヒントが表示される", () => {
      render(
        <SearchCommandDialog open={true} onOpenChange={vi.fn()} />
      )

      expect(screen.getByText("ナビゲーション")).toBeInTheDocument()
      expect(screen.getByText("選択")).toBeInTheDocument()
      expect(screen.getByText("閉じる")).toBeInTheDocument()
    })
  })

  describe("検索結果の表示 (Req 3.7, 3.8)", () => {
    it("検索結果が表示される", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce(createSuccessResponse())

      render(
        <SearchCommandDialog open={true} onOpenChange={vi.fn()} />
      )

      const input = screen.getByPlaceholderText("教材を検索...")
      await user.type(input, "JavaScript")

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText("JavaScript入門")).toBeInTheDocument()
        expect(screen.getByText("TypeScript概要")).toBeInTheDocument()
      })
    })

    it("0件時にメッセージが表示される", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce(createEmptyResponse())

      render(
        <SearchCommandDialog open={true} onOpenChange={vi.fn()} />
      )

      const input = screen.getByPlaceholderText("教材を検索...")
      await user.type(input, "存在しないコンテンツ")

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText(/検索結果が見つかりませんでした/)).toBeInTheDocument()
      })
    })

    it("エラー時にエラーメッセージが表示される", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce(createErrorResponse())

      render(
        <SearchCommandDialog open={true} onOpenChange={vi.fn()} />
      )

      const input = screen.getByPlaceholderText("教材を検索...")
      await user.type(input, "テスト")

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText("検索中にエラーが発生しました")).toBeInTheDocument()
      })
    })
  })

  describe("ナビゲーション (Req 5.1, 5.2, 5.3)", () => {
    it("検索結果クリックでセクションページに遷移し genre パラメータを含む", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      mockFetch.mockResolvedValueOnce(createSuccessResponse())
      const onOpenChange = vi.fn()

      render(
        <SearchCommandDialog open={true} onOpenChange={onOpenChange} />
      )

      const input = screen.getByPlaceholderText("教材を検索...")
      await user.type(input, "JavaScript")

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(screen.getByText("JavaScript入門")).toBeInTheDocument()
      })

      // cmdk の CommandItem をクリック
      const resultItem = screen.getByText("JavaScript入門").closest("[cmdk-item]")
      if (resultItem) {
        await user.click(resultItem)
      }

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/contents/programming-basics/javascript/intro?genre=engineering#section-content"
        )
        expect(onOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })
})

// act を import
import { act } from "@testing-library/react"
