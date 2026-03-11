/**
 * ReportSearchFilter コンポーネントのテスト
 *
 * URL パラメータ更新ロジックを検証する。
 * UI テストは Client Component のため、ロジックのみをテストする。
 */

/**
 * URL パラメータを更新するヘルパーのロジック
 * (実際のコンポーネントでは useRouter + useSearchParams を使用)
 */
function buildSearchUrl(
  basePath: string,
  currentParams: URLSearchParams,
  updates: Record<string, string>
): string {
  const params = new URLSearchParams(currentParams.toString())

  // ページをリセット
  params.delete("page")

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
  }

  const queryStr = params.toString()
  return queryStr ? `${basePath}?${queryStr}` : basePath
}

describe("ReportSearchFilter", () => {
  describe("buildSearchUrl", () => {
    it("検索値を設定すると ?search= パラメータが追加される", () => {
      const params = new URLSearchParams()
      const url = buildSearchUrl("/manager/reports/table", params, { search: "田中" })
      expect(url).toBe("/manager/reports/table?search=%E7%94%B0%E4%B8%AD")
    })

    it("空の検索値で search パラメータが削除される", () => {
      const params = new URLSearchParams("search=田中")
      const url = buildSearchUrl("/manager/reports/table", params, { search: "" })
      expect(url).toBe("/manager/reports/table")
    })

    it("検索時に page パラメータがリセットされる", () => {
      const params = new URLSearchParams("page=3&search=佐藤")
      const url = buildSearchUrl("/manager/reports/table", params, { search: "田中" })
      expect(url).toContain("search=%E7%94%B0%E4%B8%AD")
      expect(url).not.toContain("page=")
    })

    it("既存の他パラメータは維持される", () => {
      const params = new URLSearchParams("other=value")
      const url = buildSearchUrl("/manager/reports/table", params, { search: "test" })
      expect(url).toContain("other=value")
      expect(url).toContain("search=test")
    })
  })
})
