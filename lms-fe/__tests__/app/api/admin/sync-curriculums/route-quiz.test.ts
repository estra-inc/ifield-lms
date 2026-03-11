/**
 * POST /api/admin/sync-curriculums クイズ同期拡張のテスト
 *
 * Task 2.2: 既存の同期APIにクイズ同期処理を追加
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 6.5
 *
 * - quizzes フィールドがオプショナルで受け取れること
 * - quizzes フィールドが存在する場合のみ sync_quiz_data RPC を呼び出すこと
 * - 後方互換性: quizzes フィールドが無い場合は既存動作に影響しないこと
 * - レスポンスに quiz_summary を追加すること
 * - quizzes 配列のバリデーション
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

const validQuizzes = [
  {
    file_path: "engineering/html-css-basics/chapter1/_quiz.json",
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
]

const validPayloadWithQuizzes = {
  contents: validContents,
  quizzes: validQuizzes,
  commit_hash: "abc123def456",
}

const validPayloadWithoutQuizzes = {
  contents: validContents,
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

/** sync_content_version の成功レスポンスを返すモック設定 */
function setupContentSyncSuccess(versionId = "test-version-uuid") {
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
    return Promise.resolve({ data: null, error: { message: "Unknown RPC" } })
  })
}

// --- テスト ---

