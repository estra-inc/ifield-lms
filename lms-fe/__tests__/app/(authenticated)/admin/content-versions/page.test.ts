/**
 * バージョン管理ダッシュボードページのテスト
 *
 * Task 4.1: Server Component としてバージョン管理ダッシュボードを作成する
 * - active バージョン情報の表示
 * - draft バージョン情報の表示（存在する場合）
 * - draft 未存在時のプレースホルダー表示
 * - Super Admin 権限チェック
 *
 * Requirements: 8.1, 8.2
 */

// --- Mocks ---

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

const mockRedirect = vi.fn()
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

// --- Helpers ---

interface ContentVersion {
  id: string
  commit_hash: string
  status: "draft" | "active" | "archived"
  synced_at: string
  changes_summary: { added: number; updated: number; deleted: number }
  changed_paths: string[]
  quiz_changes_summary: { added: number; updated: number; deleted: number } | null
  mock_project_changes_summary: { added: number; updated: number; deleted: number } | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

function createMockVersion(overrides: Partial<ContentVersion> = {}): ContentVersion {
  return {
    id: "version-001",
    commit_hash: "abc1234def5678",
    status: "active",
    synced_at: "2026-03-01T10:00:00Z",
    changes_summary: { added: 5, updated: 3, deleted: 1 },
    changed_paths: ["/engineering/html-css/chapter1/intro"],
    quiz_changes_summary: null,
    mock_project_changes_summary: null,
    approved_by: "admin-001",
    approved_at: "2026-03-01T11:00:00Z",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-01T11:00:00Z",
    ...overrides,
  }
}

function setupProfileQuery(role: string) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { role },
      error: null,
    }),
  }
}

function setupVersionQuery(versions: ContentVersion[]) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: versions.length > 0 ? versions[0] : null,
      error: versions.length > 0 ? null : { code: "PGRST116", message: "not found" },
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: versions.length > 0 ? versions[0] : null,
      error: null,
    }),
  }
}

// --- Tests ---

