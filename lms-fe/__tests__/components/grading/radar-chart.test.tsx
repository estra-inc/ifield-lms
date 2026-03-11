/**
 * RadarChart コンポーネントのテスト
 *
 * Nivo (@nivo/radar) を使用したレーダーチャート描画、
 * 1軸以下時のプログレスバーフォールバック、レスポンシブ対応を検証する。
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"

// --- Test data ---
const multiAxisData = [
  { axis: "Backend", value: 80, fullMark: 100 },
  { axis: "Frontend", value: 65, fullMark: 100 },
  { axis: "Infrastructure", value: 45, fullMark: 100 },
  { axis: "Design", value: 90, fullMark: 100 },
]

const singleAxisData = [{ axis: "Backend", value: 80, fullMark: 100 }]

const emptyData: { axis: string; value: number; fullMark: number }[] = []

describe("RadarChart", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("コンポーネントが正しくimportできること", async () => {
    const mod = await import("@/components/grading/radar-chart")
    expect(mod.RadarChart).toBeDefined()
  })

  it("2軸以上のデータでレーダーチャートを描画すべき", async () => {
    const { RadarChart } = await import("@/components/grading/radar-chart")
    const { container } = render(<RadarChart data={multiAxisData} />)

    // レーダーチャートのコンテナが存在する
    const chartContainer = container.querySelector("[data-testid='radar-chart-container']")
    expect(chartContainer).not.toBeNull()

    // プログレスバーは表示されない
    expect(screen.queryByTestId("progress-bar-fallback")).toBeNull()
  })

  it("各軸名を表示すべき", async () => {
    const { RadarChart } = await import("@/components/grading/radar-chart")
    render(<RadarChart data={multiAxisData} />)

    // 軸名がレンダリングされている（sr-only + 視覚的ラベルで複数存在しうる）
    for (const d of multiAxisData) {
      const matches = screen.getAllByText(new RegExp(d.axis))
      expect(matches.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("各軸の達成率（%）を表示すべき", async () => {
    const { RadarChart } = await import("@/components/grading/radar-chart")
    render(<RadarChart data={multiAxisData} />)

    // 達成率が表示されている（sr-only + 視覚的ラベルで複数存在しうる）
    for (const d of multiAxisData) {
      const matches = screen.getAllByText(new RegExp(`${d.value}%`))
      expect(matches.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("1軸以下の場合はプログレスバー形式にフォールバックすべき", async () => {
    const { RadarChart } = await import("@/components/grading/radar-chart")
    render(<RadarChart data={singleAxisData} />)

    // プログレスバーが表示される
    expect(screen.getByTestId("progress-bar-fallback")).toBeInTheDocument()

    // レーダーチャートは表示されない
    expect(screen.queryByTestId("radar-chart-container")).toBeNull()
  })

  it("空データの場合はプログレスバー形式にフォールバックすべき", async () => {
    const { RadarChart } = await import("@/components/grading/radar-chart")
    render(<RadarChart data={emptyData} />)

    // プログレスバーが表示される
    expect(screen.getByTestId("progress-bar-fallback")).toBeInTheDocument()
  })

  it("1軸データのプログレスバーで軸名と達成率を表示すべき", async () => {
    const { RadarChart } = await import("@/components/grading/radar-chart")
    render(<RadarChart data={singleAxisData} />)

    expect(screen.getByText("Backend")).toBeInTheDocument()
    expect(screen.getByText(/80%/)).toBeInTheDocument()
  })

  it("'use client' コンポーネントとして実装されるべき", async () => {
    // コンポーネントファイルの先頭に "use client" がある
    const fs = await import("fs")
    const content = fs.readFileSync(
      "/Users/kitamurayua/dev/i-field/lms-fe/components/grading/radar-chart.tsx",
      "utf-8"
    )
    expect(content.startsWith('"use client"')).toBe(true)
  })
})
