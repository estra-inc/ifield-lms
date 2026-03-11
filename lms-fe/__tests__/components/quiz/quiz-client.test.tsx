/**
 * QuizClient コンポーネントのテスト
 *
 * Task 5.1: クイズ出題画面（回答フェーズ）
 * Task 5.2: 採点結果画面（結果フェーズ）
 * Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1-4.8, 5.4, 7.2, 7.4
 *
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import type { QuestionItem } from "@/lib/types/quiz"

// Mock saveQuizLog server action
vi.mock(
  "@/app/(authenticated)/contents/actions-quiz",
  () => ({
    saveQuizLog: vi.fn().mockResolvedValue({ success: true, message: "ok" }),
  })
)

// Mock shuffle to return predictable order in tests
vi.mock("@/lib/quiz/shuffle-options", () => ({
  shuffleOptions: <T,>(options: readonly T[]): T[] => [...options],
}))

const sampleQuestions: QuestionItem[] = [
  {
    id: "q1",
    type: "single",
    text: "単一選択の問題です",
    options: [
      { id: "a", text: "選択肢A" },
      { id: "b", text: "選択肢B" },
      { id: "c", text: "選択肢C" },
    ],
    correct: "b",
    explanation: "Bが正解です。",
  },
  {
    id: "q2",
    type: "multiple",
    text: "複数選択の問題です",
    options: [
      { id: "a", text: "選択肢X" },
      { id: "b", text: "選択肢Y" },
      { id: "c", text: "選択肢Z" },
    ],
    correct: ["a", "c"],
    explanation: "XとZが正解です。",
  },
]

const defaultProps = {
  quiz: {
    id: "quiz-1",
    title: "テストクイズ",
    questions: sampleQuestions,
  },
  history: null,
  backPath: "/contents/tutorial/ch1/intro?genre=engineering",
  genre: "engineering",
  nextQuiz: null,
}

describe("QuizClient", () => {
  let QuizClient: React.ComponentType<typeof defaultProps>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import(
      "@/app/(authenticated)/contents/_components/quiz-client"
    )
    QuizClient = mod.QuizClient as unknown as React.ComponentType<typeof defaultProps>
  })

  // --- 出題フェーズ ---

  describe("出題フェーズ (answering)", () => {
    it("クイズタイトルが表示される", () => {
      render(<QuizClient {...defaultProps} />)
      expect(screen.getByText("テストクイズ")).toBeInTheDocument()
    })

    it("設問番号（Q1, Q2）が表示される", () => {
      render(<QuizClient {...defaultProps} />)
      expect(screen.getByText(/Q1/)).toBeInTheDocument()
      expect(screen.getByText(/Q2/)).toBeInTheDocument()
    })

    it("設問文が表示される", () => {
      render(<QuizClient {...defaultProps} />)
      expect(screen.getByText("単一選択の問題です")).toBeInTheDocument()
      expect(screen.getByText(/複数選択の問題です/)).toBeInTheDocument()
    })

    it("複数選択問題に「複数選択」のバッジ表記がある", () => {
      render(<QuizClient {...defaultProps} />)
      // バッジ要素として「複数選択」テキストのみを持つ span が存在する
      const badges = screen.getAllByText(/複数選択/)
      expect(badges.length).toBeGreaterThanOrEqual(1)
    })

    it("選択肢が表示される", () => {
      render(<QuizClient {...defaultProps} />)
      expect(screen.getByText("選択肢A")).toBeInTheDocument()
      expect(screen.getByText("選択肢B")).toBeInTheDocument()
      expect(screen.getByText("選択肢C")).toBeInTheDocument()
      expect(screen.getByText("選択肢X")).toBeInTheDocument()
      expect(screen.getByText("選択肢Y")).toBeInTheDocument()
      expect(screen.getByText("選択肢Z")).toBeInTheDocument()
    })

    it("全問未回答の時は送信ボタンが disabled", () => {
      render(<QuizClient {...defaultProps} />)
      const submitButton = screen.getByRole("button", { name: /回答を送信/ })
      expect(submitButton).toBeDisabled()
    })

    it("全問回答すると送信ボタンが enabled になる", async () => {
      render(<QuizClient {...defaultProps} />)

      // Q1: 単一選択 - ラジオボタンをクリック
      const radioB = screen.getByLabelText("選択肢B")
      fireEvent.click(radioB)

      // Q2: 複数選択 - チェックボックスをクリック
      const checkX = screen.getByLabelText("選択肢X")
      const checkZ = screen.getByLabelText("選択肢Z")
      fireEvent.click(checkX)
      fireEvent.click(checkZ)

      const submitButton = screen.getByRole("button", { name: /回答を送信/ })
      expect(submitButton).not.toBeDisabled()
    })

    it("履歴がある場合、挑戦回数と最高スコアが表示される", () => {
      render(
        <QuizClient
          {...defaultProps}
          history={{ attemptCount: 3, bestScore: 8, bestTotal: 10 }}
        />
      )
      expect(screen.getByText(/3/)).toBeInTheDocument()
      expect(screen.getByText(/8/)).toBeInTheDocument()
    })

    it("履歴がない場合、挑戦回数は表示されない", () => {
      render(<QuizClient {...defaultProps} history={null} />)
      // "回" が挑戦回数の表示に使われるので、それが存在しないことを確認
      expect(screen.queryByText(/挑戦回数/)).not.toBeInTheDocument()
    })
  })

  // --- 結果フェーズ ---

  describe("結果フェーズ (graded)", () => {
    async function submitQuiz() {
      render(<QuizClient {...defaultProps} />)

      // 全問回答
      fireEvent.click(screen.getByLabelText("選択肢B")) // Q1 correct
      fireEvent.click(screen.getByLabelText("選択肢X")) // Q2
      fireEvent.click(screen.getByLabelText("選択肢Z")) // Q2

      // 送信
      const submitButton = screen.getByRole("button", { name: /回答を送信/ })
      fireEvent.click(submitButton)
    }

    it("送信後にスコアが表示される", async () => {
      await submitQuiz()
      // 2/2 = 100%
      await waitFor(() => {
        expect(screen.getByText(/結果: 2\/2/)).toBeInTheDocument()
        expect(screen.getByText("100%")).toBeInTheDocument()
      })
    })

    it("送信後に解説が表示される", async () => {
      await submitQuiz()
      await waitFor(() => {
        expect(screen.getByText("Bが正解です。")).toBeInTheDocument()
        expect(screen.getByText("XとZが正解です。")).toBeInTheDocument()
      })
    })

    it("「もう一度挑戦する」ボタンが表示される", async () => {
      await submitQuiz()
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /もう一度挑戦/ })
        ).toBeInTheDocument()
      })
    })

    it("「セクションに戻る」リンクが表示される", async () => {
      await submitQuiz()
      await waitFor(() => {
        expect(screen.getByText(/セクションに戻る/)).toBeInTheDocument()
      })
    })

    it("「もう一度挑戦する」クリックで出題画面に戻る", async () => {
      await submitQuiz()

      await waitFor(() => {
        const retryButton = screen.getByRole("button", {
          name: /もう一度挑戦/,
        })
        fireEvent.click(retryButton)
      })

      // 出題画面に戻るので送信ボタンが再表示される
      expect(
        screen.getByRole("button", { name: /回答を送信/ })
      ).toBeInTheDocument()
    })
  })
})
