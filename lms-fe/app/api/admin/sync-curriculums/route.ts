import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { SupabaseClient } from "@supabase/supabase-js"
import { gunzipSync } from "zlib"

// Next.js App Router: Route Segment Config
export const maxDuration = 60

/**
 * コンテンツ同期リクエストのアイテム型
 */
interface SyncContentItem {
  slug_path: string
  title: string
  body?: string | null
  genre: string
  tutorial: string
  chapter?: string | null
  section?: string | null
  content_type: "genre" | "tutorial" | "chapter" | "section"
  order?: number
  metadata?: Record<string, unknown> | null
}

/**
 * クイズ同期リクエストのアイテム型 (V3)
 */
interface SyncQuizItem {
  file_path: string
  slug: string
  section: string
  title: string
  genre: string
  tutorial: string
  chapter: string
  questions: QuizQuestionItem[]
}

/**
 * クイズの問題アイテム型
 */
interface QuizQuestionItem {
  id: string
  type: "single" | "multiple"
  text: string
  options: { id: string; text: string }[]
  correct: string | string[]
  explanation: string
}

/**
 * 模擬案件同期リクエストのアイテム型 (V4)
 */
interface SyncMockProjectItem {
  slug: string
  title: string
  description?: string | null
  requirements?: string | null
  evaluation_items?: { id: string; category: string; criteria: string; weight: number }[]
  genre: "engineering" | "design"
  order: number
  status: "active" | "archived"
}

/**
 * 同期リクエストのペイロード型（V4: mock_projects 追加）
 */
interface SyncRequest {
  contents: SyncContentItem[]
  quizzes?: SyncQuizItem[]
  mock_projects?: SyncMockProjectItem[]
  commit_hash?: string
  commit_message?: string
}

/**
 * 同期レスポンスの型（V4: mock_project_summary 追加）
 */
interface SyncResponse {
  success: boolean
  version_id?: string
  summary: {
    created: number
    archived: number
  }
  quiz_summary?: {
    created: number
    archived: number
  }
  mock_project_summary?: {
    created: number
    archived: number
  }
  errors?: string[]
}

/**
 * quiz の実差分を active バージョンと比較して計算する。
 * quiz 同期 RPC は同一 version_id 内の操作数を返すが、
 * 表示用には active バージョンとの比較が必要。
 */
async function computeQuizDiff(
  supabase: SupabaseClient,
  draftVersionId: string
): Promise<{ added: number; updated: number; deleted: number }> {
  // active バージョンを取得
  const { data: activeVersion } = await supabase
    .from("content_versions")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (!activeVersion) {
    // active がない場合、全クイズが新規
    const { count } = await supabase
      .from("quizzes")
      .select("id", { count: "exact", head: true })
      .eq("version_id", draftVersionId)
      .eq("status", "active")
    return { added: count ?? 0, updated: 0, deleted: 0 }
  }

  // 両バージョンのクイズを取得
  const { data: activeQuizzes } = await supabase
    .from("quizzes")
    .select("slug, genre, tutorial, chapter, section, title, questions")
    .eq("version_id", activeVersion.id)
    .eq("status", "active")

  const { data: draftQuizzes } = await supabase
    .from("quizzes")
    .select("slug, genre, tutorial, chapter, section, title, questions")
    .eq("version_id", draftVersionId)
    .eq("status", "active")

  const makeKey = (q: { genre: string; tutorial: string; chapter: string; section: string; slug: string }) =>
    `${q.genre}/${q.tutorial}/${q.chapter}/${q.section}/${q.slug}`

  const activeMap = new Map(
    (activeQuizzes ?? []).map((q) => [makeKey(q), q])
  )
  const draftMap = new Map(
    (draftQuizzes ?? []).map((q) => [makeKey(q), q])
  )

  let added = 0
  let updated = 0
  let deleted = 0

  for (const [key, draftQ] of draftMap) {
    const activeQ = activeMap.get(key)
    if (!activeQ) {
      added++
    } else if (
      draftQ.title !== activeQ.title ||
      JSON.stringify(draftQ.questions) !== JSON.stringify(activeQ.questions)
    ) {
      updated++
    }
  }

  for (const key of activeMap.keys()) {
    if (!draftMap.has(key)) {
      deleted++
    }
  }

  return { added, updated, deleted }
}

