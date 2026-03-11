/**
 * @vitest-environment jsdom
 */

/**
 * SubmitForm Client Component テスト
 *
 * Task 8.2: SubmitForm Client Component の作成
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.5, 6.6
 *
 * - GitHub URL 入力フィールドと「提出する」ボタンの表示
 * - zod + react-hook-form による URL バリデーション
 * - grading 中のフォーム非活性
 * - archived 案件のフォーム非表示 + メッセージ
 * - 提出成功時のトースト表示
 * - エラー時のエラーメッセージ表示
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock sonner toast
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

// Mock submitWork action
const mockSubmitWork = vi.fn()
vi.mock("@/app/(authenticated)/projects/actions", () => ({
  submitWork: (...args: unknown[]) => mockSubmitWork(...args),
}))

import { SubmitForm } from "@/app/(authenticated)/projects/_components/submit-form"

describe("SubmitForm (Task 8.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==============================
  // 基本表示
  // ==============================
  describe("基本表示", () => {
    it("GitHub URL 入力フィールドと提出ボタンを表示する", () => {
      render(
        <SubmitForm
          assignmentId="assign-1"
          isGrading={false}
          isArchived={false}
        />
      )

      expect(screen.getByPlaceholderText(/github\.com/i)).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /提出する/i })
      ).toBeInTheDocument()
    })
  })

  // ==============================
  // archived 案件
  // ==============================
  describe("archived 案件", () => {
    it("archived の場合はフォームを非表示にしメッセージを表示する", () => {
      render(
        <SubmitForm
          assignmentId="assign-1"
          isGrading={false}
          isArchived={true}
        />
      )

      // フォーム要素が存在しない
      expect(
        screen.queryByPlaceholderText(/github\.com/i)
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: /提出する/i })
      ).not.toBeInTheDocument()

      // アーカイブメッセージが表示される
      expect(
        screen.getByText(/アーカイブされたため提出できません/)
      ).toBeInTheDocument()
    })
  })

  // ==============================
  // grading 中のフォーム非活性
  // ==============================
  describe("grading 中のフォーム非活性", () => {
    it("grading 中の場合はフォームを非活性にする", () => {
      render(
        <SubmitForm
          assignmentId="assign-1"
          isGrading={true}
          isArchived={false}
        />
      )

      expect(screen.getByPlaceholderText(/github\.com/i)).toBeDisabled()
      expect(
        screen.getByRole("button", { name: /提出する/i })
      ).toBeDisabled()
    })
  })

  // ==============================
  // バリデーション
  // ==============================
  describe("バリデーション", () => {
    it("空文字の場合はバリデーションエラーを表示する", async () => {
      const user = userEvent.setup()
      render(
        <SubmitForm
          assignmentId="assign-1"
          isGrading={false}
          isArchived={false}
        />
      )

      await user.click(screen.getByRole("button", { name: /提出する/i }))

      await waitFor(() => {
        // エラーメッセージが表示される（form-message スロット内）
        const errorMessage = screen.getByText(
          /GitHub の URL を入力してください/
        )
        expect(errorMessage).toBeInTheDocument()
      })

      // submitWork は呼ばれない
      expect(mockSubmitWork).not.toHaveBeenCalled()
    })

    it("GitHub 以外の URL の場合はバリデーションエラーを表示する", async () => {
      const user = userEvent.setup()
      render(
        <SubmitForm
          assignmentId="assign-1"
          isGrading={false}
          isArchived={false}
        />
      )

      const input = screen.getByPlaceholderText(/github\.com/i)
      await user.type(input, "https://example.com/repo")
      await user.click(screen.getByRole("button", { name: /提出する/i }))

      await waitFor(() => {
        expect(screen.getByText(/GitHub の URL/i)).toBeInTheDocument()
      })

      expect(mockSubmitWork).not.toHaveBeenCalled()
    })

    it("有効な GitHub URL の場合は提出処理を実行する", async () => {
      mockSubmitWork.mockResolvedValue({
        success: true,
        message: "成果物を提出しました。",
      })

      const user = userEvent.setup()
      render(
        <SubmitForm
          assignmentId="assign-1"
          isGrading={false}
          isArchived={false}
        />
      )

      const input = screen.getByPlaceholderText(/github\.com/i)
      await user.type(input, "https://github.com/user/repo")
      await user.click(screen.getByRole("button", { name: /提出する/i }))

      await waitFor(() => {
        expect(mockSubmitWork).toHaveBeenCalledWith(
          "assign-1",
          "https://github.com/user/repo"
        )
      })
    })
  })

  // ==============================
  // 提出成功
  // ==============================
  describe("提出成功", () => {
    it("提出成功時に成功トーストを表示する", async () => {
      mockSubmitWork.mockResolvedValue({
        success: true,
        message: "成果物を提出しました。",
      })

      const user = userEvent.setup()
      render(
        <SubmitForm
          assignmentId="assign-1"
          isGrading={false}
          isArchived={false}
        />
      )

      const input = screen.getByPlaceholderText(/github\.com/i)
      await user.type(input, "https://github.com/user/repo")
      await user.click(screen.getByRole("button", { name: /提出する/i }))

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalled()
      })
    })
  })

  // ==============================
  // 提出エラー
  // ==============================
  describe("提出エラー", () => {
    it("サーバーエラー時にエラートーストを表示する", async () => {
      mockSubmitWork.mockResolvedValue({
        success: false,
        message: "提出に失敗しました。",
      })

      const user = userEvent.setup()
      render(
        <SubmitForm
          assignmentId="assign-1"
          isGrading={false}
          isArchived={false}
        />
      )

      const input = screen.getByPlaceholderText(/github\.com/i)
      await user.type(input, "https://github.com/user/repo")
      await user.click(screen.getByRole("button", { name: /提出する/i }))

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled()
      })
    })
  })
})
