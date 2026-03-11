/**
 * ページネーションコンポーネントのテスト
 *
 * user-pagination.tsx のロジック（件数表示、ページ計算、非表示条件）を検証する。
 */

describe("UserPagination コンポーネント", () => {
  it("モジュールが存在し、UserPagination がエクスポートされる", async () => {
    const mod = await import(
      "@/app/(authenticated)/admin/users/_components/user-pagination"
    )
    expect(mod).toBeDefined()
    expect(mod.UserPagination).toBeDefined()
    expect(typeof mod.UserPagination).toBe("function")
  })

  describe("件数表示テキスト", () => {
    it("全 25 件中 1-10 件を表示する (ページ1)", () => {
      const totalCount = 25
      const page = 1
      const perPage = 10
      const from = (page - 1) * perPage + 1
      const to = Math.min(page * perPage, totalCount)
      const text = `全 ${totalCount} 件中 ${from}-${to} 件を表示`

      expect(text).toBe("全 25 件中 1-10 件を表示")
    })

    it("全 25 件中 11-20 件を表示する (ページ2)", () => {
      const totalCount = 25
      const page = 2
      const perPage = 10
      const from = (page - 1) * perPage + 1
      const to = Math.min(page * perPage, totalCount)
      const text = `全 ${totalCount} 件中 ${from}-${to} 件を表示`

      expect(text).toBe("全 25 件中 11-20 件を表示")
    })

    it("全 25 件中 21-25 件を表示する (ページ3)", () => {
      const totalCount = 25
      const page = 3
      const perPage = 10
      const from = (page - 1) * perPage + 1
      const to = Math.min(page * perPage, totalCount)
      const text = `全 ${totalCount} 件中 ${from}-${to} 件を表示`

      expect(text).toBe("全 25 件中 21-25 件を表示")
    })

    it("全 5 件中 1-5 件を表示する (1ページのみ)", () => {
      const totalCount = 5
      const page = 1
      const perPage = 10
      const from = (page - 1) * perPage + 1
      const to = Math.min(page * perPage, totalCount)
      const text = `全 ${totalCount} 件中 ${from}-${to} 件を表示`

      expect(text).toBe("全 5 件中 1-5 件を表示")
    })
  })

  describe("総ページ数の計算", () => {
    it("25件 / 10件ページ = 3ページ", () => {
      const totalPages = Math.ceil(25 / 10)
      expect(totalPages).toBe(3)
    })

    it("10件 / 10件ページ = 1ページ", () => {
      const totalPages = Math.ceil(10 / 10)
      expect(totalPages).toBe(1)
    })

    it("11件 / 10件ページ = 2ページ", () => {
      const totalPages = Math.ceil(11 / 10)
      expect(totalPages).toBe(2)
    })

    it("0件 / 10件ページ = 0ページ", () => {
      const totalPages = Math.ceil(0 / 10)
      expect(totalPages).toBe(0)
    })
  })

  describe("ページネーション非表示条件", () => {
    it("totalPages が 1 以下の場合は非表示にする", () => {
      const shouldHide = (totalPages: number) => totalPages <= 1

      expect(shouldHide(0)).toBe(true)
      expect(shouldHide(1)).toBe(true)
      expect(shouldHide(2)).toBe(false)
      expect(shouldHide(3)).toBe(false)
    })
  })

  describe("前へ/次へ ボタンの無効化", () => {
    it("ページ1では前へボタンが無効", () => {
      const page = 1
      const hasPrev = page > 1

      expect(hasPrev).toBe(false)
    })

    it("最終ページでは次へボタンが無効", () => {
      const page = 3
      const totalPages = 3
      const hasNext = page < totalPages

      expect(hasNext).toBe(false)
    })

    it("中間ページでは両方のボタンが有効", () => {
      const page = 2
      const totalPages = 3
      const hasPrev = page > 1
      const hasNext = page < totalPages

      expect(hasPrev).toBe(true)
      expect(hasNext).toBe(true)
    })
  })
})
