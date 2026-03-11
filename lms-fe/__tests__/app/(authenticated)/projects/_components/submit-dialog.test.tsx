/**
 * @vitest-environment jsdom
 */

/**
 * SubmitDialog Client Component テスト
 *
 * - 「成果物を提出する」ボタンの表示
 * - isGrading / isArchived 時のボタン非活性
 * - ダイアログの開閉
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// Mock next/navigation
const mockRefresh = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}))

// Mock SubmitForm to simplify dialog testing
vi.mock(
  "@/app/(authenticated)/projects/_components/submit-form",
  () => ({
    SubmitForm: ({
      onSuccess,
    }: {
      assignmentId: string
      isGrading: boolean
      isArchived: boolean
      onSuccess?: () => void
    }) => (
      <div data-testid="submit-form">
        <button onClick={onSuccess} data-testid="mock-submit-success">
          Mock Submit
        </button>
      </div>
    ),
  })
)

import { SubmitDialog } from "@/app/(authenticated)/projects/_components/submit-dialog"

describe("SubmitDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("「成果物を提出する」ボタンを表示する", () => {
    render(
      <SubmitDialog
        assignmentId="assignment-1"
        isGrading={false}
        isArchived={false}
      />
    )

    expect(screen.getByText("成果物を提出する")).toBeInTheDocument()
  })

  it("isGrading 時にボタンが非活性になる", () => {
    render(
      <SubmitDialog
        assignmentId="assignment-1"
        isGrading={true}
        isArchived={false}
      />
    )

    const button = screen.getByText("成果物を提出する").closest("button")
    expect(button).toBeDisabled()
  })

  it("isArchived 時にボタンが非活性になる", () => {
    render(
      <SubmitDialog
        assignmentId="assignment-1"
        isGrading={false}
        isArchived={true}
      />
    )

    const button = screen.getByText("成果物を提出する").closest("button")
    expect(button).toBeDisabled()
  })

  it("ボタンクリックでダイアログが開く", async () => {
    const user = userEvent.setup()
    render(
      <SubmitDialog
        assignmentId="assignment-1"
        isGrading={false}
        isArchived={false}
      />
    )

    await user.click(screen.getByText("成果物を提出する"))

    expect(screen.getByText("成果物提出")).toBeInTheDocument()
    expect(screen.getByTestId("submit-form")).toBeInTheDocument()
  })

  it("提出成功時にダイアログが閉じて router.refresh() が呼ばれる", async () => {
    const user = userEvent.setup()
    render(
      <SubmitDialog
        assignmentId="assignment-1"
        isGrading={false}
        isArchived={false}
      />
    )

    // ダイアログを開く
    await user.click(screen.getByText("成果物を提出する"))
    expect(screen.getByTestId("submit-form")).toBeInTheDocument()

    // 成功コールバックを発火
    await user.click(screen.getByTestId("mock-submit-success"))

    expect(mockRefresh).toHaveBeenCalled()
  })
})
