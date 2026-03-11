/**
 * Task CRUD Server Actions テスト
 *
 * Task 10.1: Task CRUD Server Actions の作成
 * Requirements: 11.2, 11.3, 11.4
 *
 * - createTask: タスク作成（認証チェック、ロール確認、デフォルトステータス backlog）
 * - updateTask: タスク更新（タイトル・説明の変更）
 * - updateTaskStatus: タスクステータス変更（status + order 更新）
 * - deleteTask: タスク削除（物理削除）
 * - ロール制御: User は自身の assignment のタスクのみ、Super Admin は全タスク編集可能、Manager は編集不可
 */

// ---- Mock Setup ----

const mockRevalidatePath = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
  rpc: mockRpc,
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseClient),
}))

// AdminClient mock (required because actions.ts imports createAdminClient)
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: vi.fn() }),
}))

// ---- Helpers ----

const TEST_USER = {
  id: "user-1111-2222-3333-444444444444",
  email: "user@example.com",
}

const SUPER_ADMIN_USER = {
  id: "admin-1111-2222-3333-444444444444",
  email: "admin@example.com",
}

const MANAGER_USER = {
  id: "manager-1111-2222-3333-444444444444",
  email: "manager@example.com",
}

const TEST_ASSIGNMENT_ID = "assign-aaaa-bbbb-cccc-dddddddddddd"
const TEST_TASK_ID = "task-aaaa-bbbb-cccc-dddddddddddd"

function setupAuthenticated(user: { id: string; email: string } = TEST_USER) {
  mockGetUser.mockResolvedValue({
    data: { user },
    error: null,
  })
}

function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  })
}

/**
 * 共通の mockFrom 実装を構築する
 *
 * profiles テーブルと project_tasks テーブルの両方をハンドリングする。
 * createTask は from("project_tasks") を2回呼ぶ（select で count + insert で作成）ため、
 * 呼び出し回数でどのチェーンを返すか分岐する。
 */
function setupMockFrom(options: {
  role: "user" | "manager" | "super_admin"
  taskInsertResult?: { data: unknown; error: unknown }
  taskUpdateResult?: { data: unknown; error: unknown }
  taskDeleteResult?: { data: unknown; error: unknown }
  taskSelectResult?: { data: unknown; error: unknown }
}) {
  let projectTasksCallCount = 0

  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: options.role },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === "project_tasks") {
      projectTasksCallCount++

      // createTask: 1st call = select (count existing tasks), 2nd call = insert
      // updateTask / updateTaskStatus: 1st call = update
      // deleteTask: 1st call = delete
      return {
        // For select chain: select("id").eq("assignment_id", ...).eq("status", ...)
        // Used by createTask to count existing tasks
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(
              options.taskSelectResult ?? { data: [], error: null }
            ),
          }),
        }),
        // For insert chain: insert({...}).select("...").single()
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              options.taskInsertResult ?? { data: null, error: null }
            ),
          }),
        }),
        // For update chain: update({...}).eq("id", ...).select("...").single()
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                options.taskUpdateResult ?? { data: null, error: null }
              ),
            }),
          }),
        }),
        // For delete chain: delete().eq("id", ...)
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(
            options.taskDeleteResult ?? { data: null, error: null }
          ),
        }),
      }
    }
    return {}
  })
}

// ---- Tests ----

