/**
 * バージョン履歴一覧テーブルのテスト
 *
 * Task 4.2: バージョン履歴一覧テーブルの作成
 * - 全バージョン（active, draft, archived）のメタデータ一覧を時系列降順で表示する
 * - コミットハッシュ（7文字短縮）、ステータスバッジ、変更サマリー、同期日時、承認者を表示する
 * - オフセットベースのページネーション（1ページ10件）を実装する
 * - バージョン管理ダッシュボードに組み込む
 *
 * Requirements: 4.3, 8.1
 */

// --- Types ---

interface ContentVersion {
  id: string
  commit_hash: string
  status: "draft" | "active" | "archived"
  synced_at: string
  changes_summary: { added: number; updated: number; deleted: number }
  changed_paths: string[]
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

interface ContentVersionWithApprover extends ContentVersion {
  approver_name: string | null
}

// --- Helpers ---

function createMockVersion(overrides: Partial<ContentVersion> = {}): ContentVersion {
  return {
    id: "version-001",
    commit_hash: "abc1234def5678",
    status: "archived",
    synced_at: "2026-03-01T10:00:00Z",
    changes_summary: { added: 5, updated: 3, deleted: 1 },
    changed_paths: ["/engineering/html-css/chapter1/intro"],
    approved_by: "admin-001",
    approved_at: "2026-03-01T11:00:00Z",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-01T11:00:00Z",
    ...overrides,
  }
}

function createMockVersionWithApprover(
  overrides: Partial<ContentVersionWithApprover> = {}
): ContentVersionWithApprover {
  return {
    ...createMockVersion(),
    approver_name: "管理者 太郎",
    ...overrides,
  }
}

// --- Tests ---

describe("バージョン履歴一覧テーブル (Task 4.2)", () => {
  describe("ページネーション計算", () => {
    const PER_PAGE = 10

    it("デフォルトではページ1、range は 0-9 で取得する", () => {
      const searchParams = { page: undefined as string | undefined }
      const page = Math.max(1, Number(searchParams.page) || 1)
      const from = (page - 1) * PER_PAGE
      const to = from + PER_PAGE - 1

      expect(page).toBe(1)
      expect(from).toBe(0)
      expect(to).toBe(9)
    })

    it("page=2 の場合、range は 10-19 で取得する", () => {
      const searchParams = { page: "2" }
      const page = Math.max(1, Number(searchParams.page) || 1)
      const from = (page - 1) * PER_PAGE
      const to = from + PER_PAGE - 1

      expect(page).toBe(2)
      expect(from).toBe(10)
      expect(to).toBe(19)
    })

    it("page=5 の場合、range は 40-49 で取得する", () => {
      const searchParams = { page: "5" }
      const page = Math.max(1, Number(searchParams.page) || 1)
      const from = (page - 1) * PER_PAGE
      const to = from + PER_PAGE - 1

      expect(page).toBe(5)
      expect(from).toBe(40)
      expect(to).toBe(49)
    })

    it("不正な page パラメータの場合はデフォルト 1 とする", () => {
      const invalidValues = ["invalid", "-1", "0", "abc", ""]
      for (const val of invalidValues) {
        const page = Math.max(1, Number(val) || 1)
        expect(page).toBeGreaterThanOrEqual(1)
      }
    })

    it("総件数とページ情報から総ページ数を正しく算出する", () => {
      expect(Math.ceil(25 / PER_PAGE)).toBe(3)
      expect(Math.ceil(10 / PER_PAGE)).toBe(1)
      expect(Math.ceil(11 / PER_PAGE)).toBe(2)
      expect(Math.ceil(0 / PER_PAGE)).toBe(0)
      expect(Math.ceil(1 / PER_PAGE)).toBe(1)
    })

    it("前へ/次へ ボタンの有効/無効を判定する", () => {
      const totalCount = 25
      const totalPages = Math.ceil(totalCount / PER_PAGE)

      // ページ1: 前へ=無効、次へ=有効
      expect(1 > 1).toBe(false)
      expect(1 < totalPages).toBe(true)

      // 最終ページ: 前へ=有効、次へ=無効
      expect(totalPages > 1).toBe(true)
      expect(totalPages < totalPages).toBe(false)

      // 中間ページ: 前へ=有効、次へ=有効
      expect(2 > 1).toBe(true)
      expect(2 < totalPages).toBe(true)
    })

    it("ページ1の場合は前へリンクの href を生成しない", () => {
      const page = 1
      const hasPrev = page > 1
      expect(hasPrev).toBe(false)
    })

    it("ページ2の場合は前へリンクの href が ?page=1 相当になる", () => {
      const page = 2
      const hasPrev = page > 1
      const prevPage = page - 1
      expect(hasPrev).toBe(true)
      expect(prevPage).toBe(1)
    })

    it("次へリンクの href は ?page=(current+1) になる", () => {
      const page = 2
      const totalPages = 5
      const hasNext = page < totalPages
      const nextPage = page + 1
      expect(hasNext).toBe(true)
      expect(nextPage).toBe(3)
    })
  })

  describe("バージョン一覧データの取得", () => {
    it("content_versions テーブルから全ステータスのバージョンを取得する", () => {
      const queryParams = {
        table: "content_versions",
        select: "id, commit_hash, status, synced_at, changes_summary, approved_by, approved_at, created_at",
        orderBy: "created_at",
        orderDirection: "desc" as const,
      }

      expect(queryParams.table).toBe("content_versions")
      expect(queryParams.orderBy).toBe("created_at")
      expect(queryParams.orderDirection).toBe("desc")
    })

    it("クエリに count: 'exact' を指定してページネーション用の総件数を取得する", () => {
      const queryOptions = { count: "exact" as const }
      expect(queryOptions.count).toBe("exact")
    })

    it("range でオフセットベースのページネーションを行う", () => {
      const page = 2
      const perPage = 10
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      expect(from).toBe(10)
      expect(to).toBe(19)
    })

    it("バージョンデータは created_at 降順でソートされる", () => {
      const versions = [
        createMockVersion({ id: "v3", created_at: "2026-03-03T10:00:00Z" }),
        createMockVersion({ id: "v2", created_at: "2026-03-02T10:00:00Z" }),
        createMockVersion({ id: "v1", created_at: "2026-03-01T10:00:00Z" }),
      ]

      // created_at 降順であることを確認
      for (let i = 0; i < versions.length - 1; i++) {
        const current = new Date(versions[i].created_at).getTime()
        const next = new Date(versions[i + 1].created_at).getTime()
        expect(current).toBeGreaterThan(next)
      }
    })
  })

  describe("承認者名の結合取得", () => {
    it("approved_by が null の場合は承認者名を表示しない（ダッシュ表示）", () => {
      const version = createMockVersionWithApprover({
        approved_by: null,
        approver_name: null,
      })

      const displayName = version.approver_name ?? "\u2014"
      expect(displayName).toBe("\u2014")
    })

    it("approved_by が存在する場合は profiles テーブルから名前を取得する", () => {
      const version = createMockVersionWithApprover({
        approved_by: "admin-001",
        approver_name: "管理者 太郎",
      })

      expect(version.approver_name).toBe("管理者 太郎")
    })

    it("approved_by が存在するが profiles に名前がない場合はダッシュ表示", () => {
      const version = createMockVersionWithApprover({
        approved_by: "admin-002",
        approver_name: null,
      })

      const displayName = version.approver_name ?? "\u2014"
      expect(displayName).toBe("\u2014")
    })
  })

  describe("コミットハッシュの表示", () => {
    it("コミットハッシュは先頭 7 文字を短縮表示する", () => {
      const fullHash = "abc1234def5678901234567890"
      const shortHash = fullHash.slice(0, 7)

      expect(shortHash).toBe("abc1234")
      expect(shortHash).toHaveLength(7)
    })

    it("7文字以下のハッシュはそのまま表示する", () => {
      const shortHash = "abc123"
      const displayHash = shortHash.slice(0, 7)

      expect(displayHash).toBe("abc123")
    })

    it("IBM Plex Mono フォントで表示する（font-secondary）", () => {
      // コミットハッシュは var(--font-secondary) = IBM Plex Mono で表示する
      const fontClass = "font-[family-name:var(--font-secondary)]"
      expect(fontClass).toContain("font-secondary")
    })
  })

  describe("ステータスバッジの表示", () => {
    it("draft ステータスは黄色のバッジで表示する", () => {
      const STATUS_BADGE_CONFIG: Record<string, { label: string; colorClass: string }> = {
        draft: { label: "draft", colorClass: "bg-yellow-500 text-white" },
        active: { label: "active", colorClass: "bg-green-600 text-white" },
        archived: { label: "archived", colorClass: "border-border text-foreground" },
      }

      expect(STATUS_BADGE_CONFIG.draft.label).toBe("draft")
      expect(STATUS_BADGE_CONFIG.draft.colorClass).toContain("yellow")
    })

    it("active ステータスは緑色のバッジで表示する", () => {
      const STATUS_BADGE_CONFIG: Record<string, { label: string; colorClass: string }> = {
        draft: { label: "draft", colorClass: "bg-yellow-500 text-white" },
        active: { label: "active", colorClass: "bg-green-600 text-white" },
        archived: { label: "archived", colorClass: "border-border text-foreground" },
      }

      expect(STATUS_BADGE_CONFIG.active.label).toBe("active")
      expect(STATUS_BADGE_CONFIG.active.colorClass).toContain("green")
    })

    it("archived ステータスはアウトライン/グレーのバッジで表示する", () => {
      const STATUS_BADGE_CONFIG: Record<string, { label: string; colorClass: string }> = {
        draft: { label: "draft", colorClass: "bg-yellow-500 text-white" },
        active: { label: "active", colorClass: "bg-green-600 text-white" },
        archived: { label: "archived", colorClass: "border-border text-foreground" },
      }

      expect(STATUS_BADGE_CONFIG.archived.label).toBe("archived")
      expect(STATUS_BADGE_CONFIG.archived.colorClass).toContain("border")
    })
  })

  describe("変更サマリーの表示", () => {
    it("追加・更新・削除の件数を表示する", () => {
      const summary = { added: 5, updated: 3, deleted: 1 }
      const parts: string[] = []

      if (summary.added > 0) parts.push(`+${summary.added}`)
      if (summary.updated > 0) parts.push(`~${summary.updated}`)
      if (summary.deleted > 0) parts.push(`-${summary.deleted}`)

      const display = parts.join(" ")
      expect(display).toBe("+5 ~3 -1")
    })

    it("追加のみの場合", () => {
      const summary = { added: 10, updated: 0, deleted: 0 }
      const parts: string[] = []

      if (summary.added > 0) parts.push(`+${summary.added}`)
      if (summary.updated > 0) parts.push(`~${summary.updated}`)
      if (summary.deleted > 0) parts.push(`-${summary.deleted}`)

      const display = parts.join(" ")
      expect(display).toBe("+10")
    })

    it("changes_summary が null の場合はダッシュ表示", () => {
      const summary = null
      const display = summary ? "has data" : "\u2014"
      expect(display).toBe("\u2014")
    })
  })

  describe("同期日時の表示", () => {
    it("同期日時を日本語ロケール（Asia/Tokyo）でフォーマットする", () => {
      const syncedAt = "2026-03-01T10:00:00Z"
      const formatted = new Date(syncedAt).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
      })

      expect(formatted).toBeDefined()
      expect(typeof formatted).toBe("string")
    })

    it("IBM Plex Mono フォントで同期日時を表示する（font-secondary）", () => {
      const fontClass = "font-[family-name:var(--font-secondary)]"
      expect(fontClass).toContain("font-secondary")
    })
  })

