"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { SearchResult, SearchAPIResponse } from "@/lib/types/search"

/**
 * useSearch カスタムフック
 *
 * 検索クエリの状態管理、300msデバウンス、API呼び出し、
 * AbortControllerによる競合リクエストキャンセルを統合する。
 *
 * Requirements: 3.1, 3.5, 3.6, 3.8
 */

interface UseSearchReturn {
  query: string
  setQuery: (query: string) => void
  results: SearchResult[]
  isLoading: boolean
  error: string | null
}

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const executeSearch = useCallback(async (searchQuery: string) => {
    // 前のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const trimmed = searchQuery.trim()

    // 2文字未満はAPI呼び出しせずリセット (Req 3.5)
    if (trimmed.length < 2) {
      setResults([])
      setIsLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "検索中にエラーが発生しました")
      }

      const data: SearchAPIResponse = await response.json()
      setResults(data.results)
      setIsLoading(false)
    } catch (err) {
      // AbortError は無視（新しいリクエストで置き換え済み）
      if (err instanceof DOMException && err.name === "AbortError") {
        return
      }

      setResults([])
      setIsLoading(false)
      setError(
        err instanceof Error ? err.message : "検索中にエラーが発生しました"
      )
    }
  }, [])

  // 300ms デバウンス (Req 3.1)
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, executeSearch])

  // クリーンアップ: アンマウント時にリクエストをキャンセル
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return { query, setQuery, results, isLoading, error }
}
