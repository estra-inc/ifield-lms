/**
 * クイズページ loading.tsx のテスト
 *
 * Task 4.2: クイズページのローディング状態
 * Requirements: 7.3
 *
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react"

describe("QuizLoading", () => {
  it("Skeleton UI がレンダリングされる", async () => {
    const { default: QuizLoading } = await import(
      "@/app/(authenticated)/contents/[tutorial]/[chapter]/[section]/quiz/loading"
    )

    const { container } = render(<QuizLoading />)

    // animate-pulse クラスを持つ要素（Skeleton）が複数存在する
    const skeletons = container.querySelectorAll(".animate-pulse")
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("パンくず Skeleton 領域が含まれる", async () => {
    const { default: QuizLoading } = await import(
      "@/app/(authenticated)/contents/[tutorial]/[chapter]/[section]/quiz/loading"
    )

    const { container } = render(<QuizLoading />)

    // px-10 py-5 の親コンテナが存在する（パンくず領域）
    const breadcrumbArea = container.querySelector(".px-10.py-5")
    expect(breadcrumbArea).not.toBeNull()
  })
})