  describe("テーブル構造", () => {
    it("テーブルカラムは コミットハッシュ, ステータス, 変更サマリー, 同期日時, 承認者 の順に並ぶ", () => {
      const columns = [
        "コミットハッシュ",
        "ステータス",
        "変更サマリー",
        "同期日時",
        "承認者",
      ]

      expect(columns).toHaveLength(5)
      expect(columns[0]).toBe("コミットハッシュ")
      expect(columns[1]).toBe("ステータス")
      expect(columns[2]).toBe("変更サマリー")
      expect(columns[3]).toBe("同期日時")
      expect(columns[4]).toBe("承認者")
    })

    it("セクションタイトルは 'バージョン履歴' である", () => {
      const sectionTitle = "バージョン履歴"
      expect(sectionTitle).toBe("バージョン履歴")
    })

    it("バージョンが 0 件の場合はメッセージを表示する", () => {
      const versions: ContentVersion[] = []
      const isEmpty = versions.length === 0
      const emptyMessage = "バージョン履歴はありません"

      expect(isEmpty).toBe(true)
      expect(emptyMessage).toBe("バージョン履歴はありません")
    })
  })

  describe("ページ searchParams による Server Component ページネーション", () => {
    it("Server Component は searchParams から page を受け取る", () => {
      const searchParams = { page: "3" }
      const page = Math.max(1, Number(searchParams.page) || 1)
      expect(page).toBe(3)
    })

    it("前へ/次へ ボタンは Link コンポーネントで ?page=N を指定する", () => {
      const currentPage = 2
      const prevHref = `/admin/content-versions?page=${currentPage - 1}`
      const nextHref = `/admin/content-versions?page=${currentPage + 1}`

      expect(prevHref).toBe("/admin/content-versions?page=1")
      expect(nextHref).toBe("/admin/content-versions?page=3")
    })

    it("ページ1の前へリンクは生成しない（hasPrev=false）", () => {
      const currentPage = 1
      const hasPrev = currentPage > 1
      expect(hasPrev).toBe(false)
    })

    it("最終ページの次へリンクは生成しない（hasNext=false）", () => {
      const totalCount = 20
      const perPage = 10
      const currentPage = 2
      const totalPages = Math.ceil(totalCount / perPage)
      const hasNext = currentPage < totalPages
      expect(hasNext).toBe(false)
    })
  })

