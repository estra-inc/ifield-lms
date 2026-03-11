/**
 * startProject Server Action テスト
 *
 * Task 7.1: startProject Server Action の作成
 * Requirements: 3.1, 3.5, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4, 6.6
 *
 * - 認証チェック
 * - start_project RPC 呼び出し
 * - 排他制御違反のエラーハンドリング
 * - 成功時の revalidatePath
 * - termChanged の返却
 */

// ---- Mock Setup ----

const mockRevalidatePath = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

const mockGetUser = vi.fn()
const mockRpc = vi.fn()
const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  rpc: mockRpc,
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseClient),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: vi.fn() }),
}))

// ---- Helpers ----

const TEST_USER = {
  id: "user-1111-2222-3333-444444444444",
  email: "user@example.com",
}

const TEST_PROJECT_ID = "proj-aaaa-bbbb-cccc-dddddddddddd"

function setupAuthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: TEST_USER },
    error: null,
  })
}

function setupUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: "Not authenticated" },
  })
}

// ---- Tests ----

describe("startProject Server Action (Task 7.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("未認証の場合はエラーを返す", async () => {
    setupUnauthenticated()

    const { startProject } = await import(
      "@/app/(authenticated)/projects/actions"
    )
    const result = await startProject(TEST_PROJECT_ID)

    expect(result).toEqual({
      success: false,
      message: expect.stringContaining("認証"),
    })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("認証済みで start_project RPC を呼び出し成功する", async () => {
    setupAuthenticated()
    mockRpc.mockResolvedValue({
      data: { assignment_id: "assign-1", term_changed: false },
      error: null,
    })

    const { startProject } = await import(
      "@/app/(authenticated)/projects/actions"
    )
    const result = await startProject(TEST_PROJECT_ID)

    expect(result).toEqual({
      success: true,
      message: expect.any(String),
      termChanged: false,
    })
    expect(mockRpc).toHaveBeenCalledWith("start_project", {
      p_user_id: TEST_USER.id,
      p_project_id: TEST_PROJECT_ID,
    })
    expect(mockRevalidatePath).toHaveBeenCalled()
  })

  it("ターム移行が発生した場合に termChanged: true を返す", async () => {
    setupAuthenticated()
    mockRpc.mockResolvedValue({
      data: { assignment_id: "assign-2", term_changed: true },
      error: null,
    })

    const { startProject } = await import(
      "@/app/(authenticated)/projects/actions"
    )
    const result = await startProject(TEST_PROJECT_ID)

    expect(result).toEqual({
      success: true,
      message: expect.any(String),
      termChanged: true,
    })
  })

  it("排他制御違反（着手中案件あり）の場合はエラーを返す", async () => {
    setupAuthenticated()
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "USER_HAS_ACTIVE_PROJECT", code: "P0001" },
    })

    const { startProject } = await import(
      "@/app/(authenticated)/projects/actions"
    )
    const result = await startProject(TEST_PROJECT_ID)

    expect(result).toEqual({
      success: false,
      message: expect.stringContaining("進行中"),
    })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it("RPC で予期しないエラーが発生した場合は汎用エラーを返す", async () => {
    setupAuthenticated()
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Internal server error" },
    })

    const { startProject } = await import(
      "@/app/(authenticated)/projects/actions"
    )
    const result = await startProject(TEST_PROJECT_ID)

    expect(result).toEqual({
      success: false,
      message: expect.any(String),
    })
  })
})
