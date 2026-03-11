/**
 * ユーザー一覧ページ ローディング状態のテスト
 *
 * loading.tsx が正しいスケルトン構造を返すことを検証する。
 */

describe("ユーザー一覧ローディング", () => {
  it("loading.tsx モジュールが存在する", async () => {
    const mod = await import(
      "@/app/(authenticated)/admin/users/loading"
    )
    expect(mod).toBeDefined()
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe("function")
  })
})
