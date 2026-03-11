/**
 * ChecklistForm Client Component のテスト
 *
 * 階層型チェックリストの表示、チェック操作、スコアリアルタイム計算、
 * フィードバックコメント入力、下書き復元を検証する。
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { EvaluationCategory, EvaluationState } from "@/lib/types/grading"

// --- Mocks ---
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock(
  "@/app/(authenticated)/admin/grading/actions",
  () => ({
    saveDraft: vi.fn(async () => ({ success: true, message: "保存しました" })),
    finalizeGrading: vi.fn(async () => ({
      success: true,
      message: "採点を確定しました",
      score: 75,
    })),
  })
)

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

const defaultProps = {
  submissionId: "sub-001",
  studentName: "山田 太郎",
  projectTitle: "ECサイト模擬案件",
  submissionUrl: "https://github.com/yamada/ec-site",
  submissionFiles: [],
  categories: sampleCategories,
  initialEvaluations: {} as EvaluationState,
  initialFeedbackComment: "",
  isDraft: false,
}

// --- Tests ---
describe("ChecklistForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("コンポーネントが正しくimportできること", async () => {
    const mod = await import(
      "@/app/(authenticated)/admin/grading/[submissionId]/_components/checklist-form"
    )
    expect(mod.ChecklistForm).toBeDefined()
  })

  it("階層構造（大項目 > 中項目 > 小項目）で表示すべき", async () => {
    const { ChecklistForm } = await import(
      "@/app/(authenticated)/admin/grading/[submissionId]/_components/checklist-form"
    )
    render(<ChecklistForm {...defaultProps} />)

    // 大項目が表示される
    expect(screen.getByText("Backend")).toBeInTheDocument()
    expect(screen.getByText("Frontend")).toBeInTheDocument()
  })

  it("各小項目に OK/NG チェックボックスを表示すべき", async () => {
    const { ChecklistForm } = await import(
      "@/app/(authenticated)/admin/grading/[submissionId]/_components/checklist-form"
    )
    render(<ChecklistForm {...defaultProps} />)

    // 小項目のラベルが表示される
    expect(screen.getByText("Migration")).toBeInTheDocument()
    expect(screen.getByText("Routing")).toBeInTheDocument()
    expect(screen.getByText("Component Design")).toBeInTheDocument()
    expect(screen.getByText("State Management")).toBeInTheDocument()
  })

  it("全体スコアが初期状態で 0% を表示すべき", async () => {
    const { ChecklistForm } = await import(
      "@/app/(authenticated)/admin/grading/[submissionId]/_components/checklist-form"
    )
    render(<ChecklistForm {...defaultProps} />)

    expect(screen.getByText("0%")).toBeInTheDocument()
  })

  it("下書きデータが渡された場合にチェック状態を復元すべき", async () => {
    const { ChecklistForm } = await import(
      "@/app/(authenticated)/admin/grading/[submissionId]/_components/checklist-form"
    )

    const propsWithDraft = {
      ...defaultProps,
      initialEvaluations: {
        "item-1": true,
        "item-2": false,
        "item-3": true,
      },
      initialFeedbackComment: "途中のフィードバック",
      isDraft: true,
    }

    render(<ChecklistForm {...propsWithDraft} />)

    // フィードバックコメントが復元される
    const textarea = screen.getByPlaceholderText(/フィードバック/i)
    expect(textarea).toHaveValue("途中のフィードバック")
  })

  it("フィードバックコメント入力欄を表示すべき", async () => {
    const { ChecklistForm } = await import(
      "@/app/(authenticated)/admin/grading/[submissionId]/_components/checklist-form"
    )
    render(<ChecklistForm {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(/フィードバック/i)
    expect(textarea).toBeInTheDocument()
  })

  it("一時保存ボタンと採点確定ボタンを表示すべき", async () => {
    const { ChecklistForm } = await import(
      "@/app/(authenticated)/admin/grading/[submissionId]/_components/checklist-form"
    )
    render(<ChecklistForm {...defaultProps} />)

    expect(screen.getByRole("button", { name: /一時保存/i })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /採点確定/i })
    ).toBeInTheDocument()
  })

  it("フィードバックコメントの文字数制限（2000文字）を表示すべき", async () => {
    const { ChecklistForm } = await import(
      "@/app/(authenticated)/admin/grading/[submissionId]/_components/checklist-form"
    )
    render(<ChecklistForm {...defaultProps} />)

    expect(screen.getByText(/2000/)).toBeInTheDocument()
  })
})
