/**
 * POST /api/admin/sync-curriculums 模擬案件同期拡張のテスト
 *
 * Task 3.1: 既存の同期APIに模擬案件同期処理を追加
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.7, 9.8
 *
 * - mock_projects フィールドがオプショナルで受け取れること
 * - mock_projects フィールドが存在する場合のみ sync_mock_project_data RPC を呼び出すこと
 * - 後方互換性: mock_projects フィールドが無い場合は既存動作に影響しないこと
 * - レスポンスに mock_project_summary を追加すること
 * - mock_projects 配列のバリデーション
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
    body: "# はじめに",
    genre: "engineering",
    tutorial: "html-css-basics",
    chapter: "chapter1",
    section: "intro",
    content_type: "section" as const,
    order: 1,
  },
]

const validMockProjects = [
  {
    slug: "ec-site-project",
    title: "EC サイト構築案件",
    description: "ECサイトをゼロから構築する模擬案件",
    requirements: "# 要件\n- 商品一覧ページの実装\n- カート機能の実装",
    evaluation_items: [
      {
        id: "eval-1",
        category: "コード品質",
        criteria: "TypeScript の型安全性が確保されている",
        weight: 30,
      },
    ],
    genre: "engineering" as const,
    order: 1,
    status: "active" as const,
  },
  {
    slug: "portfolio-project",
    title: "ポートフォリオサイト",
    description: "ポートフォリオサイトのデザインと実装",
    requirements: null,
    evaluation_items: [],
    genre: "design" as const,
    order: 2,
    status: "active" as const,
  },
]

const validPayloadWithMockProjects = {
  contents: validContents,
  mock_projects: validMockProjects,
  commit_hash: "abc123def456",
}

const validPayloadWithoutMockProjects = {
  contents: validContents,
  commit_hash: "abc123def456",
}

const validPayloadWithAll = {
  contents: validContents,
  quizzes: [
    {
      file_path: "engineering/html-css-basics/chapter1/_quiz.json",
      slug: "html-basics-quiz",
      section: "intro",
      title: "HTML基礎 確認テスト",
      genre: "engineering",
      tutorial: "html-css-basics",
      chapter: "chapter1",
      questions: [
        {
          id: "q1",
          type: "single",
          text: "テスト問題",
          options: [
            { id: "a", text: "選択肢A" },
            { id: "b", text: "選択肢B" },
          ],
          correct: "a",
          explanation: "解説テキスト",
        },
      ],
    },
  ],
  mock_projects: validMockProjects,
  commit_hash: "abc123def456",
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

/** sync_content_version, sync_quiz_data, sync_mock_project_data の成功レスポンスモック */
function setupAllSyncSuccess(versionId = "test-version-uuid") {
  mockRpc.mockImplementation((funcName: string) => {
    if (funcName === "sync_content_version") {
      return Promise.resolve({
        data: {
          version_id: versionId,
          changes_summary: { added: 1, updated: 0, deleted: 0 },
          changed_paths: [],
        },
        error: null,
      })
    }
    if (funcName === "sync_quiz_data") {
      return Promise.resolve({
        data: {
          quiz_changes_summary: { added: 1, updated: 0, deleted: 0 },
        },
        error: null,
      })
    }
    if (funcName === "sync_mock_project_data") {
      return Promise.resolve({
        data: {
          mock_project_changes_summary: { added: 2, updated: 0, deleted: 0 },
        },
        error: null,
      })
    }
    return Promise.resolve({ data: null, error: { message: "Unknown RPC" } })
  })
}

// --- テスト ---