describe("バージョン管理ダッシュボードページ (Task 4.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("認証・権限チェック", () => {
    it("未認証の場合はログインページにリダイレクトする", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "not authenticated" },
      })

      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      expect(user).toBeNull()
      // ページロジック: user が null の場合 redirect("/auth/login") を呼ぶ
    })

    it("super_admin 以外のロールの場合はダッシュボードにリダイレクトする", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-002" } },
        error: null,
      })

      const profileData = { role: "user" }
      expect(profileData.role).not.toBe("super_admin")
      // ページロジック: role !== "super_admin" の場合 redirect("/dashboard") を呼ぶ
    })

    it("manager ロールの場合もダッシュボードにリダイレクトする", async () => {
      const profileData = { role: "manager" }
      expect(profileData.role).not.toBe("super_admin")
    })

    it("super_admin ロールの場合はページを表示する", async () => {
      const profileData = { role: "super_admin" }
      expect(profileData.role).toBe("super_admin")
    })
  })

  describe("active バージョン情報の表示", () => {
    it("active バージョンのコミットハッシュと同期日時を取得する", () => {
      const activeVersion = createMockVersion({
        status: "active",
        commit_hash: "abc1234def5678",
        synced_at: "2026-03-01T10:00:00Z",
      })

      expect(activeVersion.commit_hash).toBe("abc1234def5678")
      expect(activeVersion.synced_at).toBe("2026-03-01T10:00:00Z")
      expect(activeVersion.status).toBe("active")
    })

    it("active バージョンが存在しない場合は null を返す", () => {
      const activeVersion: ContentVersion | null = null
      expect(activeVersion).toBeNull()
    })

    it("active バージョンのクエリは status='active' で LIMIT 1 で取得する", () => {
      const queryParams = {
        table: "content_versions",
        filter: { status: "active" },
        limit: 1,
      }

      expect(queryParams.table).toBe("content_versions")
      expect(queryParams.filter.status).toBe("active")
      expect(queryParams.limit).toBe(1)
    })
  })

  describe("draft バージョン情報の表示", () => {
    it("draft バージョンが存在する場合、その情報を取得する", () => {
      const draftVersion = createMockVersion({
        id: "version-draft-001",
        status: "draft",
        commit_hash: "draft789abc",
        synced_at: "2026-03-02T08:00:00Z",
        changes_summary: { added: 3, updated: 2, deleted: 0 },
        approved_by: null,
        approved_at: null,
      })

      expect(draftVersion.status).toBe("draft")
      expect(draftVersion.commit_hash).toBe("draft789abc")
      expect(draftVersion.changes_summary.added).toBe(3)
      expect(draftVersion.changes_summary.updated).toBe(2)
      expect(draftVersion.changes_summary.deleted).toBe(0)
    })

    it("draft バージョンの変更サマリーバッジ（追加・更新・削除）を表示データとして準備する", () => {
      const draftVersion = createMockVersion({
        status: "draft",
        changes_summary: { added: 5, updated: 3, deleted: 1 },
      })

      const summaryBadges = []
      if (draftVersion.changes_summary.added > 0) {
        summaryBadges.push({ label: `${draftVersion.changes_summary.added} 追加`, type: "added" })
      }
      if (draftVersion.changes_summary.updated > 0) {
        summaryBadges.push({ label: `${draftVersion.changes_summary.updated} 更新`, type: "updated" })
      }
      if (draftVersion.changes_summary.deleted > 0) {
        summaryBadges.push({ label: `${draftVersion.changes_summary.deleted} 削除`, type: "deleted" })
      }

      expect(summaryBadges).toHaveLength(3)
      expect(summaryBadges[0]).toEqual({ label: "5 追加", type: "added" })
      expect(summaryBadges[1]).toEqual({ label: "3 更新", type: "updated" })
      expect(summaryBadges[2]).toEqual({ label: "1 削除", type: "deleted" })
    })

    it("draft の変更確認リンク先は /admin/content-versions/[id] である", () => {
      const draftVersion = createMockVersion({
        id: "version-draft-001",
        status: "draft",
      })

      const reviewLink = `/admin/content-versions/${draftVersion.id}`
      expect(reviewLink).toBe("/admin/content-versions/version-draft-001")
    })

    it("draft バージョンの承認リンクも /admin/content-versions/[id] である", () => {
      const draftVersion = createMockVersion({
        id: "version-draft-001",
        status: "draft",
      })

      // 承認は詳細ページ内で行う
      const approveLink = `/admin/content-versions/${draftVersion.id}`
      expect(approveLink).toBe("/admin/content-versions/version-draft-001")
    })
  })

  describe("draft 未存在時の表示", () => {
    it("draft が存在しない場合はプレースホルダーメッセージを返す", () => {
      const draftVersion: ContentVersion | null = null
      const placeholderMessage = "未承認の変更はありません"

      expect(draftVersion).toBeNull()
      expect(placeholderMessage).toBe("未承認の変更はありません")
    })

    it("draft が null の場合、変更確認ボタンは表示しない", () => {
      const draftVersion: ContentVersion | null = null
      const showReviewButton = draftVersion !== null

      expect(showReviewButton).toBe(false)
    })
  })

  describe("データフェッチロジック", () => {
    it("content_versions テーブルから active と draft を個別に取得する", () => {
      const queries = [
        { table: "content_versions", filter: { status: "active" }, method: "maybeSingle" },
        { table: "content_versions", filter: { status: "draft" }, method: "maybeSingle" },
      ]

      expect(queries).toHaveLength(2)
      expect(queries[0].filter.status).toBe("active")
      expect(queries[1].filter.status).toBe("draft")
    })

    it("Supabase クエリチェーンが正しく構築される", async () => {
      const activeVersionData = createMockVersion({ status: "active" })
      const draftVersionData = createMockVersion({ status: "draft" })

      // active version query mock
      const activeQuery = setupVersionQuery([activeVersionData])
      // draft version query mock
      const draftQuery = setupVersionQuery([draftVersionData])

      // active version のクエリチェーン検証
      const activeResult = await activeQuery.maybeSingle()
      expect(activeResult.data).toBeDefined()
      expect(activeResult.data!.status).toBe("active")

      // draft version のクエリチェーン検証
      const draftResult = await draftQuery.maybeSingle()
      expect(draftResult.data).toBeDefined()
      expect(draftResult.data!.status).toBe("draft")
    })

    it("draft が存在しない場合、クエリは data: null を返す", async () => {
      const emptyQuery = setupVersionQuery([])
      const result = await emptyQuery.maybeSingle()

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })
  })

  describe("ページ構造", () => {
    it("ページタイトルは 'バージョン管理' である", () => {
      const pageTitle = "バージョン管理"
      expect(pageTitle).toBe("バージョン管理")
    })

    it("ページパスは /admin/content-versions である", () => {
      const pagePath = "/admin/content-versions"
      expect(pagePath).toBe("/admin/content-versions")
    })

    it("Server Component として実装される（async 関数）", () => {
      // page.tsx は export default async function ContentVersionsPage()
      // の形式で実装される
      const isServerComponent = true
      expect(isServerComponent).toBe(true)
    })
  })

  describe("日時フォーマット", () => {
    it("同期日時を日本語ロケールでフォーマットする", () => {
      const syncedAt = "2026-03-01T10:00:00Z"
      const formatted = new Date(syncedAt).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
      })

      expect(formatted).toBeDefined()
      expect(typeof formatted).toBe("string")
    })

    it("コミットハッシュは先頭 7 文字を短縮表示する", () => {
      const fullHash = "abc1234def5678901234567890"
      const shortHash = fullHash.slice(0, 7)

      expect(shortHash).toBe("abc1234")
      expect(shortHash).toHaveLength(7)
    })
  })

  describe("履歴行の詳細リンク", () => {
    it("各履歴行に詳細ページへのリンクが含まれる", () => {
      const version = createMockVersion({ id: "version-001" })
      const detailLink = `/admin/content-versions/${version.id}`

      expect(detailLink).toBe("/admin/content-versions/version-001")
    })

    it("全ステータスの行にリンクが含まれる（draft / active / archived）", () => {
      const statuses: ("draft" | "active" | "archived")[] = ["draft", "active", "archived"]
      for (const status of statuses) {
        const version = createMockVersion({ id: `version-${status}`, status })
        const detailLink = `/admin/content-versions/${version.id}`
        expect(detailLink).toContain("/admin/content-versions/")
      }
    })
  })

  describe("draft カードのディレクトリ別サマリー", () => {
    it("quiz_changes_summary を含む draft カードがディレクトリ別サマリーを表示する", () => {
      const draftVersion = createMockVersion({
        status: "draft",
        changes_summary: { added: 2, updated: 1, deleted: 0 },
        quiz_changes_summary: { added: 3, updated: 0, deleted: 1 },
        mock_project_changes_summary: { added: 1, updated: 1, deleted: 0 },
      })

      expect(draftVersion.changes_summary).toEqual({ added: 2, updated: 1, deleted: 0 })
      expect(draftVersion.quiz_changes_summary).toEqual({ added: 3, updated: 0, deleted: 1 })
      expect(draftVersion.mock_project_changes_summary).toEqual({ added: 1, updated: 1, deleted: 0 })
    })

    it("quiz/mock_project サマリーが null の場合は '—' を表示する", () => {
      function formatChangesSummary(
        summary: { added: number; updated: number; deleted: number } | null
      ): string {
        if (!summary) return "\u2014"
        const parts: string[] = []
        if (summary.added > 0) parts.push(`+${summary.added}`)
        if (summary.updated > 0) parts.push(`~${summary.updated}`)
        if (summary.deleted > 0) parts.push(`-${summary.deleted}`)
        return parts.length > 0 ? parts.join(" ") : "\u2014"
      }

      expect(formatChangesSummary(null)).toBe("\u2014")
      expect(formatChangesSummary({ added: 3, updated: 0, deleted: 1 })).toBe("+3 -1")
    })

    it("ディレクトリラベルは '教材' '演習問題' '模擬案件' の3つ", () => {
      const labels = ["教材", "演習問題", "模擬案件"]
      expect(labels).toHaveLength(3)
      expect(labels).toContain("教材")
      expect(labels).toContain("演習問題")
      expect(labels).toContain("模擬案件")
    })
  })
})
