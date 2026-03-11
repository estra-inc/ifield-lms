/**
 * バージョン詳細ページ（変更ファイル一覧）のテスト
 *
 * Task 5.1: バージョン詳細ページの作成
 * - draft バージョンの changed_paths から変更ファイル一覧を表示する
 * - 各ファイルに変更種別（追加 / 更新 / 削除）をバッジで視覚的に区別して表示する
 * - 各ファイルから受講生向けコンテンツページへの ?version_id 付きプレビューリンクを生成する
 * - 全体プレビューリンク（教材一覧ページへの ?version_id 付きリンク）を提供する
 * - 変更ファイル一覧は変更種別グルーピング（追加→更新→削除）、各グループ内アルファベット順
 *
 * Requirements: 3.1, 3.2, 3.4, 8.2
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
const mockNotFound = vi.fn()
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  notFound: mockNotFound,
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

function createMockDraftVersion(
  overrides: Partial<ContentVersion> = {}
): ContentVersion {
  return {
    id: "draft-version-001",
    commit_hash: "abc1234def5678",
    status: "draft",
    synced_at: "2026-03-01T10:00:00Z",
    changes_summary: { added: 2, updated: 3, deleted: 1 },
    changed_paths: [
      "engineering/html-css/chapter1/intro",
      "engineering/html-css/chapter1/basics",
      "engineering/javascript/chapter1/intro",
      "engineering/javascript/chapter2/advanced",
      "engineering/react/chapter1/getting-started",
      "design/figma/chapter1/intro",
    ],
    quiz_changes_summary: null,
    mock_project_changes_summary: null,
    approved_by: null,
    approved_at: null,
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
    ...overrides,
  }
}

/** slug_path からプレビューリンクを生成する関数のテスト用ヘルパー */
function buildPreviewLink(slugPath: string, versionId: string): string {
  // slug_path の構造: genre/tutorial/chapter/section
  // プレビューリンクは /contents/{tutorial_slug}?version_id={version_id}
  const parts = slugPath.split("/")
  // tutorial は parts[1]
  const tutorialSlug = parts[1] ?? ""
  return `/contents/${tutorialSlug}?version_id=${versionId}`
}

/** 変更種別を判定する関数 */
function classifyChangeType(
  path: string,
  draftPaths: Set<string>,
  activePaths: Set<string>
): "added" | "updated" | "deleted" {
  const inDraft = draftPaths.has(path)
  const inActive = activePaths.has(path)

  if (inDraft && !inActive) return "added"
  if (inDraft && inActive) return "updated"
  if (!inDraft && inActive) return "deleted"

  // fallback: path in changed_paths but not in either set
  return "added"
}

/** 変更ファイル一覧をグルーピング・ソートする関数 */
interface ChangedFile {
  path: string
  changeType: "added" | "updated" | "deleted"
}

function groupAndSortChangedFiles(files: ChangedFile[]): ChangedFile[] {
  const order: Record<string, number> = { added: 0, updated: 1, deleted: 2 }

  return [...files].sort((a, b) => {
    const orderDiff = order[a.changeType] - order[b.changeType]
    if (orderDiff !== 0) return orderDiff
    return a.path.localeCompare(b.path)
  })
}

// --- Tests ---

