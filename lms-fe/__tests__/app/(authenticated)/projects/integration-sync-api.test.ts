/**
 * Task 12.4: 同期 API 拡張のテスト
 *
 * mock_projects フィールド付きペイロードの UPSERT 動作を検証する。
 * 既存の route.test.ts はコンテンツ同期（contents）のみカバーしており、
 * mock_projects 拡張部分は未テスト。
 *
 * Requirements: 9.1, 9.3, 9.4, 9.8
 */

// ---- Mock Setup ----

const mockRpc = vi.fn()

const mockAdminClient = {
  rpc: mockRpc,
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}))

// ---- Helpers ----

const validContents = [
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

/**
 * sync_content_version と sync_mock_project_data の両方をモックする
 */
function setupDualRpcMock(mockProjectResult: {
  added: number
  updated: number
  deleted: number
}) {
  mockRpc.mockImplementation((name: string) => {
    if (name === "sync_content_version") {
      return Promise.resolve({
        data: {
          version_id: "version-uuid-1",
          changes_summary: { added: 1, updated: 0, deleted: 0 },
          changed_paths: [],
        },
        error: null,
      })
    }
    if (name === "sync_mock_project_data") {
      return Promise.resolve({
        data: {
          mock_project_changes_summary: mockProjectResult,
        },
        error: null,
      })
    }
    return Promise.resolve({ data: null, error: null })
  })
}

// ---- Tests ----

describe("同期 API: mock_projects 拡張 (Task 12.4)", () => {
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
  // UPSERT 動作 (Req 9.1, 9.3)
  // ==============================
  describe("mock_projects 付きペイロードの UPSERT", () => {
    it("mock_projects フィールド付きペイロードで sync_mock_project_data RPC を呼び出す", async () => {
      setupDualRpcMock({ added: 2, updated: 0, deleted: 0 })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )

      const request = createRequest({
        contents: validContents,
        commit_hash: "abc123",
        mock_projects: [
          {
            slug: "project-1",
            title: "模擬案件1",
            description: "案件の概要",
            requirements: "要件の詳細",
            evaluation_items: [],
            genre: "engineering",
            order: 1,
            status: "active",
          },
          {
            slug: "project-2",
            title: "模擬案件2",
            genre: "design",
            order: 2,
            status: "active",
          },
        ],
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)

      // sync_mock_project_data RPC が version_id と mock_projects データで呼ばれている
      expect(mockRpc).toHaveBeenCalledWith("sync_mock_project_data", {
        p_version_id: "version-uuid-1",
        p_mock_projects: expect.arrayContaining([
          expect.objectContaining({
            slug: "project-1",
            title: "模擬案件1",
            genre: "engineering",
          }),
          expect.objectContaining({
            slug: "project-2",
            title: "模擬案件2",
            genre: "design",
          }),
        ]),
      })
    })

    it("mock_project_summary がレスポンスに含まれる", async () => {
      setupDualRpcMock({ added: 1, updated: 1, deleted: 2 })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )

      const request = createRequest({
        contents: validContents,
        commit_hash: "abc123",
        mock_projects: [
          {
            slug: "project-1",
            title: "模擬案件1",
            genre: "engineering",
            order: 1,
            status: "active",
          },
        ],
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.success).toBe(true)
      expect(body.mock_project_summary).toEqual({
        created: 2, // added(1) + updated(1)
        archived: 2, // deleted
      })
    })
  })

  // ==============================
  // Archive 動作 (Req 9.4)
  // ==============================
  describe("同期元に存在しない案件の archive", () => {
    it("同期元に存在しない案件が archived になる（deleted count > 0）", async () => {
      setupDualRpcMock({ added: 0, updated: 0, deleted: 3 })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )

      const request = createRequest({
        contents: validContents,
        commit_hash: "abc123",
        mock_projects: [
          {
            slug: "project-still-active",
            title: "まだ有効な案件",
            genre: "engineering",
            order: 1,
            status: "active",
          },
        ],
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.success).toBe(true)
      // deleted=3 は sync_mock_project_data RPC がアーカイブした案件数
      expect(body.mock_project_summary.archived).toBe(3)
    })
  })

  // ==============================
  // genre フィールドの同期 (Req 9.8)
  // ==============================
  describe("genre フィールドの同期", () => {
    it("genre フィールドが正しく同期データに含まれる", async () => {
      setupDualRpcMock({ added: 2, updated: 0, deleted: 0 })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )

      const request = createRequest({
        contents: validContents,
        commit_hash: "abc123",
        mock_projects: [
          {
            slug: "eng-project",
            title: "エンジニアリング案件",
            genre: "engineering",
            order: 1,
            status: "active",
          },
          {
            slug: "design-project",
            title: "デザイン案件",
            genre: "design",
            order: 2,
            status: "active",
          },
        ],
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // RPC 呼び出し時の p_mock_projects に genre が含まれていることを検証
      const mockProjectRpcCall = mockRpc.mock.calls.find(
        (call: unknown[]) => call[0] === "sync_mock_project_data"
      )
      expect(mockProjectRpcCall).toBeDefined()

      const rpcMockProjects = mockProjectRpcCall![1].p_mock_projects
      expect(rpcMockProjects[0].genre).toBe("engineering")
      expect(rpcMockProjects[1].genre).toBe("design")
    })
  })

  // ==============================
  // mock_projects 未指定の後方互換性
  // ==============================
  describe("mock_projects 未指定の後方互換性", () => {
    it("mock_projects フィールドが存在しない場合は mock_project_summary を返さない", async () => {
      mockRpc.mockResolvedValue({
        data: {
          version_id: "version-uuid-1",
          changes_summary: { added: 1, updated: 0, deleted: 0 },
          changed_paths: [],
        },
        error: null,
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )

      const request = createRequest({
        contents: validContents,
        commit_hash: "abc123",
      })

      const response = await POST(request)
      const body = await response.json()

      expect(body.success).toBe(true)
      expect(body.mock_project_summary).toBeUndefined()
    })
  })

  // ==============================
  // エラーハンドリング
  // ==============================
  describe("エラーハンドリング", () => {
    it("sync_mock_project_data RPC エラー時は 500 を返す", async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === "sync_content_version") {
          return Promise.resolve({
            data: {
              version_id: "version-uuid-1",
              changes_summary: { added: 1, updated: 0, deleted: 0 },
              changed_paths: [],
            },
            error: null,
          })
        }
        if (name === "sync_mock_project_data") {
          return Promise.resolve({
            data: null,
            error: { message: "模擬案件同期に失敗しました" },
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )

      const request = createRequest({
        contents: validContents,
        commit_hash: "abc123",
        mock_projects: [
          {
            slug: "project-1",
            title: "模擬案件1",
            genre: "engineering",
            order: 1,
            status: "active",
          },
        ],
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.errors).toBeDefined()
      expect(body.errors.some((e: string) => e.includes("模擬案件"))).toBe(
        true
      )
    })

    it("mock_projects のバリデーションエラー: genre が不正な場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )

      const request = createRequest({
        contents: validContents,
        commit_hash: "abc123",
        mock_projects: [
          {
            slug: "project-1",
            title: "模擬案件1",
            genre: "invalid_genre",
            order: 1,
            status: "active",
          },
        ],
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.errors.some((e: string) => e.includes("genre"))).toBe(true)
    })

    it("mock_projects のバリデーションエラー: slug が不足の場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )

      const request = createRequest({
        contents: validContents,
        commit_hash: "abc123",
        mock_projects: [
          {
            title: "模擬案件1",
            genre: "engineering",
            order: 1,
            status: "active",
          },
        ],
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.success).toBe(false)
      expect(body.errors.some((e: string) => e.includes("slug"))).toBe(true)
    })
  })
})
