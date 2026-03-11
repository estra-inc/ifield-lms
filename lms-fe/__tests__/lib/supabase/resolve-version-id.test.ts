/**
 * resolveVersionId ユーティリティのテスト
 *
 * searchParams の version_id パラメータを処理し、
 * Super Admin の場合のみ指定バージョンを使用する。
 * 非 Super Admin や無効な UUID の場合は active バージョンにフォールバックする。
 *
 * Task: 6.2
 * Requirements: 3.3, 3.5, 7.1
 */

import { resolveVersionId, isValidUUID } from "@/lib/supabase/content-version"

// --- モック定義 ---

const mockFrom = vi.fn()
const mockGetUser = vi.fn()

const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
  },
  from: mockFrom,
}

// --- ヘルパー ---

function setupActiveVersionQuery(activeVersionId: string | null) {
  // getActiveVersionId は content_versions テーブルをクエリする
  const versionChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: activeVersionId ? { id: activeVersionId } : null,
      error: null,
    }),
  }
  return versionChain
}

function createProfileChain(role: string) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { role },
      error: null,
    }),
  }
}

function createProfileChainError() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: null,
      error: { message: "not found" },
    }),
  }
}

// --- テスト ---

describe("isValidUUID", () => {
  it("正しい UUID 形式を受け付ける", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
  })

  it("大文字の UUID を受け付ける", () => {
    expect(isValidUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true)
  })

  it("ハイフンなしの文字列を拒否する", () => {
    expect(isValidUUID("550e8400e29b41d4a716446655440000")).toBe(false)
  })

  it("空文字を拒否する", () => {
    expect(isValidUUID("")).toBe(false)
  })

  it("不正な文字列を拒否する", () => {
    expect(isValidUUID("invalid-uuid")).toBe(false)
  })

  it("SQL インジェクションを拒否する", () => {
    expect(isValidUUID("'; DROP TABLE contents; --")).toBe(false)
  })
})

describe("resolveVersionId", () => {
  const ACTIVE_VERSION_ID = "550e8400-e29b-41d4-a716-446655440000"
  const DRAFT_VERSION_ID = "660e8400-e29b-41d4-a716-446655440001"
  const USER_ID = "user-uuid-0000-0000-000000000001"

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    })
  })

  describe("version_id パラメータなし", () => {
    it("version_id が未指定の場合、active バージョン ID を返す", async () => {
      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        {}
      )

      expect(result).toBe(ACTIVE_VERSION_ID)
    })

    it("version_id が空文字の場合、active バージョン ID を返す", async () => {
      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: "" }
      )

      expect(result).toBe(ACTIVE_VERSION_ID)
    })
  })

  describe("version_id パラメータの UUID バリデーション", () => {
    it("有効な UUID 形式の version_id を Super Admin が指定した場合、その ID を返す", async () => {
      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      const profileChain = createProfileChain("super_admin")

      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        if (table === "profiles") return profileChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: DRAFT_VERSION_ID }
      )

      expect(result).toBe(DRAFT_VERSION_ID)
    })

    it("無効な UUID 形式の場合、active バージョン ID にフォールバックする", async () => {
      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: "invalid-uuid" }
      )

      expect(result).toBe(ACTIVE_VERSION_ID)
      // プロフィールクエリは実行されない（UUID バリデーション前に弾く）
      expect(mockFrom).not.toHaveBeenCalledWith("profiles")
    })

    it("UUID に似た文字列だが形式が不正な場合、フォールバックする", async () => {
      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: "550e8400e29b41d4a716446655440000" }
      )

      expect(result).toBe(ACTIVE_VERSION_ID)
    })

    it("大文字の UUID も受け付ける", async () => {
      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      const profileChain = createProfileChain("super_admin")

      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        if (table === "profiles") return profileChain
        return versionChain
      })

      const upperCaseUUID = "550E8400-E29B-41D4-A716-446655440000"
      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: upperCaseUUID }
      )

      expect(result).toBe(upperCaseUUID)
    })

    it("SQL インジェクションを含む文字列を拒否する", async () => {
      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: "'; DROP TABLE contents; --" }
      )

      expect(result).toBe(ACTIVE_VERSION_ID)
    })
  })

  describe("Super Admin 権限チェック", () => {
    it("Super Admin の場合、指定された version_id を返す", async () => {
      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      const profileChain = createProfileChain("super_admin")

      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        if (table === "profiles") return profileChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: DRAFT_VERSION_ID }
      )

      expect(result).toBe(DRAFT_VERSION_ID)
      expect(mockFrom).toHaveBeenCalledWith("profiles")
    })

    it("User ロールの場合、active バージョン ID にフォールバックする", async () => {
      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      const profileChain = createProfileChain("user")

      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        if (table === "profiles") return profileChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: DRAFT_VERSION_ID }
      )

      expect(result).toBe(ACTIVE_VERSION_ID)
    })

    it("Manager ロールの場合、active バージョン ID にフォールバックする", async () => {
      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      const profileChain = createProfileChain("manager")

      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        if (table === "profiles") return profileChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: DRAFT_VERSION_ID }
      )

      expect(result).toBe(ACTIVE_VERSION_ID)
    })

    it("プロフィール取得エラーの場合、active バージョン ID にフォールバックする", async () => {
      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      const profileChain = createProfileChainError()

      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        if (table === "profiles") return profileChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: DRAFT_VERSION_ID }
      )

      expect(result).toBe(ACTIVE_VERSION_ID)
    })

    it("未認証ユーザーの場合、active バージョン ID にフォールバックする", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const versionChain = setupActiveVersionQuery(ACTIVE_VERSION_ID)
      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: DRAFT_VERSION_ID }
      )

      expect(result).toBe(ACTIVE_VERSION_ID)
      // 未認証の場合、プロフィールクエリは実行されない
      expect(mockFrom).not.toHaveBeenCalledWith("profiles")
    })
  })

  describe("active バージョンが存在しない場合", () => {
    it("version_id 指定なし + active なしの場合、null を返す", async () => {
      const versionChain = setupActiveVersionQuery(null)
      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        {}
      )

      expect(result).toBeNull()
    })

    it("Super Admin が version_id を指定 + active なしの場合、指定 version_id を返す", async () => {
      const versionChain = setupActiveVersionQuery(null)
      const profileChain = createProfileChain("super_admin")

      mockFrom.mockImplementation((table: string) => {
        if (table === "content_versions") return versionChain
        if (table === "profiles") return profileChain
        return versionChain
      })

      const result = await resolveVersionId(
        mockSupabaseClient as any,
        { version_id: DRAFT_VERSION_ID }
      )

      expect(result).toBe(DRAFT_VERSION_ID)
    })
  })
})
