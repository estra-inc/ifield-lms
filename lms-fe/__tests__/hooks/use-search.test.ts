// @vitest-environment jsdom
/**
 * useSearch カスタムフックのテスト
 *
 * Task 4: 検索クエリの状態管理、300msデバウンス、API呼び出し、
 * AbortControllerによる競合リクエストキャンセル
 *
 * Requirements: 3.1, 3.5, 3.6, 3.8
 */

import { renderHook, act, waitFor } from "@testing-library/react"
import { useSearch } from "@/hooks/use-search"

// fetch モック
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

const mockSearchResults = [
  {
    id: "1",
    title: "Test Result",
    snippet: "Test snippet",
    genre: "engineering",
    tutorial: "tutorial-1",
    chapter: "chapter-1",
    section: "section-1",
    genreTitle: "Engineering",
    tutorialTitle: "Tutorial 1",
    chapterTitle: "Chapter 1",
    score: 0.8,
  },
]

function createSuccessResponse(results = mockSearchResults) {
  return {
    ok: true,
    json: () => Promise.resolve({ results, query: "test", total: results.length }),
  }
}

function createErrorResponse(status: number, error: string) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  }
}

describe("useSearch", () => {
  describe("初期状態", () => {
    it("初期状態では query が空文字、results が空配列、isLoading が false、error が null", () => {
      const { result } = renderHook(() => useSearch())

      expect(result.current.query).toBe("")
      expect(result.current.results).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe("デバウンス処理 (Req 3.1)", () => {
    it("300ms のデバウンス後に API を呼び出す", async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse())
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery("テスト")
      })

      // 300ms 経過前は fetch が呼ばれない
      expect(mockFetch).not.toHaveBeenCalled()

      // 300ms 経過
      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })
    })

    it("300ms 以内のクエリ変更でデバウンスがリセットされる", async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse())
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery("テ")
      })

      act(() => {
        vi.advanceTimersByTime(200)
      })

      // 200ms後にクエリ変更（リセット）
      act(() => {
        result.current.setQuery("テスト")
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      // 最後のクエリのみで fetch が1回呼ばれる（「テ」は1文字なのでスキップ）
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("q=%E3%83%86%E3%82%B9%E3%83%88"),
          expect.any(Object)
        )
      })
    })
  })

  describe("2文字未満のクエリ抑制 (Req 3.5)", () => {
    it("1文字のクエリでは API を呼び出さない", async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery("テ")
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result.current.results).toEqual([])
    })

    it("空文字のクエリでは API を呼び出さない", async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery("")
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("空白のみのクエリでは API を呼び出さない", async () => {
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery("   ")
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe("ローディング状態 (Req 3.6)", () => {
    it("API 呼び出し中は isLoading が true になる", async () => {
      let resolvePromise: (value: unknown) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(fetchPromise)

      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery("テスト")
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })

      await act(async () => {
        resolvePromise!(createSuccessResponse())
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  describe("検索結果の取得", () => {
    it("正常系: 検索結果が results に設定される", async () => {
      mockFetch.mockResolvedValueOnce(createSuccessResponse())
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery("テスト")
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.results).toEqual(mockSearchResults)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.error).toBeNull()
      })
    })
  })

  describe("エラーハンドリング (Req 3.8)", () => {
    it("API エラー時は error にメッセージが設定され、results は空配列になる", async () => {
      mockFetch.mockResolvedValueOnce(
        createErrorResponse(500, "検索中にエラーが発生しました")
      )
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery("テスト")
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.error).toBe("検索中にエラーが発生しました")
        expect(result.current.results).toEqual([])
        expect(result.current.isLoading).toBe(false)
      })
    })

    it("ネットワークエラー時もエラー状態になる", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))
      const { result } = renderHook(() => useSearch())

      act(() => {
        result.current.setQuery("テスト")
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(result.current.error).toBe("Network error")
        expect(result.current.results).toEqual([])
        expect(result.current.isLoading).toBe(false)
      })
    })
  })
})
