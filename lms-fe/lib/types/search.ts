/**
 * 検索機能の型定義
 *
 * semantic-search 仕様に基づく検索結果・APIレスポンスの型。
 */

/** 検索結果1件の型定義 */
export interface SearchResult {
  id: string
  title: string
  snippet: string
  genre: string
  tutorial: string
  chapter: string
  section: string
  genreTitle: string
  tutorialTitle: string
  chapterTitle: string
  score: number
}

/** 検索APIの成功レスポンス */
export interface SearchAPIResponse {
  results: SearchResult[]
  query: string
  total: number
}

/** 検索APIのエラーレスポンス */
export interface SearchAPIErrorResponse {
  error: string
}

/** RPC から返却される検索結果の型（snake_case） */
export interface SearchResultRaw {
  id: string
  title: string
  snippet: string
  genre: string
  tutorial: string
  chapter: string
  section: string
  genre_title: string
  tutorial_title: string
  chapter_title: string
  score: number
}