/**
 * ペイロードのバリデーション
 *
 * contents 配列の存在チェックと各アイテムの必須フィールドを検証する。
 * commit_hash のバリデーション: 指定された場合は文字列かつ空でないことを検証する。
 * quizzes 配列のバリデーション: 指定された場合は各アイテムの必須フィールドを検証する。
 */
function validatePayload(
  body: unknown
): { valid: true; data: SyncRequest } | { valid: false; errors: string[] } {
  if (!body || typeof body !== "object") {
    return { valid: false, errors: ["リクエストボディが不正です。"] }
  }

  const payload = body as Record<string, unknown>

  if (!Array.isArray(payload.contents)) {
    return {
      valid: false,
      errors: ["contents フィールドが存在しないか配列ではありません。"],
    }
  }

  if (payload.contents.length === 0) {
    return {
      valid: false,
      errors: ["contents 配列が空です。同期するコンテンツを指定してください。"],
    }
  }

  const requiredFields = ["slug_path", "title", "genre", "tutorial", "content_type"]
  const validContentTypes = ["genre", "tutorial", "chapter", "section"]
  const errors: string[] = []

  // commit_hash バリデーション: 指定されている場合は文字列かつ空でないことを検証
  if (payload.commit_hash !== undefined) {
    if (typeof payload.commit_hash !== "string" || payload.commit_hash === "") {
      errors.push(
        "commit_hash は空でない文字列である必要があります。"
      )
    }
  }

  for (let i = 0; i < payload.contents.length; i++) {
    const item = payload.contents[i] as Record<string, unknown>

    for (const field of requiredFields) {
      if (!item[field] || typeof item[field] !== "string") {
        errors.push(
          `contents[${i}]: 必須フィールド "${field}" が不足しているか不正です。`
        )
      }
    }

    if (
      item.content_type &&
      !validContentTypes.includes(item.content_type as string)
    ) {
      errors.push(
        `contents[${i}]: content_type "${item.content_type}" は無効です。genre, tutorial, chapter, section のいずれかを指定してください。`
      )
    }
  }

  // quizzes バリデーション: 指定されている場合のみ検証（後方互換性維持）
  if (payload.quizzes !== undefined) {
    if (!Array.isArray(payload.quizzes)) {
      errors.push("quizzes フィールドが配列ではありません。")
    } else {
      const quizRequiredFields = [
        "file_path",
        "slug",
        "section",
        "title",
        "genre",
        "tutorial",
        "chapter",
      ]

      for (let i = 0; i < payload.quizzes.length; i++) {
        const quiz = payload.quizzes[i] as Record<string, unknown>

        for (const field of quizRequiredFields) {
          if (!quiz[field] || typeof quiz[field] !== "string") {
            errors.push(
              `quizzes[${i}]: 必須フィールド "${field}" が不足しているか不正です。`
            )
          }
        }

        // questions 配列のバリデーション
        if (!Array.isArray(quiz.questions)) {
          errors.push(
            `quizzes[${i}]: questions フィールドが存在しないか配列ではありません。`
          )
        } else {
          const questionRequiredFields = ["id", "type", "text"]

          for (let j = 0; j < (quiz.questions as unknown[]).length; j++) {
            const question = (quiz.questions as Record<string, unknown>[])[j]

            for (const field of questionRequiredFields) {
              if (!question[field] || typeof question[field] !== "string") {
                errors.push(
                  `quizzes[${i}].questions[${j}]: 必須フィールド "${field}" が不足しているか不正です。`
                )
              }
            }

            if (!Array.isArray(question.options)) {
              errors.push(
                `quizzes[${i}].questions[${j}]: options フィールドが存在しないか配列ではありません。`
              )
            }

            if (
              question.correct === undefined ||
              question.correct === null
            ) {
              errors.push(
                `quizzes[${i}].questions[${j}]: correct フィールドが不足しています。`
              )
            }
          }
        }
      }
    }
  }

  // mock_projects バリデーション: 指定されている場合のみ検証（後方互換性維持）
  if (payload.mock_projects !== undefined) {
    if (!Array.isArray(payload.mock_projects)) {
      errors.push("mock_projects フィールドが配列ではありません。")
    } else {
      const mockProjectRequiredStringFields = ["slug", "title"]
      const validGenres = ["engineering", "design"]
      const validStatuses = ["active", "archived"]

      for (let i = 0; i < payload.mock_projects.length; i++) {
        const project = payload.mock_projects[i] as Record<string, unknown>

        for (const field of mockProjectRequiredStringFields) {
          if (!project[field] || typeof project[field] !== "string") {
            errors.push(
              `mock_projects[${i}]: 必須フィールド "${field}" が不足しているか不正です。`
            )
          }
        }

        // genre バリデーション
        if (!project.genre || !validGenres.includes(project.genre as string)) {
          errors.push(
            `mock_projects[${i}]: genre "${project.genre}" は無効です。engineering, design のいずれかを指定してください。`
          )
        }

        // status バリデーション
        if (project.status !== undefined && !validStatuses.includes(project.status as string)) {
          errors.push(
            `mock_projects[${i}]: status "${project.status}" は無効です。active, archived のいずれかを指定してください。`
          )
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, data: payload as unknown as SyncRequest }
}

/**
 * POST /api/admin/sync-curriculums
 *
 * GitHub Actions から呼び出されるコンテンツ・クイズ・模擬案件同期 API エンドポイント。
 *
 * 処理フロー:
 * 1. x-api-key ヘッダーによる API キー認証
 * 2. リクエストボディのバリデーション（commit_hash, quizzes, mock_projects 含む）
 * 3. createAdminClient() で RLS バイパス
 * 4. RPC sync_content_version の呼び出し（draft バージョン作成・上書き）
 * 5. quizzes フィールドが存在する場合、RPC sync_quiz_data の呼び出し
 * 6. mock_projects フィールドが存在する場合、RPC sync_mock_project_data の呼び出し
 * 7. version_id と変更サマリーを返却
 */
export async function POST(request: Request): Promise<NextResponse<SyncResponse>> {
  // 1. API キー認証
  const apiKey = request.headers.get("x-api-key")
  const expectedKey = process.env.SYNC_API_KEY

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      {
        success: false,
        summary: { created: 0, archived: 0 },
        errors: ["API キーが無効です。"],
      },
      { status: 401 }
    )
  }

  // 2. ペイロードバリデーション（gzip 対応）
  let body: unknown
  try {
    const contentEncoding = request.headers.get("content-encoding")
    if (contentEncoding === "gzip") {
      const buffer = Buffer.from(await request.arrayBuffer())
      const decompressed = gunzipSync(buffer)
      body = JSON.parse(decompressed.toString("utf-8"))
    } else {
      body = await request.json()
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        summary: { created: 0, archived: 0 },
        errors: ["リクエストボディの JSON パースに失敗しました。"],
      },
      { status: 400 }
    )
  }

  const validation = validatePayload(body)
  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        summary: { created: 0, archived: 0 },
        errors: validation.errors,
      },
      { status: 400 }
    )
  }

  const { data: payload } = validation

  // 3. commit_hash のフォールバック: 未指定時は 'unknown' を使用（後方互換性）
  const commitHash = payload.commit_hash ?? "unknown"

  // 4. Admin クライアントで RLS をバイパスし、RPC を呼び出す
  const supabase = createAdminClient()

  try {
    // RPC に渡すコンテンツデータを整形
    const rpcContents = payload.contents.map((item) => ({
      slug_path: item.slug_path,
      title: item.title,
      body: item.body ?? null,
      genre: item.genre,
      tutorial: item.tutorial,
      chapter: item.chapter ?? null,
      section: item.section ?? null,
      content_type: item.content_type,
      order: item.order ?? 0,
      metadata: item.metadata ?? null,
    }))

    const commitMessage = payload.commit_message ?? null

    const { data, error } = await supabase.rpc("sync_content_version", {
      p_commit_hash: commitHash,
      p_contents: rpcContents,
      p_commit_message: commitMessage,
    })

    if (error) {
      console.error("sync-curriculums RPC error:", error.message)
      return NextResponse.json(
        {
          success: false,
          summary: { created: 0, archived: 0 },
          errors: [
            `同期処理エラー: ${error.message}`,
          ],
        },
        { status: 500 }
      )
    }

    // 5. RPC の結果からレスポンスを構築
    const changesSummary = data.changes_summary as {
      added: number
      updated: number
      deleted: number
    }

    const summary = {
      created: changesSummary.added + changesSummary.updated,
      archived: changesSummary.deleted,
    }

    const versionId = data.version_id as string

    // 6. quizzes フィールドが存在する場合、クイズ同期を実行
    let quizSummary: { created: number; archived: number } | undefined

    if (payload.quizzes && payload.quizzes.length > 0) {
      const rpcQuizzes = payload.quizzes.map((quiz) => ({
        file_path: quiz.file_path,
        slug: quiz.slug,
        section: quiz.section,
        title: quiz.title,
        genre: quiz.genre,
        tutorial: quiz.tutorial,
        chapter: quiz.chapter,
        questions: quiz.questions,
      }))

      const { data: quizData, error: quizError } = await supabase.rpc(
        "sync_quiz_data",
        {
          p_version_id: versionId,
          p_quizzes: rpcQuizzes,
        }
      )

      if (quizError) {
        console.error("sync-curriculums quiz RPC error:", quizError.message)
        return NextResponse.json(
          {
            success: false,
            summary: { created: 0, archived: 0 },
            errors: [
              `クイズ同期処理エラー: ${quizError.message}`,
            ],
          },
          { status: 500 }
        )
      }

      const quizChangesSummary = quizData.quiz_changes_summary as {
        added: number
        updated: number
        deleted: number
      }

      // active バージョンとの実際の差分を計算して永続化
      const quizRealDiff = await computeQuizDiff(supabase, versionId)
      await supabase
        .from("content_versions")
        .update({ quiz_changes_summary: quizRealDiff })
        .eq("id", versionId)

      quizSummary = {
        created: quizChangesSummary.added + quizChangesSummary.updated,
        archived: quizChangesSummary.deleted,
      }
    }

    // 7. mock_projects フィールドが存在する場合、模擬案件同期を実行
    let mockProjectSummary: { created: number; archived: number } | undefined

    if (payload.mock_projects && payload.mock_projects.length > 0) {
      const rpcMockProjects = payload.mock_projects.map((project) => ({
        slug: project.slug,
        title: project.title,
        description: project.description ?? null,
        requirements: project.requirements ?? null,
        evaluation_items: project.evaluation_items ?? [],
        genre: project.genre,
        order: project.order ?? 0,
        status: project.status ?? "active",
      }))

      const { data: mockProjectData, error: mockProjectError } = await supabase.rpc(
        "sync_mock_project_data",
        {
          p_version_id: versionId,
          p_mock_projects: rpcMockProjects,
        }
      )

      if (mockProjectError) {
        console.error("sync-curriculums mock project RPC error:", mockProjectError.message)
        return NextResponse.json(
          {
            success: false,
            summary: { created: 0, archived: 0 },
            errors: [
              `模擬案件同期処理エラー: ${mockProjectError.message}`,
            ],
          },
          { status: 500 }
        )
      }

      const mockProjectChangesSummary = mockProjectData.mock_project_changes_summary as {
        added: number
        updated: number
        deleted: number
      }

      // mock_project サマリーを content_versions に永続化
      // mock_project RPC は slug でグローバルにマッチするため RPC 結果が実態を反映している
      await supabase
        .from("content_versions")
        .update({ mock_project_changes_summary: mockProjectChangesSummary })
        .eq("id", versionId)

      mockProjectSummary = {
        created: mockProjectChangesSummary.added + mockProjectChangesSummary.updated,
        archived: mockProjectChangesSummary.deleted,
      }
    }

    const response: SyncResponse = {
      success: true,
      version_id: versionId,
      summary,
    }

    if (quizSummary) {
      response.quiz_summary = quizSummary
    }

    if (mockProjectSummary) {
      response.mock_project_summary = mockProjectSummary
    }

    return NextResponse.json(response)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました"
    console.error("sync-curriculums unexpected error:", errorMessage)

    return NextResponse.json(
      {
        success: false,
        summary: { created: 0, archived: 0 },
        errors: [errorMessage],
      },
      { status: 500 }
    )
  }
}