describe("POST /api/admin/sync-curriculums - 模擬案件同期拡張 (Task 3.1)", () => {
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
  // 後方互換性
  // ==============================
  describe("後方互換性 (REQ-9.1)", () => {
    it("mock_projects フィールドが存在しない場合も正常にレスポンスを返す", async () => {
      setupAllSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithoutMockProjects)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it("mock_projects フィールドが存在しない場合は sync_mock_project_data RPC を呼び出さない", async () => {
      setupAllSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithoutMockProjects)
      await POST(request)

      // sync_content_version のみ呼ばれる
      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(mockRpc).toHaveBeenCalledWith(
        "sync_content_version",
        expect.any(Object)
      )
    })

    it("mock_projects フィールドが存在しない場合は mock_project_summary がレスポンスに含まれない", async () => {
      setupAllSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithoutMockProjects)
      const response = await POST(request)
      const body = await response.json()

      expect(body.mock_project_summary).toBeUndefined()
    })
  })

  // ==============================
  // 模擬案件同期処理
  // ==============================
  describe("模擬案件同期処理 (REQ-9.1, 9.3, 9.4)", () => {
    it("mock_projects フィールドが存在する場合は sync_mock_project_data RPC を呼び出す", async () => {
      setupAllSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithMockProjects)
      await POST(request)

      expect(mockRpc).toHaveBeenCalledWith(
        "sync_mock_project_data",
        expect.any(Object)
      )
    })

    it("sync_mock_project_data RPC にコンテンツ同期で取得した version_id を渡す", async () => {
      setupAllSyncSuccess("my-version-id")

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithMockProjects)
      await POST(request)

      const mockProjectRpcCall = mockRpc.mock.calls.find(
        (call: unknown[]) => call[0] === "sync_mock_project_data"
      )
      expect(mockProjectRpcCall).toBeDefined()
      expect(mockProjectRpcCall![1].p_version_id).toBe("my-version-id")
    })

    it("sync_mock_project_data RPC に p_mock_projects パラメータを渡す", async () => {
      setupAllSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithMockProjects)
      await POST(request)

      const mockProjectRpcCall = mockRpc.mock.calls.find(
        (call: unknown[]) => call[0] === "sync_mock_project_data"
      )
      expect(mockProjectRpcCall).toBeDefined()
      expect(mockProjectRpcCall![1].p_mock_projects).toBeDefined()
      expect(Array.isArray(mockProjectRpcCall![1].p_mock_projects)).toBe(true)
      expect(mockProjectRpcCall![1].p_mock_projects).toHaveLength(2)
    })

    it("p_mock_projects に正しいフィールドが含まれている", async () => {
      setupAllSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithMockProjects)
      await POST(request)

      const mockProjectRpcCall = mockRpc.mock.calls.find(
        (call: unknown[]) => call[0] === "sync_mock_project_data"
      )
      const project = mockProjectRpcCall![1].p_mock_projects[0]
      expect(project.slug).toBe("ec-site-project")
      expect(project.title).toBe("EC サイト構築案件")
      expect(project.description).toBe("ECサイトをゼロから構築する模擬案件")
      expect(project.requirements).toContain("商品一覧ページの実装")
      expect(project.evaluation_items).toBeDefined()
      expect(project.genre).toBe("engineering")
      expect(project.order).toBe(1)
      expect(project.status).toBe("active")
    })

    it("mock_projects の空配列の場合は sync_mock_project_data RPC を呼び出さない", async () => {
      setupAllSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        mock_projects: [],
        commit_hash: "abc123",
      })
      await POST(request)

      // sync_content_version のみ呼ばれる
      const mockProjectCalls = mockRpc.mock.calls.filter(
        (call: unknown[]) => call[0] === "sync_mock_project_data"
      )
      expect(mockProjectCalls).toHaveLength(0)
    })
  })

  // ==============================
  // レスポンス形式
  // ==============================
  describe("レスポンス形式", () => {
    it("模擬案件同期成功時にレスポンスに mock_project_summary を含む", async () => {
      setupAllSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithMockProjects)
      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.mock_project_summary).toBeDefined()
      expect(body.mock_project_summary.created).toBeDefined()
      expect(body.mock_project_summary.archived).toBeDefined()
    })

    it("mock_project_summary.created が added + updated の合計である", async () => {
      mockRpc.mockImplementation((funcName: string) => {
        if (funcName === "sync_content_version") {
          return Promise.resolve({
            data: {
              version_id: "test-version",
              changes_summary: { added: 1, updated: 0, deleted: 0 },
              changed_paths: [],
            },
            error: null,
          })
        }
        if (funcName === "sync_mock_project_data") {
          return Promise.resolve({
            data: {
              mock_project_changes_summary: { added: 3, updated: 2, deleted: 1 },
            },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: { message: "Unknown" } })
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithMockProjects)
      const response = await POST(request)
      const body = await response.json()

      expect(body.mock_project_summary.created).toBe(5) // added(3) + updated(2)
      expect(body.mock_project_summary.archived).toBe(1) // deleted
    })
  })

  // ==============================
  // バリデーション
  // ==============================
  describe("mock_projects バリデーション (REQ-9.1)", () => {
    it("mock_projects が配列でない場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        mock_projects: "not-an-array",
        commit_hash: "abc123",
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
    })

    it("mock_projects アイテムの slug が不足している場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        mock_projects: [
          {
            // slug が欠落
            title: "テスト案件",
            genre: "engineering",
            order: 1,
            status: "active",
          },
        ],
        commit_hash: "abc123",
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.errors).toBeDefined()
      expect(body.errors.length).toBeGreaterThan(0)
    })

    it("mock_projects アイテムの title が不足している場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        mock_projects: [
          {
            slug: "test-project",
            // title が欠落
            genre: "engineering",
            order: 1,
            status: "active",
          },
        ],
        commit_hash: "abc123",
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
    })

    it("mock_projects アイテムの genre が不正な場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        mock_projects: [
          {
            slug: "test-project",
            title: "テスト案件",
            genre: "invalid-genre",
            order: 1,
            status: "active",
          },
        ],
        commit_hash: "abc123",
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
    })

    it("mock_projects アイテムの status が不正な場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        mock_projects: [
          {
            slug: "test-project",
            title: "テスト案件",
            genre: "engineering",
            order: 1,
            status: "invalid-status",
          },
        ],
        commit_hash: "abc123",
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
    })
  })

  // ==============================
  // エラーハンドリング
  // ==============================
  describe("模擬案件同期エラーハンドリング", () => {
    it("sync_mock_project_data RPC がエラーを返した場合は 500 を返す", async () => {
      mockRpc.mockImplementation((funcName: string) => {
        if (funcName === "sync_content_version") {
          return Promise.resolve({
            data: {
              version_id: "test-version",
              changes_summary: { added: 1, updated: 0, deleted: 0 },
              changed_paths: [],
            },
            error: null,
          })
        }
        if (funcName === "sync_mock_project_data") {
          return Promise.resolve({
            data: null,
            error: { message: "Mock project sync failed" },
          })
        }
        return Promise.resolve({ data: null, error: { message: "Unknown" } })
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithMockProjects)
      const response = await POST(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.errors).toBeDefined()
    })

    it("コンテンツ同期がエラーの場合は模擬案件同期を実行しない", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Content sync failed" },
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithMockProjects)
      await POST(request)

      const mockProjectCalls = mockRpc.mock.calls.filter(
        (call: unknown[]) => call[0] === "sync_mock_project_data"
      )
      expect(mockProjectCalls).toHaveLength(0)
    })
  })

  // ==============================
  // quizzes + mock_projects の共存
  // ==============================
  describe("quizzes と mock_projects の共存", () => {
    it("quizzes と mock_projects の両方が存在する場合、3つの RPC を全て呼び出す", async () => {
      setupAllSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithAll)
      await POST(request)

      expect(mockRpc).toHaveBeenCalledTimes(3)
      expect(mockRpc).toHaveBeenCalledWith(
        "sync_content_version",
        expect.any(Object)
      )
      expect(mockRpc).toHaveBeenCalledWith(
        "sync_quiz_data",
        expect.any(Object)
      )
      expect(mockRpc).toHaveBeenCalledWith(
        "sync_mock_project_data",
        expect.any(Object)
      )
    })

    it("quizzes と mock_projects の両方が成功した場合、レスポンスに両方のサマリを含む", async () => {
      setupAllSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithAll)
      const response = await POST(request)
      const body = await response.json()

      expect(body.success).toBe(true)
      expect(body.quiz_summary).toBeDefined()
      expect(body.mock_project_summary).toBeDefined()
    })
  })
})
