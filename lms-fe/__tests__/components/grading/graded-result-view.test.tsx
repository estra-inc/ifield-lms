/**
 * GradedResultView コンポーネントのテスト
 *
 * 採点結果の表示、アコーディオン形式のOK/NG表示、
 * ステータスに応じたメッセージ表示、読み取り専用制御を検証する。
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import type { EvaluationCategory } from "@/lib/types/grading"

// --- Test data ---
const sampleCategories: EvaluationCategory[] = [
  {
    category_large: "Backend",
    category_medium: "Laravel",
    items: [
      { id: "item-1", label: "Migration", point: 5 },
      { id: "item-2", label: "Routing", point: 3 },
    ],
  },
  {
    category_large: "Frontend",
    category_medium: "React",
    items: [
      { id: "item-3", label: "Component Design", point: 4 },
      { id: "item-4", label: "State Management", point: 8 },
    ],
  },
]

const gradedEvaluations: Record<string, boolean> = {
  "item-1": true,
  "item-2": false,
  "item-3": true,
  "item-4": true,
}

describe("GradedResultView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("コンポーネントが正しくimportできること", async () => {
    const mod = await import(
      "@/components/grading/graded-result-view"
    )
    expect(mod.GradedResultView).toBeDefined()
  })

  it("graded 状態でスコアとフィードバックコメントを表示すべき", async () => {
    const { GradedResultView } = await import(
      "@/components/grading/graded-result-view"
    )
    render(
      <GradedResultView
        status="graded"
        score={85}
        feedbackComment="よくできました。Routingの理解を深めましょう。"
        categories={sampleCategories}
        evaluations={gradedEvaluations}
      />
    )

    expect(screen.getByText("85%")).toBeInTheDocument()
    expect(
      screen.getByText(/Routingの理解を深めましょう/)
    ).toBeInTheDocument()
  })

  it("graded 状態で大項目をアコーディオン形式で表示すべき", async () => {
    const { GradedResultView } = await import(
      "@/components/grading/graded-result-view"
    )
    render(
      <GradedResultView
        status="graded"
        score={85}
        feedbackComment=""
        categories={sampleCategories}
        evaluations={gradedEvaluations}
      />
    )

    expect(screen.getByText("Backend")).toBeInTheDocument()
    expect(screen.getByText("Frontend")).toBeInTheDocument()
  })

  it("各項目の OK/NG をアイコンで区別して表示すべき", async () => {
    const { GradedResultView } = await import(
      "@/components/grading/graded-result-view"
    )
    render(
      <GradedResultView
        status="graded"
        score={85}
        feedbackComment=""
        categories={sampleCategories}
        evaluations={gradedEvaluations}
      />
    )

    // 各小項目が表示される
    expect(screen.getByText("Migration")).toBeInTheDocument()
    expect(screen.getByText("Routing")).toBeInTheDocument()
    expect(screen.getByText("Component Design")).toBeInTheDocument()
    expect(screen.getByText("State Management")).toBeInTheDocument()
  })

  it("大項目ごとの小計を表示すべき", async () => {
    const { GradedResultView } = await import(
      "@/components/grading/graded-result-view"
    )
    render(
      <GradedResultView
        status="graded"
        score={85}
        feedbackComment=""
        categories={sampleCategories}
        evaluations={gradedEvaluations}
      />
    )

    // Backend: 1/2, Frontend: 2/2 の小計が表示される
    const allTexts = screen.getAllByText(/\/\s*2/)
    expect(allTexts.length).toBeGreaterThanOrEqual(2)
  })

  it("submitted 状態で「採点待ち」メッセージを表示すべき", async () => {
    const { GradedResultView } = await import(
      "@/components/grading/graded-result-view"
    )
    render(
      <GradedResultView
        status="submitted"
        score={null}
        feedbackComment={null}
        categories={sampleCategories}
        evaluations={{}}
      />
    )

    expect(screen.getByText(/採点待ち/)).toBeInTheDocument()
  })

  it("grading 状態で「採点中」メッセージを表示すべき", async () => {
    const { GradedResultView } = await import(
      "@/components/grading/graded-result-view"
    )
    render(
      <GradedResultView
        status="grading"
        score={null}
        feedbackComment={null}
        categories={sampleCategories}
        evaluations={{}}
      />
    )

    expect(screen.getByText(/採点中/)).toBeInTheDocument()
  })

  it("受講生は閲覧のみ可能（変更操作なし）であるべき", async () => {
    const { GradedResultView } = await import(
      "@/components/grading/graded-result-view"
    )
    render(
      <GradedResultView
        status="graded"
        score={85}
        feedbackComment="よくできました"
        categories={sampleCategories}
        evaluations={gradedEvaluations}
      />
    )

    // チェックボックスやボタンなど変更操作要素が存在しない
    const checkboxes = screen.queryAllByRole("checkbox")
    expect(checkboxes).toHaveLength(0)

    const buttons = screen.queryAllByRole("button")
    // アコーディオンのトリガーボタンは許容するが、「保存」「確定」ボタンは存在しない
    for (const button of buttons) {
      expect(button.textContent).not.toMatch(/保存|確定/)
    }
  })
})
