/**
 * @vitest-environment jsdom
 */

/**
 * DueDateEditDialog Client Component テスト
 *
 * - 日付表示と編集ボタン
 * - dueDate が null の場合は「-」表示
 * - 編集ボタンクリックでモーダルが開く
 * - 「コーチに確認しましたか？」の文言が表示される
 * - 日付変更時に updateDueDate が呼ばれる
 */
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock next/navigation
const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

// Mock updateDueDate action
const mockUpdateDueDate = vi.fn()
vi.mock("@/app/(authenticated)/projects/actions", () => ({
  updateDueDate: (...args: unknown[]) => mockUpdateDueDate(...args),
}))

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import { DueDateEditDialog } from "@/app/(authenticated)/projects/_components/due-date-picker"

describe("DueDateEditDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateDueDate.mockResolvedValue({ success: true, message: "提出予定日を設定しました。" })
  })

  it("提出予定日を表示する", () => {
    render(
      <DueDateEditDialog
        assignmentId="assignment-1"
        dueDate="2026-03-15T23:59:59.000Z"
      />
    )

    expect(screen.getByTestId("due-date")).toHaveTextContent(/2026/)
  })

  it("dueDate が null の場合は「-」を表示する", () => {
    render(
      <DueDateEditDialog assignmentId="assignment-1" dueDate={null} />
    )

    expect(screen.getByTestId("due-date")).toHaveTextContent("-")
  })

  it("編集ボタンが表示される", () => {
    render(
      <DueDateEditDialog assignmentId="assignment-1" dueDate={null} />
    )

    expect(screen.getByTestId("due-date-edit-button")).toBeInTheDocument()
  })

  it("編集ボタンクリックでモーダルが開く", async () => {
    const user = userEvent.setup()
    render(
      <DueDateEditDialog
        assignmentId="assignment-1"
        dueDate="2026-03-15T23:59:59.000Z"
      />
    )

    await user.click(screen.getByTestId("due-date-edit-button"))

    expect(screen.getByText("提出予定日の変更")).toBeInTheDocument()
  })

  it("モーダルに「コーチに確認しましたか？」と表示される", async () => {
    const user = userEvent.setup()
    render(
      <DueDateEditDialog
        assignmentId="assignment-1"
        dueDate="2026-03-15T23:59:59.000Z"
      />
    )

    await user.click(screen.getByTestId("due-date-edit-button"))

    expect(screen.getByTestId("coach-confirmation")).toHaveTextContent(
      "コーチに確認しましたか？"
    )
  })

  it("変更ボタンクリックで updateDueDate が呼ばれる", async () => {
    const user = userEvent.setup()
    render(
      <DueDateEditDialog
        assignmentId="assignment-1"
        dueDate="2026-03-15T23:59:59.000Z"
      />
    )

    await user.click(screen.getByTestId("due-date-edit-button"))

    const input = screen.getByTestId("due-date-edit-input")
    fireEvent.change(input, { target: { value: "2026-04-01" } })

    await user.click(screen.getByText("変更する"))

    await vi.waitFor(() => {
      expect(mockUpdateDueDate).toHaveBeenCalledWith(
        "assignment-1",
        expect.stringContaining("2026-04-01")
      )
    })
  })

  it("キャンセルボタンでモーダルが閉じる", async () => {
    const user = userEvent.setup()
    render(
      <DueDateEditDialog
        assignmentId="assignment-1"
        dueDate="2026-03-15T23:59:59.000Z"
      />
    )

    await user.click(screen.getByTestId("due-date-edit-button"))
    expect(screen.getByText("提出予定日の変更")).toBeInTheDocument()

    await user.click(screen.getByText("キャンセル"))

    expect(screen.queryByText("提出予定日の変更")).not.toBeInTheDocument()
  })
})