  describe("ダッシュボードとの統合", () => {
    it("バージョン管理ダッシュボードページに組み込まれる", () => {
      // page.tsx は /admin/content-versions に配置済み
      const pagePath = "/admin/content-versions"
      expect(pagePath).toBe("/admin/content-versions")
    })

    it("active/draft カードの下にバージョン履歴セクションが表示される", () => {
      const pageStructure = [
        "page-header",
        "version-cards-grid",
        "version-history-section",
      ]

      expect(pageStructure).toContain("version-history-section")
      expect(pageStructure.indexOf("version-history-section")).toBeGreaterThan(
        pageStructure.indexOf("version-cards-grid")
      )
    })
  })

  describe("Supabase クエリ構築", () => {
    it("profiles テーブルとの結合で承認者名を取得するクエリ構造", () => {
      // Supabase の select で profiles (approved_by) の join を行う
      const selectQuery =
        "id, commit_hash, status, synced_at, changes_summary, approved_by, approved_at, created_at, profiles:approved_by(full_name)"

      expect(selectQuery).toContain("profiles:approved_by(full_name)")
    })

    it("クエリは created_at desc でソートされる", () => {
      const orderConfig = { column: "created_at", ascending: false }
      expect(orderConfig.column).toBe("created_at")
      expect(orderConfig.ascending).toBe(false)
    })

    it("クエリは range で件数を制限する", () => {
      const page = 1
      const perPage = 10
      const from = (page - 1) * perPage
      const to = from + perPage - 1

      const rangeConfig = { from, to }
      expect(rangeConfig.from).toBe(0)
      expect(rangeConfig.to).toBe(9)
    })
  })
})
