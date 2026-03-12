import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getActiveVersionId } from "@/lib/supabase/content-version"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react"
import { ApproveButton } from "./_components/approve-button"
import { VersionDiffTabs } from "./_components/version-diff-tabs"
import type { DiffItem, DiffTabData } from "./_components/version-diff-tabs"

/**
 * バージョン詳細ページ（Server Component）
 *
 * curriculums / exercises / mock-projects のディレクトリ別差分をタブ表示する。
 * Super Admin のみアクセス可能。全ステータス（draft / active / archived）対応。
 *
 * Requirements: 3.1, 3.2, 3.4, 8.2
 */

// --- ステータスバッジの設定 ---

const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; className: string; variant?: "outline" }
> = {
  draft: {
    label: "draft",
    className: "bg-yellow-500 text-white hover:bg-yellow-500",
  },
  active: {
    label: "active",
    className: "bg-green-600 text-white hover:bg-green-600",
  },
  archived: {
    label: "archived",
    className: "",
    variant: "outline",
  },
}

/** 変更サマリーを表示用文字列に変換 */
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

type ChangeType = "added" | "updated" | "deleted"

/** slug_path の先頭スラッシュを除去してジャンルから始まるパスにする */
function normalizePath(slugPath: string): string {
  return slugPath.startsWith("/") ? slugPath.slice(1) : slugPath
}