describe("Task CRUD Server Actions (Task 10.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ==============================
  // createTask
  // ==============================
  describe("createTask", () => {
    it("未認証の場合はエラーを返す", async () => {
      setupUnauthenticated()

      const { createTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await createTask(TEST_ASSIGNMENT_ID, "テストタスク", null, "backlog")

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("認証"),
      })
    })

    it("Manager ロールの場合はエラーを返す", async () => {
      setupAuthenticated(MANAGER_USER)
      setupMockFrom({ role: "manager" })

      const { createTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await createTask(TEST_ASSIGNMENT_ID, "テストタスク", null, "backlog")

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
    })

    it("User ロールでタスクを作成できる", async () => {
      setupAuthenticated(TEST_USER)
      setupMockFrom({
        role: "user",
        taskSelectResult: { data: [], error: null },
        taskInsertResult: {
          data: {
            id: TEST_TASK_ID,
            title: "テストタスク",
            description: null,
            status: "backlog",
            order: 0,
          },
          error: null,
        },
      })

      const { createTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await createTask(TEST_ASSIGNMENT_ID, "テストタスク", null, "backlog")

      expect(result.success).toBe(true)
      expect(result.task).toBeDefined()
      expect(result.task?.title).toBe("テストタスク")
      expect(result.task?.status).toBe("backlog")
    })

    it("Super Admin ロールでタスクを作成できる", async () => {
      setupAuthenticated(SUPER_ADMIN_USER)
      setupMockFrom({
        role: "super_admin",
        taskSelectResult: { data: [], error: null },
        taskInsertResult: {
          data: {
            id: TEST_TASK_ID,
            title: "管理者タスク",
            description: "詳細説明",
            status: "backlog",
            order: 0,
          },
          error: null,
        },
      })

      const { createTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await createTask(
        TEST_ASSIGNMENT_ID,
        "管理者タスク",
        "詳細説明",
        "backlog"
      )

      expect(result.success).toBe(true)
      expect(result.task?.title).toBe("管理者タスク")
      expect(result.task?.description).toBe("詳細説明")
    })

    it("タイトルが空の場合はエラーを返す", async () => {
      // タイトルバリデーションは認証前に実行される
      const { createTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await createTask(TEST_ASSIGNMENT_ID, "", null, "backlog")

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("タイトル"),
      })
    })

    it("成功時に revalidatePath を呼び出す", async () => {
      setupAuthenticated(TEST_USER)
      setupMockFrom({
        role: "user",
        taskSelectResult: { data: [], error: null },
        taskInsertResult: {
          data: {
            id: TEST_TASK_ID,
            title: "テストタスク",
            description: null,
            status: "backlog",
            order: 0,
          },
          error: null,
        },
      })

      const { createTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      await createTask(TEST_ASSIGNMENT_ID, "テストタスク", null, "backlog")

      expect(mockRevalidatePath).toHaveBeenCalledWith("/projects")
    })

    it("DB エラーが発生した場合はエラーを返す", async () => {
      setupAuthenticated(TEST_USER)
      setupMockFrom({
        role: "user",
        taskSelectResult: { data: [], error: null },
        taskInsertResult: {
          data: null,
          error: { message: "Insert failed" },
        },
      })

      const { createTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await createTask(TEST_ASSIGNMENT_ID, "テストタスク", null, "backlog")

      expect(result.success).toBe(false)
    })
  })

  // ==============================
  // updateTask
  // ==============================
  describe("updateTask", () => {
    it("未認証の場合はエラーを返す", async () => {
      setupUnauthenticated()

      const { updateTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateTask(TEST_TASK_ID, "更新タイトル", null)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("認証"),
      })
    })

    it("Manager ロールの場合はエラーを返す", async () => {
      setupAuthenticated(MANAGER_USER)
      setupMockFrom({ role: "manager" })

      const { updateTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateTask(TEST_TASK_ID, "更新タイトル", null)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
    })

    it("User ロールでタスクを更新できる", async () => {
      setupAuthenticated(TEST_USER)
      setupMockFrom({
        role: "user",
        taskUpdateResult: {
          data: {
            id: TEST_TASK_ID,
            title: "更新タイトル",
            description: "更新説明",
            status: "backlog",
            order: 0,
          },
          error: null,
        },
      })

      const { updateTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateTask(TEST_TASK_ID, "更新タイトル", "更新説明")

      expect(result.success).toBe(true)
      expect(result.task?.title).toBe("更新タイトル")
      expect(result.task?.description).toBe("更新説明")
    })

    it("タイトルが空の場合はエラーを返す", async () => {
      const { updateTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateTask(TEST_TASK_ID, "", null)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("タイトル"),
      })
    })

    it("成功時に revalidatePath を呼び出す", async () => {
      setupAuthenticated(TEST_USER)
      setupMockFrom({
        role: "user",
        taskUpdateResult: {
          data: {
            id: TEST_TASK_ID,
            title: "更新タイトル",
            description: null,
            status: "backlog",
            order: 0,
          },
          error: null,
        },
      })

      const { updateTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      await updateTask(TEST_TASK_ID, "更新タイトル", null)

      expect(mockRevalidatePath).toHaveBeenCalledWith("/projects")
    })
  })

  // ==============================
  // updateTaskStatus
  // ==============================
  describe("updateTaskStatus", () => {
    it("未認証の場合はエラーを返す", async () => {
      setupUnauthenticated()

      const { updateTaskStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateTaskStatus(TEST_TASK_ID, "todo", 0)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("認証"),
      })
    })

    it("Manager ロールの場合はエラーを返す", async () => {
      setupAuthenticated(MANAGER_USER)
      setupMockFrom({ role: "manager" })

      const { updateTaskStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateTaskStatus(TEST_TASK_ID, "todo", 0)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
    })

    it("User ロールでタスクステータスを変更できる", async () => {
      setupAuthenticated(TEST_USER)
      setupMockFrom({
        role: "user",
        taskUpdateResult: {
          data: {
            id: TEST_TASK_ID,
            title: "テストタスク",
            description: null,
            status: "in_progress",
            order: 1,
          },
          error: null,
        },
      })

      const { updateTaskStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateTaskStatus(TEST_TASK_ID, "in_progress", 1)

      expect(result.success).toBe(true)
      expect(result.task?.status).toBe("in_progress")
      expect(result.task?.order).toBe(1)
    })

    it("成功時に revalidatePath を呼び出す", async () => {
      setupAuthenticated(TEST_USER)
      setupMockFrom({
        role: "user",
        taskUpdateResult: {
          data: {
            id: TEST_TASK_ID,
            title: "テストタスク",
            description: null,
            status: "done",
            order: 0,
          },
          error: null,
        },
      })

      const { updateTaskStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      await updateTaskStatus(TEST_TASK_ID, "done", 0)

      expect(mockRevalidatePath).toHaveBeenCalledWith("/projects")
    })
  })

  // ==============================
  // deleteTask
  // ==============================
  describe("deleteTask", () => {
    it("未認証の場合はエラーを返す", async () => {
      setupUnauthenticated()

      const { deleteTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await deleteTask(TEST_TASK_ID)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("認証"),
      })
    })

    it("Manager ロールの場合はエラーを返す", async () => {
      setupAuthenticated(MANAGER_USER)
      setupMockFrom({ role: "manager" })

      const { deleteTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await deleteTask(TEST_TASK_ID)

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining("権限"),
      })
    })

    it("User ロールでタスクを削除できる", async () => {
      setupAuthenticated(TEST_USER)
      setupMockFrom({
        role: "user",
        taskDeleteResult: {
          data: null,
          error: null,
        },
      })

      const { deleteTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await deleteTask(TEST_TASK_ID)

      expect(result.success).toBe(true)
    })

    it("成功時に revalidatePath を呼び出す", async () => {
      setupAuthenticated(TEST_USER)
      setupMockFrom({
        role: "user",
        taskDeleteResult: {
          data: null,
          error: null,
        },
      })

      const { deleteTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      await deleteTask(TEST_TASK_ID)

      expect(mockRevalidatePath).toHaveBeenCalledWith("/projects")
    })

    it("DB エラーが発生した場合はエラーを返す", async () => {
      setupAuthenticated(TEST_USER)
      setupMockFrom({
        role: "user",
        taskDeleteResult: {
          data: null,
          error: { message: "Delete failed" },
        },
      })

      const { deleteTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await deleteTask(TEST_TASK_ID)

      expect(result.success).toBe(false)
    })
  })
})
