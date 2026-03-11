/**
 * GET /api/search のテスト
 *
 * 検索 API エンドポイントのテスト。
 * Task 2: 検索APIエンドポイントの実装
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.4
 */

// --- モック定義 ---

const mockGetUser = vi.fn()
const mockRpc = vi.fn()

const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  rpc: mockRpc,
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// --- テスト用データ ---

const mockSearchResults = [
  {
    id: "uuid-1",
    title: "JavaScript 入門",
    snippet: "JavaScriptの基本的な構文と概念について学びます。変数、関数、条件分岐などの基礎を理解しましょう。",
    genre: "engineering",
    tutorial: "js-basics",
    chapter: "chapter1",
    section: "intro",
    genre_title: "Engineering",
    tutorial_title: "JavaScript基礎",
    chapter_title: "第1章 基礎",
    score: 2.5,
  },
  {
    id: "uuid-2",
    title: "TypeScript の型システム",
    snippet: "TypeScriptの型システムについて詳しく解説します。基本型からジェネリクスまで幅広くカバーします。",
    genre: "engineering",
    tutorial: "ts-advanced",
    chapter: "chapter2",
    section: "types",
    genre_title: "Engineering",
    tutorial_title: "TypeScript応用",
    chapter_title: "第2章 型システム",
    score: 1.8,
  },
]

function createSearchRequest(queryParam?: string): Request {
  const url = queryParam !== undefined
    ? `http://localhost:3000/api/search?q=${encodeURIComponent(queryParam)}`
    : "http://localhost:3000/api/search"
  return new Request(url, { method: "GET" })
}