describe("POST /api/admin/sync-curriculums - クイズ同期拡張 (Task 2.2)", () => {
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
  describe("後方互換性 (REQ-1.1)", () => {
    it("quizzes フィールドが存在しない場合も正常にレスポンスを返す", async () => {
      setupContentSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithoutQuizzes)
      const response = await POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it("quizzes フィールドが存在しない場合は sync_quiz_data RPC を呼び出さない", async () => {
      setupContentSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithoutQuizzes)
      await POST(request)

      // sync_content_version のみ呼ばれる
      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(mockRpc).toHaveBeenCalledWith(
        "sync_content_version",
        expect.any(Object)
      )
    })

    it("quizzes フィールドが存在しない場合は quiz_summary がレスポンスに含まれない", async () => {
      setupContentSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithoutQuizzes)
      const response = await POST(request)
      const body = await response.json()

      expect(body.quiz_summary).toBeUndefined()
    })
  })

  // ==============================
  // クイズ同期処理
  // ==============================
  describe("クイズ同期処理 (REQ-1.2, 1.4, 6.5)", () => {
    it("quizzes フィールドが存在する場合は sync_quiz_data RPC を呼び出す", async () => {
      setupContentSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithQuizzes)
      await POST(request)

      // sync_content_version と sync_quiz_data の両方が呼ばれる
      expect(mockRpc).toHaveBeenCalledTimes(2)
      expect(mockRpc).toHaveBeenCalledWith(
        "sync_quiz_data",
        expect.any(Object)
      )
    })

    it("sync_quiz_data RPC にコンテンツ同期で取得した version_id を渡す", async () => {
      setupContentSyncSuccess("my-version-id")

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithQuizzes)
      await POST(request)

      const quizRpcCall = mockRpc.mock.calls.find(
        (call: unknown[]) => call[0] === "sync_quiz_data"
      )
      expect(quizRpcCall).toBeDefined()
      expect(quizRpcCall![1].p_version_id).toBe("my-version-id")
    })

    it("sync_quiz_data RPC に p_quizzes パラメータを渡す", async () => {
      setupContentSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithQuizzes)
      await POST(request)

      const quizRpcCall = mockRpc.mock.calls.find(
        (call: unknown[]) => call[0] === "sync_quiz_data"
      )
      expect(quizRpcCall).toBeDefined()
      expect(quizRpcCall![1].p_quizzes).toBeDefined()
      expect(Array.isArray(quizRpcCall![1].p_quizzes)).toBe(true)
      expect(quizRpcCall![1].p_quizzes).toHaveLength(1)
    })

    it("p_quizzes に正しいフィールドが含まれている", async () => {
      setupContentSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithQuizzes)
      await POST(request)

      const quizRpcCall = mockRpc.mock.calls.find(
        (call: unknown[]) => call[0] === "sync_quiz_data"
      )
      const quiz = quizRpcCall![1].p_quizzes[0]
      expect(quiz.file_path).toBe("engineering/html-css-basics/chapter1/_quiz.json")
      expect(quiz.section).toBe("intro")
      expect(quiz.title).toBe("HTML基礎 確認テスト")
      expect(quiz.genre).toBe("engineering")
      expect(quiz.tutorial).toBe("html-css-basics")
      expect(quiz.chapter).toBe("chapter1")
      expect(quiz.questions).toBeDefined()
    })
  })

  // ==============================
  // レスポンス形式
  // ==============================
  describe("レスポンス形式 (SyncResponseV3)", () => {
    it("クイズ同期成功時にレスポンスに quiz_summary を含む", async () => {
      setupContentSyncSuccess()

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithQuizzes)
      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.quiz_summary).toBeDefined()
      expect(body.quiz_summary.created).toBeDefined()
      expect(body.quiz_summary.archived).toBeDefined()
    })

    it("quiz_summary.created が added + updated の合計である", async () => {
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
        if (funcName === "sync_quiz_data") {
          return Promise.resolve({
            data: {
              quiz_changes_summary: { added: 2, updated: 1, deleted: 3 },
            },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: { message: "Unknown" } })
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithQuizzes)
      const response = await POST(request)
      const body = await response.json()

      expect(body.quiz_summary.created).toBe(3) // added(2) + updated(1)
      expect(body.quiz_summary.archived).toBe(3) // deleted
    })
  })

  // ==============================
  // クイズバリデーション
  // ==============================
  describe("quizzes バリデーション (REQ-1.1)", () => {
    it("quizzes が配列でない場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        quizzes: "not-an-array",
        commit_hash: "abc123",
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
    })

    it("quizzes アイテムの必須フィールドが不足している場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        quizzes: [
          {
            file_path: "test.json",
            // section, title, genre, tutorial, chapter, questions が欠落
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

    it("quizzes アイテムの questions が配列でない場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        quizzes: [
          {
            file_path: "test.json",
            section: "intro",
            title: "テスト",
            genre: "engineering",
            tutorial: "test",
            chapter: "ch1",
            questions: "not-an-array",
          },
        ],
        commit_hash: "abc123",
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.success).toBe(false)
    })

    it("questions 配列内の問題に必須フィールドが不足している場合は 400 を返す", async () => {
      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest({
        contents: validContents,
        quizzes: [
          {
            file_path: "test.json",
            section: "intro",
            title: "テスト",
            genre: "engineering",
            tutorial: "test",
            chapter: "ch1",
            questions: [
              {
                id: "q1",
                // type, text, options, correct が欠落
              },
            ],
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
  describe("クイズ同期エラーハンドリング", () => {
    it("sync_quiz_data RPC がエラーを返した場合は 500 を返す", async () => {
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
        if (funcName === "sync_quiz_data") {
          return Promise.resolve({
            data: null,
            error: { message: "Quiz sync failed" },
          })
        }
        return Promise.resolve({ data: null, error: { message: "Unknown" } })
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithQuizzes)
      const response = await POST(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.errors).toBeDefined()
    })

    it("コンテンツ同期がエラーの場合はクイズ同期を実行しない", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Content sync failed" },
      })

      const { POST } = await import(
        "@/app/api/admin/sync-curriculums/route"
      )
      const request = createRequest(validPayloadWithQuizzes)
      const response = await POST(request)

      expect(response.status).toBe(500)
      // sync_content_version のみ呼ばれ、sync_quiz_data は呼ばれない
      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(mockRpc).toHaveBeenCalledWith(
        "sync_content_version",
        expect.any(Object)
      )
    })
  })
})
