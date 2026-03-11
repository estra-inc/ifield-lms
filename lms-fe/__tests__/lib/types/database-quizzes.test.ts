import type { Database } from "@/lib/types/database"
import type { QuestionItem, OptionItem, QuizAnswerRecord } from "@/lib/types/quiz"

/**
 * Database 型定義 - quizzes / quiz_logs テーブルと Quiz 関連型
 *
 * Task 1.3: TypeScript 型定義の追加
 * Requirements: 2.1, 2.2
 */

describe("Database 型定義 - quizzes テーブル", () => {
  describe("quizzes テーブルの Row 型", () => {
    it("全必須カラムが正しい型で定義されている", () => {
      const row: Database["public"]["Tables"]["quizzes"]["Row"] = {
        id: "quiz-uuid",
        genre: "engineering",
        tutorial: "html-css-basics",
        chapter: "chapter1",
        section: "intro",
        title: "HTML基礎 確認テスト",
        questions: [
          {
            id: "q1",
            type: "single",
            text: "テスト問題",
            options: [{ id: "a", text: "選択肢A" }],
            correct: "a",
            explanation: "解説",
          },
        ],
        status: "active",
        version_id: "version-uuid",
        created_at: "2026-03-02T00:00:00Z",
        updated_at: "2026-03-02T00:00:00Z",
      }

      expect(row.id).toBe("quiz-uuid")
      expect(row.genre).toBe("engineering")
      expect(row.tutorial).toBe("html-css-basics")
      expect(row.chapter).toBe("chapter1")
      expect(row.section).toBe("intro")
      expect(row.title).toBe("HTML基礎 確認テスト")
      expect(row.questions).toHaveLength(1)
      expect(row.status).toBe("active")
      expect(row.version_id).toBe("version-uuid")
    })

    it("status が 'active' | 'archived' のいずれかである", () => {
      const statuses: Database["public"]["Tables"]["quizzes"]["Row"]["status"][] = [
        "active",
        "archived",
      ]
      expect(statuses).toHaveLength(2)
    })
  })

  describe("quizzes テーブルの Insert 型", () => {
    it("必須フィールドのみでインサートオブジェクトが作成できる", () => {
      const insert: Database["public"]["Tables"]["quizzes"]["Insert"] = {
        genre: "engineering",
        tutorial: "html-css-basics",
        chapter: "chapter1",
        section: "intro",
        title: "テスト",
        questions: [],
        version_id: "version-uuid",
      }

      expect(insert.genre).toBe("engineering")
      expect(insert.id).toBeUndefined()
      expect(insert.status).toBeUndefined()
      expect(insert.created_at).toBeUndefined()
      expect(insert.updated_at).toBeUndefined()
    })
  })

  describe("quizzes テーブルの Update 型", () => {
    it("部分更新ができる（全フィールド任意）", () => {
      const update: Database["public"]["Tables"]["quizzes"]["Update"] = {
        title: "更新タイトル",
        status: "archived",
      }

      expect(update.title).toBe("更新タイトル")
      expect(update.status).toBe("archived")
    })
  })

  describe("quizzes テーブルの Relationships", () => {
    it("version_id が content_versions テーブルを参照する外部キーを持つ", () => {
      const relationships: Database["public"]["Tables"]["quizzes"]["Relationships"] = [
        {
          foreignKeyName: "quizzes_version_id_fkey",
          columns: ["version_id"],
          referencedRelation: "content_versions",
          referencedColumns: ["id"],
        },
      ]

      expect(relationships[0].foreignKeyName).toBe("quizzes_version_id_fkey")
      expect(relationships[0].referencedRelation).toBe("content_versions")
    })
  })
})