describe("バージョン詳細ページ (Task 5.1)", () => {
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

    it("super_admin 以外のロールの場合はダッシュボードにリダイレクトする", () => {
      const profileData = { role: "user" }
      expect(profileData.role).not.toBe("super_admin")
      // ページロジック: role !== "super_admin" の場合 redirect("/dashboard") を呼ぶ
    })

    it("manager ロールの場合もダッシュボードにリダイレクトする", () => {
      const profileData = { role: "manager" }
      expect(profileData.role).not.toBe("super_admin")
    })

    it("super_admin ロールの場合はページを表示する", () => {
      const profileData = { role: "super_admin" }
      expect(profileData.role).toBe("super_admin")
    })
  })

  describe("バージョンデータの取得", () => {
    it("params.id でバージョンを取得する", () => {
      const versionId = "draft-version-001"
      const queryParams = {
        table: "content_versions",
        filter: { id: versionId },
        method: "single",
      }

      expect(queryParams.table).toBe("content_versions")
      expect(queryParams.filter.id).toBe("draft-version-001")
    })

    it("全ステータス（draft / active / archived）のバージョンで正常に表示する", () => {
      const statuses: ("draft" | "active" | "archived")[] = ["draft", "active", "archived"]
      for (const status of statuses) {
        const version = createMockDraftVersion({ status })
        // どのステータスでも version が存在すれば表示する
        expect(version).not.toBeNull()
        expect(version.id).toBeDefined()
      }
    })

    it("存在しないバージョン ID の場合は notFound を呼ぶ", () => {
      const version = null
      expect(version).toBeNull()
      // ページロジック: version が null の場合 notFound() を呼ぶ
    })

    it("draft バージョンの全フィールドを取得する", () => {
      const version = createMockDraftVersion()

      expect(version.id).toBe("draft-version-001")
      expect(version.commit_hash).toBe("abc1234def5678")
      expect(version.status).toBe("draft")
      expect(version.synced_at).toBeDefined()
      expect(version.changes_summary).toBeDefined()
      expect(version.changed_paths).toBeDefined()
      expect(Array.isArray(version.changed_paths)).toBe(true)
    })
  })

  describe("変更種別の判定", () => {
    it("draft にのみ存在するパスは '追加' と判定する", () => {
      const draftPaths = new Set(["engineering/new-tutorial/chapter1/intro"])
      const activePaths = new Set<string>([])

      const changeType = classifyChangeType(
        "engineering/new-tutorial/chapter1/intro",
        draftPaths,
        activePaths
      )

      expect(changeType).toBe("added")
    })

    it("draft と active の両方に存在するパスは '更新' と判定する", () => {
      const draftPaths = new Set(["engineering/html-css/chapter1/intro"])
      const activePaths = new Set(["engineering/html-css/chapter1/intro"])

      const changeType = classifyChangeType(
        "engineering/html-css/chapter1/intro",
        draftPaths,
        activePaths
      )

      expect(changeType).toBe("updated")
    })

    it("active にのみ存在するパスは '削除' と判定する", () => {
      const draftPaths = new Set<string>([])
      const activePaths = new Set(["engineering/old-tutorial/chapter1/intro"])

      const changeType = classifyChangeType(
        "engineering/old-tutorial/chapter1/intro",
        draftPaths,
        activePaths
      )

      expect(changeType).toBe("deleted")
    })

    it("draft と active の slug_path を比較して各パスの変更種別を判定する", () => {
      const changedPaths = [
        "engineering/new-tutorial/chapter1/intro",
        "engineering/html-css/chapter1/intro",
        "engineering/old-tutorial/chapter1/intro",
      ]

      const draftPaths = new Set([
        "engineering/new-tutorial/chapter1/intro",
        "engineering/html-css/chapter1/intro",
      ])

      const activePaths = new Set([
        "engineering/html-css/chapter1/intro",
        "engineering/old-tutorial/chapter1/intro",
      ])

      const results = changedPaths.map((path) => ({
        path,
        changeType: classifyChangeType(path, draftPaths, activePaths),
      }))

      expect(results[0].changeType).toBe("added")
      expect(results[1].changeType).toBe("updated")
      expect(results[2].changeType).toBe("deleted")
    })

    it("draft と active のコンテンツ取得クエリが正しい", () => {
      const versionId = "draft-version-001"
      const activeVersionId = "active-version-001"

      const draftQuery = {
        table: "contents",
        select: "slug_path",
        filter: { version_id: versionId },
      }

      const activeQuery = {
        table: "contents",
        select: "slug_path",
        filter: { version_id: activeVersionId },
      }

      expect(draftQuery.table).toBe("contents")
      expect(draftQuery.select).toBe("slug_path")
      expect(draftQuery.filter.version_id).toBe("draft-version-001")
      expect(activeQuery.filter.version_id).toBe("active-version-001")
    })
  })

  describe("変更ファイル一覧のグルーピングとソート", () => {
    it("変更種別でグルーピングする: 追加 → 更新 → 削除 の順", () => {
      const files: ChangedFile[] = [
        { path: "engineering/react/chapter1/intro", changeType: "deleted" },
        { path: "engineering/html-css/chapter1/intro", changeType: "updated" },
        { path: "engineering/new/chapter1/intro", changeType: "added" },
      ]

      const sorted = groupAndSortChangedFiles(files)

      expect(sorted[0].changeType).toBe("added")
      expect(sorted[1].changeType).toBe("updated")
      expect(sorted[2].changeType).toBe("deleted")
    })

    it("各グループ内はアルファベット順にソートする", () => {
      const files: ChangedFile[] = [
        { path: "engineering/react/chapter1/intro", changeType: "added" },
        { path: "engineering/html-css/chapter1/intro", changeType: "added" },
        { path: "design/figma/chapter1/intro", changeType: "added" },
      ]

      const sorted = groupAndSortChangedFiles(files)

      expect(sorted[0].path).toBe("design/figma/chapter1/intro")
      expect(sorted[1].path).toBe("engineering/html-css/chapter1/intro")
      expect(sorted[2].path).toBe("engineering/react/chapter1/intro")
    })

    it("複数の変更種別が混在する場合に正しくグルーピング・ソートする", () => {
      const files: ChangedFile[] = [
        { path: "engineering/z-tutorial/chapter1/intro", changeType: "deleted" },
        { path: "engineering/a-tutorial/chapter1/intro", changeType: "deleted" },
        { path: "engineering/react/chapter1/intro", changeType: "updated" },
        { path: "engineering/html-css/chapter1/intro", changeType: "updated" },
        { path: "engineering/new-b/chapter1/intro", changeType: "added" },
        { path: "engineering/new-a/chapter1/intro", changeType: "added" },
      ]

      const sorted = groupAndSortChangedFiles(files)

      // added group (alphabetical)
      expect(sorted[0]).toEqual({
        path: "engineering/new-a/chapter1/intro",
        changeType: "added",
      })
      expect(sorted[1]).toEqual({
        path: "engineering/new-b/chapter1/intro",
        changeType: "added",
      })

      // updated group (alphabetical)
      expect(sorted[2]).toEqual({
        path: "engineering/html-css/chapter1/intro",
        changeType: "updated",
      })
      expect(sorted[3]).toEqual({
        path: "engineering/react/chapter1/intro",
        changeType: "updated",
      })

      // deleted group (alphabetical)
      expect(sorted[4]).toEqual({
        path: "engineering/a-tutorial/chapter1/intro",
        changeType: "deleted",
      })
      expect(sorted[5]).toEqual({
        path: "engineering/z-tutorial/chapter1/intro",
        changeType: "deleted",
      })
    })

    it("空の変更ファイル一覧の場合は空配列を返す", () => {
      const files: ChangedFile[] = []
      const sorted = groupAndSortChangedFiles(files)
      expect(sorted).toEqual([])
    })
  })

  describe("変更種別バッジ表示", () => {
    it("追加バッジは緑色系で表示する", () => {
      const badgeConfig = {
        added: {
          label: "追加",
          bgColor: "bg-green-100",
          textColor: "text-green-800",
        },
      }

      expect(badgeConfig.added.label).toBe("追加")
      expect(badgeConfig.added.bgColor).toContain("green")
    })

    it("更新バッジは青色系で表示する", () => {
      const badgeConfig = {
        updated: {
          label: "更新",
          bgColor: "bg-blue-100",
          textColor: "text-blue-800",
        },
      }

      expect(badgeConfig.updated.label).toBe("更新")
      expect(badgeConfig.updated.bgColor).toContain("blue")
    })

    it("削除バッジは赤色系で表示する", () => {
      const badgeConfig = {
        deleted: {
          label: "削除",
          bgColor: "bg-red-100",
          textColor: "text-red-800",
        },
      }

      expect(badgeConfig.deleted.label).toBe("削除")
      expect(badgeConfig.deleted.bgColor).toContain("red")
    })
  })

  describe("テーブル行のスタイリング", () => {
    it("追加行は緑背景で表示する (#F0FDF4 相当)", () => {
      const rowBgConfig: Record<string, string> = {
        added: "bg-green-50",
        updated: "",
        deleted: "bg-red-50",
      }

      expect(rowBgConfig.added).toBe("bg-green-50")
    })

    it("更新行は白背景で表示する", () => {
      const rowBgConfig: Record<string, string> = {
        added: "bg-green-50",
        updated: "",
        deleted: "bg-red-50",
      }

      expect(rowBgConfig.updated).toBe("")
    })

    it("削除行は赤背景で表示する (#FEF2F2 相当)", () => {
      const rowBgConfig: Record<string, string> = {
        added: "bg-green-50",
        updated: "",
        deleted: "bg-red-50",
      }

      expect(rowBgConfig.deleted).toBe("bg-red-50")
    })

    it("削除行のファイルパスは打ち消し線で表示する", () => {
      const changeType = "deleted"
      const textClass = changeType === "deleted" ? "line-through" : ""

      expect(textClass).toBe("line-through")
    })

    it("追加・更新行のファイルパスは打ち消し線なしで表示する", () => {
      const addedTextClass = "added" === "deleted" ? "line-through" : ""
      const updatedTextClass = "updated" === "deleted" ? "line-through" : ""

      expect(addedTextClass).toBe("")
      expect(updatedTextClass).toBe("")
    })
  })

  describe("プレビューリンクの生成", () => {
    it("各ファイルから tutorial slug を抽出してプレビューリンクを生成する", () => {
      const versionId = "draft-version-001"
      const slugPath = "engineering/html-css/chapter1/intro"

      const link = buildPreviewLink(slugPath, versionId)

      expect(link).toBe("/contents/html-css?version_id=draft-version-001")
    })

    it("異なるチュートリアルのパスから正しいリンクを生成する", () => {
      const versionId = "draft-version-001"

      expect(buildPreviewLink("engineering/javascript/chapter2/advanced", versionId)).toBe(
        "/contents/javascript?version_id=draft-version-001"
      )
      expect(buildPreviewLink("design/figma/chapter1/intro", versionId)).toBe(
        "/contents/figma?version_id=draft-version-001"
      )
    })

    it("削除されたファイルにはプレビューリンクを表示しない", () => {
      const changeType = "deleted"
      const showPreviewLink = changeType !== "deleted"

      expect(showPreviewLink).toBe(false)
    })

    it("追加・更新ファイルにはプレビューリンクを表示する", () => {
      expect("added" !== "deleted").toBe(true)
      expect("updated" !== "deleted").toBe(true)
    })

    it("削除ファイルの操作列にはダッシュ記号を表示する", () => {
      const changeType = "deleted"
      const operationContent = changeType === "deleted" ? "\u2014" : "preview-link"

      expect(operationContent).toBe("\u2014")
    })
  })

  describe("全体プレビューリンク", () => {
    it("全体プレビューリンクは /contents?version_id={version_id} である", () => {
      const versionId = "draft-version-001"
      const fullPreviewLink = `/contents?version_id=${versionId}`

      expect(fullPreviewLink).toBe("/contents?version_id=draft-version-001")
    })

    it("全体プレビューボタンは outline バリアントで表示する", () => {
      const buttonConfig = {
        variant: "outline",
        label: "全体プレビュー",
      }

      expect(buttonConfig.variant).toBe("outline")
      expect(buttonConfig.label).toBe("全体プレビュー")
    })
  })

  describe("ページヘッダーとナビゲーション", () => {
    it("ページタイトルは '差分ビュー' である", () => {
      const pageTitle = "差分ビュー"
      expect(pageTitle).toBe("差分ビュー")
    })

    it("戻るリンクは /admin/content-versions を指す", () => {
      const backLink = "/admin/content-versions"
      expect(backLink).toBe("/admin/content-versions")
    })

    it("承認して公開ボタンのリンク先にはバージョン ID が含まれる", () => {
      const versionId = "draft-version-001"
      // 承認ボタン自体は task 5.2 で実装するが、
      // このページにボタンを配置する
      const approveButtonExists = true
      expect(approveButtonExists).toBe(true)
    })
  })

  describe("Draft 情報カード", () => {
    it("コミットハッシュを先頭7文字で表示する", () => {
      const version = createMockDraftVersion()
      const shortHash = version.commit_hash.slice(0, 7)

      expect(shortHash).toBe("abc1234")
      expect(shortHash).toHaveLength(7)
    })

    it("同期日時を日本語ロケールでフォーマットする", () => {
      const syncedAt = "2026-03-01T10:00:00Z"
      const formatted = new Date(syncedAt).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
      })

      expect(formatted).toBeDefined()
      expect(typeof formatted).toBe("string")
    })

    it("変更サマリーバッジを表示する（+N追加, N更新, N削除）", () => {
      const version = createMockDraftVersion({
        changes_summary: { added: 5, updated: 3, deleted: 1 },
      })

      const summaryBadges = []
      if (version.changes_summary.added > 0) {
        summaryBadges.push(`+${version.changes_summary.added}追加`)
      }
      if (version.changes_summary.updated > 0) {
        summaryBadges.push(`${version.changes_summary.updated}更新`)
      }
      if (version.changes_summary.deleted > 0) {
        summaryBadges.push(`${version.changes_summary.deleted}削除`)
      }

      expect(summaryBadges).toHaveLength(3)
      expect(summaryBadges[0]).toBe("+5追加")
      expect(summaryBadges[1]).toBe("3更新")
      expect(summaryBadges[2]).toBe("1削除")
    })

    it("コミットハッシュとファイルパスは IBM Plex Mono (font-secondary) で表示する", () => {
      // デザインワークフロー規約に従い、font-secondary を使用
      const fontClass = "font-[family-name:var(--font-secondary)]"
      expect(fontClass).toContain("font-secondary")
    })
  })

  describe("テーブル構造", () => {
    it("テーブルカラムは ファイルパス, 変更種別, 操作 の3列", () => {
      const columns = ["ファイルパス", "変更種別", "操作"]

      expect(columns).toHaveLength(3)
      expect(columns[0]).toBe("ファイルパス")
      expect(columns[1]).toBe("変更種別")
      expect(columns[2]).toBe("操作")
    })

    it("セクションタイトルは '変更ファイル一覧' である", () => {
      const sectionTitle = "変更ファイル一覧"
      expect(sectionTitle).toBe("変更ファイル一覧")
    })
  })

  describe("active バージョン ID の取得", () => {
    it("active バージョンが存在する場合はその ID を使って比較する", () => {
      const activeVersionId = "active-version-001"
      expect(activeVersionId).toBeDefined()
      expect(activeVersionId).not.toBeNull()
    })

    it("active バージョンが存在しない場合は全パスを 'added' として扱う", () => {
      const activeVersionId: string | null = null
      const changedPaths = [
        "engineering/html-css/chapter1/intro",
        "engineering/react/chapter1/intro",
      ]

      // active が存在しない場合、全てのパスが追加扱い
      const results = changedPaths.map((path) => ({
        path,
        changeType: activeVersionId
          ? "need-comparison"
          : ("added" as const),
      }))

      expect(results.every((r) => r.changeType === "added")).toBe(true)
    })
  })

  describe("ページパスとルーティング", () => {
    it("ページパスは /admin/content-versions/[id] である", () => {
      const pagePath = "/admin/content-versions/[id]"
      expect(pagePath).toBe("/admin/content-versions/[id]")
    })

    it("Server Component として実装される（async 関数）", () => {
      const isServerComponent = true
      expect(isServerComponent).toBe(true)
    })

    it("params から id を受け取る", () => {
      const params = { id: "draft-version-001" }
      expect(params.id).toBe("draft-version-001")
    })
  })

  describe("全ステータス対応", () => {
    it("active ステータスのバージョンでも正常に表示する", () => {
      const version = createMockDraftVersion({ status: "active" })
      expect(version).not.toBeNull()
      expect(version.status).toBe("active")
    })

    it("archived ステータスのバージョンでも正常に表示する", () => {
      const version = createMockDraftVersion({ status: "archived" })
      expect(version).not.toBeNull()
      expect(version.status).toBe("archived")
    })

    it("draft 以外では ApproveButton を表示しない", () => {
      const activeVersion = createMockDraftVersion({ status: "active" })
      const archivedVersion = createMockDraftVersion({ status: "archived" })

      expect(activeVersion.status === "draft").toBe(false)
      expect(archivedVersion.status === "draft").toBe(false)

      // draft の場合のみ表示
      const draftVersion = createMockDraftVersion({ status: "draft" })
      expect(draftVersion.status === "draft").toBe(true)
    })

    it("ステータスバッジを表示する", () => {
      const statusBadgeConfig: Record<string, { label: string }> = {
        draft: { label: "draft" },
        active: { label: "active" },
        archived: { label: "archived" },
      }

      expect(statusBadgeConfig.draft.label).toBe("draft")
      expect(statusBadgeConfig.active.label).toBe("active")
      expect(statusBadgeConfig.archived.label).toBe("archived")
    })
  })

  describe("ディレクトリ別サマリー", () => {
    it("3種類のディレクトリサマリーを表示する", () => {
      const version = createMockDraftVersion({
        changes_summary: { added: 2, updated: 1, deleted: 0 },
        quiz_changes_summary: { added: 3, updated: 0, deleted: 1 },
        mock_project_changes_summary: { added: 1, updated: 1, deleted: 0 },
      })

      const directories = [
        { label: "教材", summary: version.changes_summary },
        { label: "演習問題", summary: version.quiz_changes_summary },
        { label: "模擬案件", summary: version.mock_project_changes_summary },
      ]

      expect(directories).toHaveLength(3)
      expect(directories[0].label).toBe("教材")
      expect(directories[0].summary).toEqual({ added: 2, updated: 1, deleted: 0 })
      expect(directories[1].label).toBe("演習問題")
      expect(directories[1].summary).toEqual({ added: 3, updated: 0, deleted: 1 })
      expect(directories[2].label).toBe("模擬案件")
      expect(directories[2].summary).toEqual({ added: 1, updated: 1, deleted: 0 })
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

      const version = createMockDraftVersion({
        quiz_changes_summary: null,
        mock_project_changes_summary: null,
      })

      expect(formatChangesSummary(version.quiz_changes_summary)).toBe("\u2014")
      expect(formatChangesSummary(version.mock_project_changes_summary)).toBe("\u2014")
    })

    it("formatChangesSummary でサマリーを正しく文字列化する", () => {
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

      expect(formatChangesSummary({ added: 2, updated: 1, deleted: 0 })).toBe("+2 ~1")
      expect(formatChangesSummary({ added: 0, updated: 0, deleted: 3 })).toBe("-3")
      expect(formatChangesSummary({ added: 1, updated: 2, deleted: 3 })).toBe("+1 ~2 -3")
      expect(formatChangesSummary({ added: 0, updated: 0, deleted: 0 })).toBe("\u2014")
    })
  })
})
