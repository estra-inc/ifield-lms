/**
 * gradeQuiz 採点関数のテスト
 *
 * Task 3.1: クライアントサイドの採点関数
 * Requirements: 4.1, 4.2
 *
 * - 単一選択問題の正誤判定
 * - 複数選択問題の完全一致判定（順序不問）
 * - 正答数、総問題数、正答率の算出
 * - 各問題の正誤詳細の返却
 */
import type { QuestionItem } from "@/lib/types/quiz"
import type { UserAnswer, GradeResult, QuestionResult } from "@/lib/quiz/grade-quiz"

describe("gradeQuiz", () => {
  let gradeQuiz: (
    questions: QuestionItem[],
    answers: UserAnswer[]
  ) => GradeResult

  beforeEach(async () => {
    const mod = await import("@/lib/quiz/grade-quiz")
    gradeQuiz = mod.gradeQuiz
  })

  // --- 単一選択問題 ---

  describe("単一選択問題 (type: single)", () => {
    const singleQuestion: QuestionItem = {
      id: "q1",
      type: "single",
      text: "JavaScriptで変数を宣言するキーワードはどれですか？",
      options: [
        { id: "a", text: "var" },
        { id: "b", text: "let" },
        { id: "c", text: "const" },
        { id: "d", text: "上記すべて" },
      ],
      correct: "d",
      explanation: "var, let, const はいずれもJavaScriptで変数を宣言するために使用できます。",
    }

    it("正解の場合 isCorrect: true を返す", () => {
      const result = gradeQuiz([singleQuestion], [
        { questionId: "q1", selectedOptionIds: ["d"] },
      ])

      expect(result.questionResults[0].isCorrect).toBe(true)
      expect(result.score).toBe(1)
    })

    it("不正解の場合 isCorrect: false を返す", () => {
      const result = gradeQuiz([singleQuestion], [
        { questionId: "q1", selectedOptionIds: ["a"] },
      ])

      expect(result.questionResults[0].isCorrect).toBe(false)
      expect(result.score).toBe(0)
    })

    it("正しい選択肢IDを correctOptionIds に返す", () => {
      const result = gradeQuiz([singleQuestion], [
        { questionId: "q1", selectedOptionIds: ["a"] },
      ])

      expect(result.questionResults[0].correctOptionIds).toEqual(["d"])
    })

    it("ユーザーの選択を selectedOptionIds に返す", () => {
      const result = gradeQuiz([singleQuestion], [
        { questionId: "q1", selectedOptionIds: ["b"] },
      ])

      expect(result.questionResults[0].selectedOptionIds).toEqual(["b"])
    })
  })

  // --- 複数選択問題 ---

  describe("複数選択問題 (type: multiple)", () => {
    const multipleQuestion: QuestionItem = {
      id: "q2",
      type: "multiple",
      text: "次のうち、JavaScriptのプリミティブ型はどれですか？（複数選択）",
      options: [
        { id: "a", text: "string" },
        { id: "b", text: "array" },
        { id: "c", text: "number" },
        { id: "d", text: "boolean" },
      ],
      correct: ["a", "c", "d"],
      explanation:
        "string, number, boolean はプリミティブ型です。array はオブジェクト型です。",
    }

    it("完全一致の場合 isCorrect: true を返す", () => {
      const result = gradeQuiz([multipleQuestion], [
        { questionId: "q2", selectedOptionIds: ["a", "c", "d"] },
      ])

      expect(result.questionResults[0].isCorrect).toBe(true)
      expect(result.score).toBe(1)
    })

    it("選択順序が異なっても完全一致なら isCorrect: true を返す", () => {
      const result = gradeQuiz([multipleQuestion], [
        { questionId: "q2", selectedOptionIds: ["d", "a", "c"] },
      ])

      expect(result.questionResults[0].isCorrect).toBe(true)
    })

    it("部分一致の場合 isCorrect: false を返す（不足）", () => {
      const result = gradeQuiz([multipleQuestion], [
        { questionId: "q2", selectedOptionIds: ["a", "c"] },
      ])

      expect(result.questionResults[0].isCorrect).toBe(false)
    })

    it("部分一致の場合 isCorrect: false を返す（余分な選択を含む）", () => {
      const result = gradeQuiz([multipleQuestion], [
        { questionId: "q2", selectedOptionIds: ["a", "b", "c", "d"] },
      ])

      expect(result.questionResults[0].isCorrect).toBe(false)
    })

    it("全く異なる選択の場合 isCorrect: false を返す", () => {
      const result = gradeQuiz([multipleQuestion], [
        { questionId: "q2", selectedOptionIds: ["b"] },
      ])

      expect(result.questionResults[0].isCorrect).toBe(false)
    })

    it("正しい選択肢IDをソート済みで correctOptionIds に返す", () => {
      const result = gradeQuiz([multipleQuestion], [
        { questionId: "q2", selectedOptionIds: ["b"] },
      ])

      expect(result.questionResults[0].correctOptionIds).toEqual(["a", "c", "d"])
    })
  })

  // --- 全体スコア算出 ---

  describe("全体スコアの算出", () => {
    const questions: QuestionItem[] = [
      {
        id: "q1",
        type: "single",
        text: "問題1",
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
        correct: "a",
        explanation: "解説1",
      },
      {
        id: "q2",
        type: "single",
        text: "問題2",
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
        correct: "b",
        explanation: "解説2",
      },
      {
        id: "q3",
        type: "multiple",
        text: "問題3",
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
          { id: "c", text: "C" },
        ],
        correct: ["a", "c"],
        explanation: "解説3",
      },
    ]

    it("全問正解の場合のスコアと正答率を返す", () => {
      const result = gradeQuiz(questions, [
        { questionId: "q1", selectedOptionIds: ["a"] },
        { questionId: "q2", selectedOptionIds: ["b"] },
        { questionId: "q3", selectedOptionIds: ["a", "c"] },
      ])

      expect(result.score).toBe(3)
      expect(result.totalQuestions).toBe(3)
      expect(result.percentage).toBe(100)
    })

    it("全問不正解の場合のスコアと正答率を返す", () => {
      const result = gradeQuiz(questions, [
        { questionId: "q1", selectedOptionIds: ["b"] },
        { questionId: "q2", selectedOptionIds: ["a"] },
        { questionId: "q3", selectedOptionIds: ["b"] },
      ])

      expect(result.score).toBe(0)
      expect(result.totalQuestions).toBe(3)
      expect(result.percentage).toBe(0)
    })

    it("部分正解の場合のスコアと正答率を返す", () => {
      const result = gradeQuiz(questions, [
        { questionId: "q1", selectedOptionIds: ["a"] },
        { questionId: "q2", selectedOptionIds: ["a"] },
        { questionId: "q3", selectedOptionIds: ["a", "c"] },
      ])

      expect(result.score).toBe(2)
      expect(result.totalQuestions).toBe(3)
      expect(result.percentage).toBeCloseTo(66.7, 0)
    })

    it("questionResults の長さが問題数と一致する", () => {
      const result = gradeQuiz(questions, [
        { questionId: "q1", selectedOptionIds: ["a"] },
        { questionId: "q2", selectedOptionIds: ["b"] },
        { questionId: "q3", selectedOptionIds: ["a", "c"] },
      ])

      expect(result.questionResults).toHaveLength(3)
    })

    it("各 questionResult に正しい questionId が設定される", () => {
      const result = gradeQuiz(questions, [
        { questionId: "q1", selectedOptionIds: ["a"] },
        { questionId: "q2", selectedOptionIds: ["b"] },
        { questionId: "q3", selectedOptionIds: ["a", "c"] },
      ])

      expect(result.questionResults[0].questionId).toBe("q1")
      expect(result.questionResults[1].questionId).toBe("q2")
      expect(result.questionResults[2].questionId).toBe("q3")
    })
  })

  // --- エッジケース ---

  describe("エッジケース", () => {
    it("問題数が0の場合は空の結果を返す", () => {
      const result = gradeQuiz([], [])

      expect(result.score).toBe(0)
      expect(result.totalQuestions).toBe(0)
      expect(result.percentage).toBe(0)
      expect(result.questionResults).toEqual([])
    })

    it("回答が対応する問題がない場合は不正解として扱う", () => {
      const questions: QuestionItem[] = [
        {
          id: "q1",
          type: "single",
          text: "問題1",
          options: [{ id: "a", text: "A" }],
          correct: "a",
          explanation: "解説",
        },
      ]

      const result = gradeQuiz(questions, [])

      expect(result.score).toBe(0)
      expect(result.questionResults[0].isCorrect).toBe(false)
      expect(result.questionResults[0].selectedOptionIds).toEqual([])
    })
  })
})