describe("Database 型定義 - quiz_logs テーブル", () => {
  describe("quiz_logs テーブルの Row 型", () => {
    it("全必須カラムが正しい型で定義されている", () => {
      const row: Database["public"]["Tables"]["quiz_logs"]["Row"] = {
        id: "log-uuid",
        user_id: "user-uuid",
        quiz_id: "quiz-uuid",
        score: 8,
        total_questions: 10,
        answers: [
          {
            questionId: "q1",
            selectedOptionIds: ["a"],
            isCorrect: true,
          },
        ],
        created_at: "2026-03-02T00:00:00Z",
      }

      expect(row.id).toBe("log-uuid")
      expect(row.user_id).toBe("user-uuid")
      expect(row.quiz_id).toBe("quiz-uuid")
      expect(row.score).toBe(8)
      expect(row.total_questions).toBe(10)
      expect(row.answers).toHaveLength(1)
    })
  })

  describe("quiz_logs テーブルの Insert 型", () => {
    it("必須フィールドのみでインサートオブジェクトが作成できる", () => {
      const insert: Database["public"]["Tables"]["quiz_logs"]["Insert"] = {
        user_id: "user-uuid",
        quiz_id: "quiz-uuid",
        score: 5,
        total_questions: 10,
        answers: [],
      }

      expect(insert.user_id).toBe("user-uuid")
      expect(insert.id).toBeUndefined()
      expect(insert.created_at).toBeUndefined()
    })
  })

  describe("quiz_logs テーブルの Update 型", () => {
    it("部分更新ができる（全フィールド任意）", () => {
      const update: Database["public"]["Tables"]["quiz_logs"]["Update"] = {
        score: 10,
      }

      expect(update.score).toBe(10)
    })
  })

  describe("quiz_logs テーブルの Relationships", () => {
    it("user_id が users テーブルを参照する外部キーを持つ", () => {
      const relationships: Database["public"]["Tables"]["quiz_logs"]["Relationships"] = [
        {
          foreignKeyName: "quiz_logs_user_id_fkey",
          columns: ["user_id"],
          referencedRelation: "users",
          referencedColumns: ["id"],
        },
        {
          foreignKeyName: "quiz_logs_quiz_id_fkey",
          columns: ["quiz_id"],
          referencedRelation: "quizzes",
          referencedColumns: ["id"],
        },
      ]

      expect(relationships[0].foreignKeyName).toBe("quiz_logs_user_id_fkey")
      expect(relationships[0].referencedRelation).toBe("users")
    })

    it("quiz_id が quizzes テーブルを参照する外部キーを持つ", () => {
      const relationships: Database["public"]["Tables"]["quiz_logs"]["Relationships"] = [
        {
          foreignKeyName: "quiz_logs_user_id_fkey",
          columns: ["user_id"],
          referencedRelation: "users",
          referencedColumns: ["id"],
        },
        {
          foreignKeyName: "quiz_logs_quiz_id_fkey",
          columns: ["quiz_id"],
          referencedRelation: "quizzes",
          referencedColumns: ["id"],
        },
      ]

      expect(relationships[1].foreignKeyName).toBe("quiz_logs_quiz_id_fkey")
      expect(relationships[1].referencedRelation).toBe("quizzes")
    })
  })
})

describe("Quiz 関連の型定義", () => {
  describe("QuestionItem 型", () => {
    it("単一選択問題の型が正しい", () => {
      const question: QuestionItem = {
        id: "q1",
        type: "single",
        text: "テスト問題",
        options: [
          { id: "a", text: "選択肢A" },
          { id: "b", text: "選択肢B" },
        ],
        correct: "a",
        explanation: "解説テキスト",
      }

      expect(question.type).toBe("single")
      expect(question.correct).toBe("a")
    })

    it("複数選択問題の型が正しい", () => {
      const question: QuestionItem = {
        id: "q2",
        type: "multiple",
        text: "テスト問題（複数選択）",
        options: [
          { id: "a", text: "選択肢A" },
          { id: "b", text: "選択肢B" },
          { id: "c", text: "選択肢C" },
        ],
        correct: ["a", "c"],
        explanation: "解説テキスト",
      }

      expect(question.type).toBe("multiple")
      expect(question.correct).toEqual(["a", "c"])
    })
  })

  describe("OptionItem 型", () => {
    it("id と text を持つ", () => {
      const option: OptionItem = {
        id: "a",
        text: "選択肢A",
      }

      expect(option.id).toBe("a")
      expect(option.text).toBe("選択肢A")
    })
  })

  describe("QuizAnswerRecord 型", () => {
    it("questionId, selectedOptionIds, isCorrect を持つ", () => {
      const record: QuizAnswerRecord = {
        questionId: "q1",
        selectedOptionIds: ["a", "c"],
        isCorrect: true,
      }

      expect(record.questionId).toBe("q1")
      expect(record.selectedOptionIds).toEqual(["a", "c"])
      expect(record.isCorrect).toBe(true)
    })
  })
})