/** changed_paths 内のパスの変更種別を判定する */
function classifyChangeType(
  path: string,
  versionPaths: Set<string>,
  comparisonPaths: Set<string>
): ChangeType {
  const inVersion = versionPaths.has(path)
  const inComparison = comparisonPaths.has(path)
  if (inVersion && !inComparison) return "added"
  if (inVersion && inComparison) return "updated"
  if (!inVersion && inComparison) return "deleted"
  return "added"
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContentVersionDetailPage({
  params,
}: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // --- 認証チェック ---
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // --- Super Admin 権限チェック ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard")
  }

  // --- バージョンデータの取得 ---
  const { data: version } = await supabase
    .from("content_versions")
    .select(
      "id, commit_hash, commit_message, status, synced_at, changes_summary, changed_paths, quiz_changes_summary, mock_project_changes_summary, approved_by, approved_at, profiles:approved_by(full_name)"
    )
    .eq("id", id)
    .single()

  if (!version) {
    notFound()
  }

  type ChangesSummaryType = { added: number; updated: number; deleted: number }
  const changesSummary = version.changes_summary as ChangesSummaryType | null
  const quizChangesSummary = version.quiz_changes_summary as ChangesSummaryType | null
  const mockProjectChangesSummary = version.mock_project_changes_summary as ChangesSummaryType | null

  // --- 比較対象バージョンの特定 ---
  const activeVersionId = await getActiveVersionId(supabase)

  let comparisonVersionId: string | null = null
  if (activeVersionId && activeVersionId !== version.id) {
    // draft or archived → active と比較
    comparisonVersionId = activeVersionId
  } else if (version.status === "active") {
    // active → 直近の archived と比較
    const { data: previousVersion } = await supabase
      .from("content_versions")
      .select("id")
      .eq("status", "archived")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    comparisonVersionId = previousVersion?.id ?? null
  }

  // ==========================================================
  // CURRICULUM DIFF（contents テーブル）
  // ==========================================================
  let curriculumDiffItems: DiffItem[] = []
  let curriculumEmptyMessage: string | undefined

  const changedPaths = (version.changed_paths as string[]) ?? []

  // このバージョンの contents slug_path 一覧
  const { data: versionContents } = await supabase
    .from("contents")
    .select("slug_path")
    .eq("version_id", version.id)
  const versionPaths = new Set(
    (versionContents ?? []).map((c) => c.slug_path)
  )

  // 比較対象の contents slug_path 一覧
  let comparisonContentPaths = new Set<string>()
  if (comparisonVersionId) {
    const { data: comparisonContents } = await supabase
      .from("contents")
      .select("slug_path")
      .eq("version_id", comparisonVersionId)
    comparisonContentPaths = new Set(
      (comparisonContents ?? []).map((c) => c.slug_path)
    )
  }

  if (changedPaths.length > 0) {
    // changed_paths がある場合: 各パスを分類
    curriculumDiffItems = changedPaths.map((path) => ({
      path: normalizePath(path),
      changeType: comparisonVersionId
        ? classifyChangeType(path, versionPaths, comparisonContentPaths)
        : ("added" as const),
    }))
  } else if (version.status === "draft" && comparisonVersionId && comparisonContentPaths.size > 0) {
    // Draft + empty changed_paths: active との差分をその場で計算
    const added = Array.from(versionPaths).filter(
      (p) => !comparisonContentPaths.has(p)
    )
    const deleted = Array.from(comparisonContentPaths).filter(
      (p) => !versionPaths.has(p)
    )

    // 共通パスから実際に変更があったものを検出
    const commonPaths = Array.from(versionPaths).filter((p) =>
      comparisonContentPaths.has(p)
    )
    let updatedPaths: string[] = []
    if (commonPaths.length > 0) {
      const { data: draftRows } = await supabase
        .from("contents")
        .select("slug_path, title, body, order")
        .eq("version_id", version.id)
        .in("slug_path", commonPaths)
      const { data: activeRows } = await supabase
        .from("contents")
        .select("slug_path, title, body, order")
        .eq("version_id", comparisonVersionId)
        .in("slug_path", commonPaths)

      const activeMap = new Map(
        (activeRows ?? []).map((r) => [r.slug_path, r])
      )
      updatedPaths = (draftRows ?? [])
        .filter((d) => {
          const a = activeMap.get(d.slug_path)
          if (!a) return false
          return (
            d.title !== a.title || d.body !== a.body || d.order !== a.order
          )
        })
        .map((d) => d.slug_path)
    }

    curriculumDiffItems = [
      ...added.map((p) => ({ path: normalizePath(p), changeType: "added" as const })),
      ...updatedPaths.map((p) => ({ path: normalizePath(p), changeType: "updated" as const })),
      ...deleted.map((p) => ({ path: normalizePath(p), changeType: "deleted" as const })),
    ]
  } else if (version.status === "draft" && !comparisonVersionId) {
    // Draft + active なし: 全て追加扱い
    curriculumDiffItems = Array.from(versionPaths).map((p) => ({
      path: normalizePath(p),
      changeType: "added" as const,
    }))
  } else {
    // active/archived + empty changed_paths: 差分計算不可
    curriculumEmptyMessage = "詳細な差分データはありません"
  }

  // ==========================================================
  // QUIZ DIFF（quizzes テーブル）
  // approve RPC は quizzes を削除しないため、全バージョン間で比較可能
  // ==========================================================
  let quizDiffItems: DiffItem[] = []

  const buildQuizKey = (q: {
    genre: string
    tutorial: string
    chapter: string
    section: string
    slug: string
  }) => `${q.genre}/${q.tutorial}/${q.chapter}/${q.section}/${q.slug}`

  const { data: versionQuizzes } = await supabase
    .from("quizzes")
    .select("genre, tutorial, chapter, section, slug, title, questions")
    .eq("version_id", version.id)

  if (comparisonVersionId) {
    const { data: comparisonQuizzes } = await supabase
      .from("quizzes")
      .select("genre, tutorial, chapter, section, slug, title, questions")
      .eq("version_id", comparisonVersionId)

    const versionQuizMap = new Map(
      (versionQuizzes ?? []).map((q) => [buildQuizKey(q), q])
    )
    const comparisonQuizMap = new Map(
      (comparisonQuizzes ?? []).map((q) => [buildQuizKey(q), q])
    )

    // Added
    for (const [key] of versionQuizMap) {
      if (!comparisonQuizMap.has(key)) {
        quizDiffItems.push({ path: key, changeType: "added" })
      }
    }

    // Updated
    for (const [key, vQuiz] of versionQuizMap) {
      const cQuiz = comparisonQuizMap.get(key)
      if (cQuiz) {
        const titleChanged = vQuiz.title !== cQuiz.title
        const questionsChanged =
          JSON.stringify(vQuiz.questions) !==
          JSON.stringify(cQuiz.questions)
        if (titleChanged || questionsChanged) {
          quizDiffItems.push({ path: key, changeType: "updated" })
        }
      }
    }

    // Deleted
    for (const [key] of comparisonQuizMap) {
      if (!versionQuizMap.has(key)) {
        quizDiffItems.push({ path: key, changeType: "deleted" })
      }
    }
  } else if (
    version.status === "draft" &&
    (versionQuizzes ?? []).length > 0
  ) {
    // Draft + active なし: 全て追加
    quizDiffItems = (versionQuizzes ?? []).map((q) => ({
      path: buildQuizKey(q),
      changeType: "added" as const,
    }))
  }

  // ==========================================================
  // MOCK-PROJECTS DIFF（mock_project_changes_summary の items から取得）
  // mock_projects はバージョン間で移動されるため、version_id ベースの比較は不可。
  // 同期時に RPC が計算した items を使用する。
  // ==========================================================
  let mockProjectDiffItems: DiffItem[] = []

  // mock_project_changes_summary に items が含まれている場合はそれを使用
  const mockProjectItems = (mockProjectChangesSummary as { items?: { slug: string; genre: string; change_type: string }[] } | null)?.items
  if (mockProjectItems && mockProjectItems.length > 0) {
    mockProjectDiffItems = mockProjectItems.map((item) => ({
      path: `${item.genre}/${item.slug}`,
      changeType: item.change_type as ChangeType,
    }))
  }

  // === TABS DATA ===
  const tabsData: DiffTabData[] = [
    {
      label: "教材",
      items: curriculumDiffItems,
      summary: changesSummary,
      emptyMessage: curriculumEmptyMessage,
    },
    {
      label: "演習問題",
      items: quizDiffItems,
      summary: quizChangesSummary,
    },
    {
      label: "模擬案件",
      items: mockProjectDiffItems,
      summary: mockProjectChangesSummary,
    },
  ]

  // --- 全体プレビューリンク ---
  const fullPreviewLink = `/contents?version_id=${version.id}`

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 px-2"
          >
            <Link href="/admin/content-versions">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <h1 className="font-[family-name:var(--font-primary)] text-2xl font-semibold tracking-tight text-foreground">
            差分ビュー
          </h1>
          {(() => {
            const badgeConfig =
              STATUS_BADGE_CONFIG[version.status] ??
              STATUS_BADGE_CONFIG.archived
            return (
              <Badge
                variant={badgeConfig.variant ?? "default"}
                className={badgeConfig.className}
              >
                {badgeConfig.label}
              </Badge>
            )
          })()}
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            className="font-[family-name:var(--font-primary)]"
          >
            <Link href={fullPreviewLink} target="_blank">
              全体プレビュー
              <ExternalLinkIcon className="size-4 ml-2" />
            </Link>
          </Button>
          {version.status === "draft" && (
            <ApproveButton
              versionId={version.id}
              changesSummary={changesSummary}
            />
          )}
        </div>
      </div>

      {/* バージョン情報カード */}
      <Card className="border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="font-[family-name:var(--font-primary)] text-base">
            バージョン情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <span className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground uppercase tracking-wider">
                  コミットハッシュ
                </span>
                <code className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                  {version.commit_hash.slice(0, 7)}
                </code>
              </div>
              {version.commit_message && (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground uppercase tracking-wider shrink-0">
                    コミットメッセージ
                  </span>
                  <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground truncate">
                    {version.commit_message}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground uppercase tracking-wider">
                  同期日時
                </span>
                <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                  {new Date(version.synced_at).toLocaleString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                  })}
                </span>
              </div>
            </div>

            {/* ディレクトリ別変更サマリー */}
            {(changesSummary || quizChangesSummary || mockProjectChangesSummary) && (
              <div className="flex flex-col gap-2">
                {[
                  { label: "教材", summary: changesSummary },
                  { label: "演習問題", summary: quizChangesSummary },
                  { label: "模擬案件", summary: mockProjectChangesSummary },
                ].map(({ label, summary }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-primary)] text-xs text-muted-foreground w-16 shrink-0">
                      {label}
                    </span>
                    <span className="font-[family-name:var(--font-secondary)] text-sm text-foreground">
                      {formatChangesSummary(summary)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 差分タブ */}
      <VersionDiffTabs tabs={tabsData} versionId={version.id} />
    </div>
  )
}
