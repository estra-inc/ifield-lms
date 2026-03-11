/**
 * Task 12.3: タスク CRUD の結合テスト
 *
 * 既存の task-actions.test.ts の補完テスト。
 * 既存テストでは createTask に対する Super Admin のアクセスは検証済みだが、
 * updateTask、updateTaskStatus、deleteTask に対する Super Admin アクセスは未検証。
 * また、Manager ロールの updateTask/updateTaskStatus/deleteTask の拒否も
 * 明示的に結合テストの文脈で検証する。
 *
 * Requirements: 11.2, 11.4
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

// createAdminClient mock (required because actions.ts imports createAdminClient)
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: vi.fn() }),
}))

// ---- Helpers ----

const SUPER_ADMIN_USER = {
  id: "admin-1111-2222-3333-444444444444",
  email: "admin@example.com",
}

const MANAGER_USER = {
  id: "manager-1111-2222-3333-444444444444",
  email: "manager@example.com",
}

const TEST_TASK_ID = "task-aaaa-bbbb-cccc-dddddddddddd"
const TEST_ASSIGNMENT_ID = "assign-aaaa-bbbb-cccc-dddddddddddd"

function setupAuthenticated(user: { id: string; email: string }) {
  mockGetUser.mockResolvedValue({
    data: { user },
    error: null,
  })
}

function setupMockFrom(options: {
  role: "user" | "manager" | "super_admin"
  taskUpdateResult?: { data: unknown; error: unknown }
  taskDeleteResult?: { data: unknown; error: unknown }
}) {
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
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: TEST_TASK_ID,
                title: "テストタスク",
                description: null,
                status: "backlog",
                order: 0,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                options.taskUpdateResult ?? {
                  data: {
                    id: TEST_TASK_ID,
                    title: "更新済みタスク",
                    description: null,
                    status: "todo",
                    order: 0,
                  },
                  error: null,
                }
              ),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(
            options.taskDeleteResult ?? {
              data: null,
              error: null,
            }
          ),
        }),
      }
    }
    return {}
  })
}

// ---- Tests ----

describe("タスク CRUD: Super Admin アクセス (Task 12.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ==============================
  // Super Admin による更新操作
  // ==============================
  describe("Super Admin がタスクを編集可能であることの検証 (Req 11.4)", () => {
    it("Super Admin が updateTask でタスクを更新できる", async () => {
      setupAuthenticated(SUPER_ADMIN_USER)
      setupMockFrom({ role: "super_admin" })

      const { updateTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateTask(TEST_TASK_ID, "更新済みタスク", null)

      expect(result.success).toBe(true)
      expect(result.task?.title).toBe("更新済みタスク")
    })

    it("Super Admin が updateTaskStatus でタスクステータスを変更できる", async () => {
      setupAuthenticated(SUPER_ADMIN_USER)
      setupMockFrom({ role: "super_admin" })

      const { updateTaskStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateTaskStatus(TEST_TASK_ID, "todo", 0)

      expect(result.success).toBe(true)
      expect(result.task?.status).toBe("todo")
    })

    it("Super Admin が deleteTask でタスクを削除できる", async () => {
      setupAuthenticated(SUPER_ADMIN_USER)
      setupMockFrom({ role: "super_admin" })

      const { deleteTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await deleteTask(TEST_TASK_ID)

      expect(result.success).toBe(true)
    })
  })

  // ==============================
  // Manager による編集拒否（二重チェック）
  // ==============================
  describe("Manager がタスクを編集できないことの検証 (Req 11.2)", () => {
    /**
     * RLS ポリシーでの制御に加え、Server Action 側でもロールチェックを行う
     * 二重防御の検証。Manager は全 CRUD 操作が拒否される。
     *
     * createTask の Manager 拒否は task-actions.test.ts で検証済み。
     * ここでは updateTask / updateTaskStatus / deleteTask を検証する。
     */
    it("Manager が updateTask を実行すると権限エラーを返す", async () => {
      setupAuthenticated(MANAGER_USER)
      setupMockFrom({ role: "manager" })

      const { updateTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateTask(TEST_TASK_ID, "更新タイトル", null)

      expect(result.success).toBe(false)
      expect(result.message).toContain("権限")
    })

    it("Manager が updateTaskStatus を実行すると権限エラーを返す", async () => {
      setupAuthenticated(MANAGER_USER)
      setupMockFrom({ role: "manager" })

      const { updateTaskStatus } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await updateTaskStatus(TEST_TASK_ID, "todo", 0)

      expect(result.success).toBe(false)
      expect(result.message).toContain("権限")
    })

    it("Manager が deleteTask を実行すると権限エラーを返す", async () => {
      setupAuthenticated(MANAGER_USER)
      setupMockFrom({ role: "manager" })

      const { deleteTask } = await import(
        "@/app/(authenticated)/projects/actions"
      )
      const result = await deleteTask(TEST_TASK_ID)

      expect(result.success).toBe(false)
      expect(result.message).toContain("権限")
    })
  })
})
