import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type {
  SearchAPIResponse,
  SearchAPIErrorResponse,
  SearchResult,
  SearchResultRaw,
} from "@/lib/types/search"

/**
 * RPC の snake_case 結果を camelCase の SearchResult に変換する
 */
function mapToSearchResult(raw: SearchResultRaw): SearchResult {
  return {
    id: raw.id,
    title: raw.title,
    snippet: raw.snippet,
    genre: raw.genre,
    tutorial: raw.tutorial,
    chapter: raw.chapter,
    section: raw.section,
    genreTitle: raw.genre_title,
    tutorialTitle: raw.tutorial_title,
    chapterTitle: raw.chapter_title,
    score: raw.score,
  }
}

/**
 * GET /api/search
 *
 * 教材コンテンツのあいまい検索 API エンドポイント。
 *
 * 処理フロー:
 * 1. Supabase Server Client で認証チェック
 * 2. クエリパラメータ `q` のバリデーション
 * 3. search_contents RPC を呼び出し
 * 4. 結果を SearchAPIResponse 形式で返却
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.4
 */
export async function GET(
  request: Request
): Promise<NextResponse<SearchAPIResponse | SearchAPIErrorResponse>> {
  // 1. 認証チェック (Req 6.4, 7.1)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "認証が必要です" },
      { status: 401 }
    )
  }

  // 2. クエリパラメータバリデーション (Req 6.5)
  const { searchParams } = new URL(request.url)
  const rawQuery = searchParams.get("q")
  const query = rawQuery?.trim() ?? ""

  if (query.length < 2) {
    return NextResponse.json(
      { error: "検索クエリは2文字以上で入力してください" },
      { status: 400 }
    )
  }

  // 3. search_contents RPC 呼び出し (Req 6.2, 7.4)
  try {
    const { data, error } = await supabase.rpc("search_contents", {
      search_query: query,
    })

    if (error) {
      console.error("search API RPC error:", error.message)
      return NextResponse.json(
        { error: "検索中にエラーが発生しました" },
        { status: 500 }
      )
    }

    // 4. 結果を整形して返却 (Req 6.3)
    const results: SearchResult[] = (data as SearchResultRaw[]).map(
      mapToSearchResult
    )

    return NextResponse.json({
      results,
      query,
      total: results.length,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "不明なエラーが発生しました"
    console.error("search API unexpected error:", errorMessage)

    return NextResponse.json(
      { error: "検索中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
