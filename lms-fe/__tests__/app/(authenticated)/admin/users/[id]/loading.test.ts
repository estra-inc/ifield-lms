/**
 * ユーザー詳細ページ ローディング・404表示のテスト
 *
 * loading.tsx と not-found.tsx が正しくエクスポートされることを検証する。
 */

describe("ユーザー詳細ローディング", () => {
  it("loading.tsx モジュールが存在し、デフォルトエクスポートが関数である", async () => {
    const mod = await import(
      "@/app/(authenticated)/admin/users/[id]/loading"
    )
    expect(mod).toBeDefined()
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe("function")
  })
})

describe("ユーザー詳細404", () => {
  it("not-found.tsx モジュールが存在し、デフォルトエクスポートが関数である", async () => {
    const mod = await import(
      "@/app/(authenticated)/admin/users/[id]/not-found"
    )
    expect(mod).toBeDefined()
    expect(mod.default).toBeDefined()
    expect(typeof mod.default).toBe("function")
  })
})
