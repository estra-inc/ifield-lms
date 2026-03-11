/**
 * @vitest-environment jsdom
 */

/**
 * StartProjectButton Client Component テスト
 *
 * Task 7.2: StartProjectButton の作成
 * Requirements: 2.2, 2.4, 2.5, 2.6, 4.4, 6.6
 *
 * - 着手ボタンの表示
 * - 他案件が進行中の場合のボタン非活性
 * - current_term が '基礎' の場合の確認ダイアログ → 提出予定日ダイアログ
 * - current_term が '実践' の場合の提出予定日ダイアログ直接表示
 * - 提出予定日を設定して着手
 * - ローディング表示
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
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

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

// Mock startProject action
const mockStartProject = vi.fn()
vi.mock("@/app/(authenticated)/projects/actions", () => ({
  startProject: (...args: unknown[]) => mockStartProject(...args),
}))

import { StartProjectButton } from "@/app/(authenticated)/projects/_components/start-project-button"

describe("StartProjectButton (Task 7.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("着手ボタンを表示する", () => {
    render(
      <StartProjectButton
        projectId="proj-1"
        currentTerm="実践"
        hasActiveAssignment={false}
      />
    )

    expect(screen.getByRole("button", { name: /着手する/i })).toBeInTheDocument()
  })

  it("他案件が進行中の場合はボタンを非活性にし警告を表示する", () => {
    render(
      <StartProjectButton
        projectId="proj-1"
        currentTerm="実践"
        hasActiveAssignment={true}
      />
    )

    const button = screen.getByRole("button", { name: /着手する/i })
    expect(button).toBeDisabled()
    expect(screen.getByText(/他の案件が進行中/)).toBeInTheDocument()
  })

  it("current_term が '実践' の場合は提出予定日ダイアログを直接表示する", async () => {
    const user = userEvent.setup()
    render(
      <StartProjectButton
        projectId="proj-1"
        currentTerm="実践"
        hasActiveAssignment={false}
      />
    )

    await user.click(screen.getByRole("button", { name: /着手する/i }))

    await waitFor(() => {
      expect(screen.getByText("提出予定日の設定")).toBeInTheDocument()
    })
  })

  it("current_term が '基礎' の場合はターム確認ダイアログを先に表示する", async () => {
    const user = userEvent.setup()
    render(
      <StartProjectButton
        projectId="proj-1"
        currentTerm="基礎"
        hasActiveAssignment={false}
      />
    )

    await user.click(screen.getByRole("button", { name: /着手する/i }))

    await waitFor(() => {
      expect(screen.getByText("タームの移行")).toBeInTheDocument()
    })
  })

  it("ターム確認後に提出予定日ダイアログが表示される", async () => {
    const user = userEvent.setup()
    render(
      <StartProjectButton
        projectId="proj-1"
        currentTerm="基礎"
        hasActiveAssignment={false}
      />
    )

    await user.click(screen.getByRole("button", { name: /着手する/i }))

    await waitFor(async () => {
      const confirmButton = screen.getByRole("button", { name: /確認/i })
      await user.click(confirmButton)
    })

    await waitFor(() => {
      expect(screen.getByText("提出予定日の設定")).toBeInTheDocument()
    })
  })

  it("提出予定日を設定して着手すると startProject が dueDate 付きで呼ばれる", async () => {
    mockStartProject.mockResolvedValue({
      success: true,
      message: "着手しました",
      termChanged: false,
    })

    const user = userEvent.setup()
    render(
      <StartProjectButton
        projectId="proj-1"
        currentTerm="実践"
        hasActiveAssignment={false}
      />
    )

    // 着手ボタンをクリック → 提出予定日ダイアログ表示
    await user.click(screen.getByRole("button", { name: /着手する/i }))

    await waitFor(() => {
      expect(screen.getByTestId("due-date-start-input")).toBeInTheDocument()
    })

    // 日付を入力
    fireEvent.change(screen.getByTestId("due-date-start-input"), {
      target: { value: "2026-04-01" },
    })

    // ダイアログ内の着手ボタンをクリック
    const dialogButtons = screen.getAllByRole("button", { name: /着手する/i })
    const dialogStartButton = dialogButtons[dialogButtons.length - 1]
    await user.click(dialogStartButton)

    await waitFor(() => {
      expect(mockStartProject).toHaveBeenCalledWith(
        "proj-1",
        expect.stringContaining("2026-04-01")
      )
    })
  })

  it("提出予定日が未入力の場合はダイアログ内の着手ボタンが非活性", async () => {
    const user = userEvent.setup()
    render(
      <StartProjectButton
        projectId="proj-1"
        currentTerm="実践"
        hasActiveAssignment={false}
      />
    )

    await user.click(screen.getByRole("button", { name: /着手する/i }))

    await waitFor(() => {
      const dialogButtons = screen.getAllByRole("button", { name: /着手する/i })
      const dialogStartButton = dialogButtons[dialogButtons.length - 1]
      expect(dialogStartButton).toBeDisabled()
    })
  })

  it("ターム移行が発生した場合にトースト通知を表示する", async () => {
    mockStartProject.mockResolvedValue({
      success: true,
      message: "着手しました",
      termChanged: true,
    })

    const user = userEvent.setup()
    render(
      <StartProjectButton
        projectId="proj-1"
        currentTerm="実践"
        hasActiveAssignment={false}
      />
    )

    await user.click(screen.getByRole("button", { name: /着手する/i }))

    await waitFor(() => {
      expect(screen.getByTestId("due-date-start-input")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("due-date-start-input"), {
      target: { value: "2026-04-01" },
    })

    const dialogButtons = screen.getAllByRole("button", { name: /着手する/i })
    await user.click(dialogButtons[dialogButtons.length - 1])

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringContaining("実践ターム")
      )
    })
  })

  it("着手処理失敗時にエラートーストを表示する", async () => {
    mockStartProject.mockResolvedValue({
      success: false,
      message: "他の案件が進行中のため着手できません",
    })

    const user = userEvent.setup()
    render(
      <StartProjectButton
        projectId="proj-1"
        currentTerm="実践"
        hasActiveAssignment={false}
      />
    )

    await user.click(screen.getByRole("button", { name: /着手する/i }))

    await waitFor(() => {
      expect(screen.getByTestId("due-date-start-input")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("due-date-start-input"), {
      target: { value: "2026-04-01" },
    })

    const dialogButtons = screen.getAllByRole("button", { name: /着手する/i })
    await user.click(dialogButtons[dialogButtons.length - 1])

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
  })
})
