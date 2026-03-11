/**
 * POST /api/admin/sync-curriculums のテスト
 *
 * コンテンツ同期 API のエンドポイントテスト。
 * Task 2.1: RPC ベースへの変更に対応したテスト。
 * API キー認証、ペイロードバリデーション（commit_hash 追加）、
 * RPC sync_content_version 呼び出し、レスポンス形式を検証する。
 */

// --- モック定義 ---

const mockRpc = vi.fn()

const mockAdminClient = {
  rpc: mockRpc,
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}))

// --- テスト用データ ---

const validContents = [
  {
    slug_path: "html-css-basics/chapter1/intro",
    title: "HTML/CSS 入門",
    body: "# はじめに\nHTML の基礎を学びます。",
    genre: "engineering",
    tutorial: "html-css-basics",
    chapter: "chapter1",
    section: "intro",
    content_type: "section" as const,
    order: 1,
  },
  {
    slug_path: "html-css-basics",
    title: "HTML/CSS 基礎",
    body: null,
    genre: "engineering",
    tutorial: "html-css-basics",
    chapter: null,
    section: null,
    content_type: "tutorial" as const,
    order: 0,
  },
]

const validPayload = {
  contents: validContents,
  commit_hash: "abc123def456",
}

const validPayloadWithoutCommitHash = {
  contents: validContents,
}

