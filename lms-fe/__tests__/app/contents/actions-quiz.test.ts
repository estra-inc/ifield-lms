/**
 * saveQuizLog Server Action のテスト
 *
 * Task 6.1: 回答履歴を保存する Server Action
 * Requirements: 5.1, 5.2
 */

// --- モック定義 ---

const mockInsert = vi.fn()
const mockFrom = vi.fn()

const mockGetUser = vi.fn()
const mockSupabase = {
  from: mockFrom,
  auth: {
    getUser: mockGetUser,
  },
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

describe("saveQuizLog", () => {
  let saveQuizLog: (input: {
    quizId: string
    score: number
    totalQuestions: number
    answers: Array<{
      questionId: string
      selectedOptionIds: string[]
      isCorrect: boolean
    }>
  }) => Promise<{ success: boolean; message: string }>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    })
    mockFrom.mockReturnValue({
      insert: mockInsert,
    })
    mockInsert.mockResolvedValue({ error: null })

    const mod = await import(
      "@/app/(authenticated)/contents/actions-quiz"
    )
    saveQuizLog = mod.saveQuizLog
  })

  it("認証済みユーザーで正常に保存できる", async () => {
    const result = await saveQuizLog({
      quizId: "quiz-1",
      score: 8,
      totalQuestions: 10,
      answers: [
        {
          questionId: "q1",
          selectedOptionIds: ["a"],
          isCorrect: true,
        },
      ],
    })

    expect(result.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith("quiz_logs")
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-123",
      quiz_id: "quiz-1",
      score: 8,
      total_questions: 10,
      answers: [
        {
          questionId: "q1",
          selectedOptionIds: ["a"],
          isCorrect: true,
        },
      ],
    })
  })

  it("未認証ユーザーはエラーを返す", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    })

    const result = await saveQuizLog({
      quizId: "quiz-1",
      score: 5,
      totalQuestions: 10,
      answers: [],
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain("認証")
  })

  it("quizId が空の場合はエラーを返す", async () => {
    const result = await saveQuizLog({
      quizId: "",
      score: 5,
      totalQuestions: 10,
      answers: [],
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain("クイズID")
  })

  it("score が totalQuestions を超える場合はエラーを返す", async () => {
    const result = await saveQuizLog({
      quizId: "quiz-1",
      score: 11,
      totalQuestions: 10,
      answers: [],
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain("スコア")
  })

  it("score が負の場合はエラーを返す", async () => {
    const result = await saveQuizLog({
      quizId: "quiz-1",
      score: -1,
      totalQuestions: 10,
      answers: [],
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain("スコア")
  })

  it("INSERT エラー時はエラーを返す", async () => {
    mockInsert.mockResolvedValue({
      error: { message: "insert failed" },
    })

    const result = await saveQuizLog({
      quizId: "quiz-1",
      score: 5,
      totalQuestions: 10,
      answers: [],
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain("失敗")
  })
})