// --- テスト ---

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  // ==============================
  // 認証チェック (Req 6.4, 7.1)
  // ==============================
  describe("認証チェック", () => {
    it("認証されていないユーザーの場合は 401 を返す", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("JavaScript")
      const response = await GET(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("認証済みユーザーの場合は 401 を返さない", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-uuid" } },
        error: null,
      })
      mockRpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("JavaScript")
      const response = await GET(request)

      expect(response.status).not.toBe(401)
    })
  })

  // ==============================
  // クエリパラメータバリデーション (Req 6.5)
  // ==============================
  describe("クエリパラメータバリデーション", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-uuid" } },
        error: null,
      })
    })

    it("q パラメータが存在しない場合は 400 を返す", async () => {
      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest()
      const response = await GET(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("q パラメータが空文字の場合は 400 を返す", async () => {
      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("")
      const response = await GET(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("q パラメータが空白文字のみの場合は 400 を返す", async () => {
      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("   ")
      const response = await GET(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("q パラメータが1文字の場合は 400 を返す", async () => {
      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("a")
      const response = await GET(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("q パラメータが2文字以上の場合はバリデーションを通過する", async () => {
      mockRpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("JS")
      const response = await GET(request)

      expect(response.status).not.toBe(400)
    })
  })

  // ==============================
  // RPC 呼び出し (Req 6.2, 7.4)
  // ==============================
  describe("RPC 呼び出し", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-uuid" } },
        error: null,
      })
    })

    it("search_contents RPC を正しいパラメータで呼び出す", async () => {
      mockRpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("JavaScript")
      await GET(request)

      expect(mockRpc).toHaveBeenCalledWith("search_contents", {
        search_query: "JavaScript",
      })
    })

    it("RPC エラー時は 500 を返す", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "RPC execution failed" },
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("JavaScript")
      const response = await GET(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBeDefined()
    })

    it("RPC エラー時はクライアントに汎用メッセージを返す（詳細を漏洩しない）", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Sensitive internal error details" },
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("JavaScript")
      const response = await GET(request)

      const body = await response.json()
      expect(body.error).not.toContain("Sensitive")
      expect(body.error).not.toContain("internal")
    })
  })

  // ==============================
  // 正常系レスポンス (Req 6.1, 6.3)
  // ==============================
  describe("正常系レスポンス", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-uuid" } },
        error: null,
      })
    })

    it("200 ステータスコードを返す", async () => {
      mockRpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("JavaScript")
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it("SearchAPIResponse 形式でレスポンスを返す（results, query, total）", async () => {
      mockRpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("JavaScript")
      const response = await GET(request)
      const body = await response.json()

      expect(body.results).toBeDefined()
      expect(Array.isArray(body.results)).toBe(true)
      expect(body.query).toBe("JavaScript")
      expect(body.total).toBe(2)
    })

    it("検索結果に id, title, snippet, 階層パス情報, score が含まれる (Req 6.3)", async () => {
      mockRpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("JavaScript")
      const response = await GET(request)
      const body = await response.json()

      const result = body.results[0]
      expect(result.id).toBe("uuid-1")
      expect(result.title).toBe("JavaScript 入門")
      expect(result.snippet).toBeDefined()
      expect(result.genre).toBe("engineering")
      expect(result.tutorial).toBe("js-basics")
      expect(result.chapter).toBe("chapter1")
      expect(result.section).toBe("intro")
      expect(result.score).toBe(2.5)
    })

    it("RPC の snake_case カラム名を camelCase に変換する", async () => {
      mockRpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("JavaScript")
      const response = await GET(request)
      const body = await response.json()

      const result = body.results[0]
      expect(result.genreTitle).toBe("Engineering")
      expect(result.tutorialTitle).toBe("JavaScript基礎")
      expect(result.chapterTitle).toBe("第1章 基礎")
      // snake_case のキーは存在しないことを確認
      expect(result.genre_title).toBeUndefined()
      expect(result.tutorial_title).toBeUndefined()
      expect(result.chapter_title).toBeUndefined()
    })

    it("検索結果が空配列の場合も正常にレスポンスを返す", async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("存在しないキーワード")
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.results).toEqual([])
      expect(body.total).toBe(0)
    })
  })

  // ==============================
  // エッジケース
  // ==============================
  describe("エッジケース", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-uuid" } },
        error: null,
      })
    })

    it("q パラメータの前後の空白を trim して検索する", async () => {
      mockRpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("  JavaScript  ")
      await GET(request)

      expect(mockRpc).toHaveBeenCalledWith("search_contents", {
        search_query: "JavaScript",
      })
    })

    it("trim 後に1文字以下になる場合は 400 を返す", async () => {
      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("  a  ")
      const response = await GET(request)

      expect(response.status).toBe(400)
    })
  })

  // ==============================
  // セキュリティ検証 (Req 7.2, 7.4)
  // ==============================
  describe("セキュリティ検証", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-uuid" } },
        error: null,
      })
    })

    it("検索クエリはパラメータ化された RPC 呼び出しで渡される（SQL インジェクション対策）", async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const maliciousQuery = "'; DROP TABLE contents; --"
      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest(maliciousQuery)
      await GET(request)

      // RPC はパラメータ化クエリとして呼び出される（文字列結合ではない）
      expect(mockRpc).toHaveBeenCalledWith("search_contents", {
        search_query: maliciousQuery,
      })
      // search_query パラメータとしてそのまま渡されることで
      // Supabase/PostgreSQL がエスケープ処理を行う
    })

    it("active バージョン限定は search_contents RPC 内で保証される", async () => {
      mockRpc.mockResolvedValue({
        data: mockSearchResults,
        error: null,
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("JavaScript")
      await GET(request)

      // search_contents RPC のみが呼び出されることを確認
      // RPC 内部で active バージョンのコンテンツのみを返す SQL が実装されている
      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(mockRpc).toHaveBeenCalledWith(
        "search_contents",
        expect.any(Object)
      )
    })

    it("RPC エラー時にサーバー内部情報を漏洩しない", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "relation \"contents\" does not exist at line 5" },
      })

      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest("test")
      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      // テーブル名やSQL詳細が漏洩しないこと
      expect(body.error).not.toContain("contents")
      expect(body.error).not.toContain("relation")
      expect(body.error).not.toContain("line")
    })

    it("特殊文字を含むクエリでも正常に RPC を呼び出す", async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const specialChars = "SELECT * FROM users WHERE 1=1"
      const { GET } = await import("@/app/api/search/route")
      const request = createSearchRequest(specialChars)
      await GET(request)

      expect(mockRpc).toHaveBeenCalledWith("search_contents", {
        search_query: specialChars,
      })
    })
  })
})