function createRequest(
  body: unknown,
  apiKey: string | null = "test-sync-api-key"
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (apiKey) {
    headers["x-api-key"] = apiKey
  }
  return new Request("http://localhost:3000/api/admin/sync-curriculums", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
}

// --- テスト ---

describe("POST /api/admin/sync-curriculums", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      SYNC_API_KEY: "test-sync-api-key",
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // ==============================
  // API キー認証（既存ロジック維持）
  // ==============================
  describe("API キー認証", () => {
    it("x-api-key ヘッダーが一致する場合は 401 を返さない", async () => {
      mockRpc.mockResolvedValue({
        data: {
          version_id: "uuid-v1",
          changes_summary: { added: 2, updated: 0, deleted: 0 },
          changed_paths: [],
        },
        error: null,
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayload)
      const response = await POST(request)

      expect(response.status).not.toBe(401)
    })

    it("x-api-key ヘッダーが不一致の場合は 401 Unauthorized を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayload, "wrong-api-key")
      const response = await POST(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.success).toBe(false)
    })

    it("x-api-key ヘッダーが存在しない場合は 401 Unauthorized を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayload, null)
      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  // ==============================
  // ペイロードバリデーション
  // ==============================
  describe("ペイロードバリデーション", () => {
    it("contents 配列が空の場合は 400 Bad Request を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({ contents: [], commit_hash: "abc123" })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
    })

    it("contents プロパティが存在しない場合は 400 Bad Request を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({ invalid: "data" })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("必須フィールドが欠落しているアイテムがある場合は 400 Bad Request を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: [
          {
            slug_path: "test",
            // title が欠落
            genre: "engineering",
            tutorial: "test",
            content_type: "tutorial",
          },
        ],
        commit_hash: "abc123",
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it("JSON パースに失敗した場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = new Request(
        "http://localhost:3000/api/admin/sync-curriculums",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "test-sync-api-key",
          },
          body: "invalid json{{{",
        }
      )
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
    })
  })

  // ==============================
  // commit_hash バリデーション（Task 2.1 新規）
  // ==============================
  describe("commit_hash バリデーション", () => {
    it("commit_hash が文字列かつ空でない場合はバリデーションを通過する", async () => {
      mockRpc.mockResolvedValue({
        data: {
          version_id: "uuid-v1",
          changes_summary: { added: 2, updated: 0, deleted: 0 },
          changed_paths: [],
        },
        error: null,
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        commit_hash: "abc123def456",
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it("commit_hash が空文字の場合は 400 Bad Request を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        commit_hash: "",
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.errors).toBeDefined()
      expect(body.errors.some((e: string) => e.includes("commit_hash"))).toBe(
        true
      )
    })

    it("commit_hash が文字列以外の型の場合は 400 Bad Request を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        commit_hash: 12345,
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.errors).toBeDefined()
      expect(body.errors.some((e: string) => e.includes("commit_hash"))).toBe(
        true
      )
    })
  })

  // ==============================
  // commit_hash 後方互換性（Task 2.1 新規）
  // ==============================
  describe("commit_hash 後方互換性", () => {
    it("commit_hash が未指定の場合は 'unknown' をフォールバック値として RPC に渡す", async () => {
      mockRpc.mockResolvedValue({
        data: {
          version_id: "uuid-v1",
          changes_summary: { added: 2, updated: 0, deleted: 0 },
          changed_paths: [],
        },
        error: null,
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithoutCommitHash)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockRpc).toHaveBeenCalledWith("sync_content_version", {
        p_commit_hash: "unknown",
        p_contents: expect.any(Array),
      })
    })
  })

  // ==============================
  // RPC sync_content_version 呼び出し（Task 2.1 新規）
  // ==============================
  describe("RPC sync_content_version 呼び出し", () => {
    it("createAdminClient を使用して RPC を呼び出す", async () => {
      mockRpc.mockResolvedValue({
        data: {
          version_id: "uuid-v1",
          changes_summary: { added: 2, updated: 0, deleted: 0 },
          changed_paths: ["html-css-basics/chapter1/intro", "html-css-basics"],
        },
        error: null,
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayload)
      await POST(request)

      expect(mockRpc).toHaveBeenCalledWith("sync_content_version", {
        p_commit_hash: "abc123def456",
        p_contents: expect.any(Array),
      })
    })

    it("RPC に渡す p_contents が正しいフォーマットであること", async () => {
      mockRpc.mockResolvedValue({
        data: {
          version_id: "uuid-v1",
          changes_summary: { added: 2, updated: 0, deleted: 0 },
          changed_paths: [],
        },
        error: null,
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayload)
      await POST(request)

      const rpcCall = mockRpc.mock.calls[0]
      expect(rpcCall[0]).toBe("sync_content_version")
      const params = rpcCall[1]
      expect(params.p_contents).toEqual(
        validContents.map((item) => ({
          slug_path: item.slug_path,
          title: item.title,
          body: item.body ?? null,
          genre: item.genre,
          tutorial: item.tutorial,
          chapter: item.chapter ?? null,
          section: item.section ?? null,
          content_type: item.content_type,
          order: item.order ?? 0,
          metadata: item.metadata ?? null,
        }))
      )
    })

    it("RPC エラー時は 500 Internal Server Error を返す", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "RPC execution failed", code: "P0001" },
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayload)
      const response = await POST(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.errors).toBeDefined()
      expect(body.errors.length).toBeGreaterThan(0)
    })

    it("予期しない例外発生時は 500 Internal Server Error を返す", async () => {
      mockRpc.mockRejectedValue(new Error("Unexpected connection error"))

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayload)
      const response = await POST(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.errors).toBeDefined()
    })
  })

  // ==============================
  // レスポンス形式（Task 2.1 新規: SyncResponseV2 準拠）
  // ==============================
  describe("レスポンス形式（SyncResponseV2）", () => {
    it("成功レスポンスに version_id を含む", async () => {
      mockRpc.mockResolvedValue({
        data: {
          version_id: "test-version-uuid",
          changes_summary: { added: 2, updated: 0, deleted: 0 },
          changed_paths: [],
        },
        error: null,
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayload)
      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.version_id).toBe("test-version-uuid")
    })

    it("成功レスポンスの summary に created（added+updated の合計）と archived（deleted）を含む", async () => {
      mockRpc.mockResolvedValue({
        data: {
          version_id: "test-version-uuid",
          changes_summary: { added: 3, updated: 1, deleted: 2 },
          changed_paths: [],
        },
        error: null,
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayload)
      const response = await POST(request)
      const body = await response.json()

      expect(body.success).toBe(true)
      expect(body.summary).toBeDefined()
      expect(body.summary.created).toBe(4) // added(3) + updated(1)
      expect(body.summary.archived).toBe(2) // deleted
    })

    it("エラーレスポンスに errors 配列が含まれる", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Constraint violation" },
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayload)
      const response = await POST(request)
      const body = await response.json()

      expect(body.success).toBe(false)
      expect(Array.isArray(body.errors)).toBe(true)
      expect(body.errors.length).toBeGreaterThan(0)
    })

    it("エラーレスポンスの summary はゼロ値を含む", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "DB error" },
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayload)
      const response = await POST(request)
      const body = await response.json()

      expect(body.summary.created).toBe(0)
      expect(body.summary.archived).toBe(0)
    })
  })
})
