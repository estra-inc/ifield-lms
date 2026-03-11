/**
 * @vitest-environment jsdom
 */

/**
 * ProgressTab Server Component テスト
 *
 * - 進捗サマリカードの日付表示
 * - DueDateEditDialog コンポーネントの配置
 * - SubmitDialog コンポーネントの配置
 * - SubmissionHistory コンポーネントの配置
 */
import { render, screen } from "@testing-library/react"

// Mock DueDateEditDialog (Client Component)
vi.mock(
  "@/app/(authenticated)/projects/_components/due-date-picker",
  () => ({
    DueDateEditDialog: ({
      assignmentId,
      dueDate,
    }: {
      assignmentId: string
      dueDate: string | null
    }) => (
      <div data-testid="due-date-edit-dialog" data-assignment-id={assignmentId} data-due-date={dueDate ?? ""}>
        DueDateEditDialog Mock
      </div>
    ),
  })
)

// Mock SubmitDialog (Client Component)
vi.mock(
  "@/app/(authenticated)/projects/_components/submit-dialog",
  () => ({
    SubmitDialog: ({
      assignmentId,
      isGrading,
      isArchived,
    }: {
      assignmentId: string
      isGrading: boolean
      isArchived: boolean
    }) => (
      <div data-testid="submit-dialog" data-assignment-id={assignmentId} data-is-grading={String(isGrading)} data-is-archived={String(isArchived)}>
        SubmitDialog Mock
      </div>
    ),
  })
)

// Mock SubmissionHistory (Server Component with async)
vi.mock(
  "@/app/(authenticated)/projects/_components/submission-history",
  () => ({
    SubmissionHistory: ({
      assignmentId,
      currentPage,
      slug,
    }: {
      assignmentId: string
      currentPage: number
      slug: string
    }) => (
      <div data-testid="submission-history" data-assignment-id={assignmentId} data-current-page={currentPage} data-slug={slug}>
        SubmissionHistory Mock
      </div>
    ),
  })
)

import { ProgressTab } from "@/app/(authenticated)/projects/_components/progress-tab"

describe("ProgressTab", () => {
  const defaultProps = {
    assignmentId: "assignment-1",
    startDate: "2026-03-01T10:00:00+09:00",
    dueDate: "2026-03-15T10:00:00+09:00",
    latestSubmissionDate: "2026-03-05T14:30:00+09:00",
    latestSubmissionStatus: "submitted",
    isGrading: false,
    isArchived: false,
    currentPage: 1,
    slug: "test-project",
  }

  it("開始日を表示する", () => {
    render(<ProgressTab {...defaultProps} />)

    expect(screen.getByText("開始日")).toBeInTheDocument()
    expect(screen.getByTestId("start-date")).toHaveTextContent(/2026/)
  })

  it("提出予定日ラベルと DueDateEditDialog を表示する", () => {
    render(<ProgressTab {...defaultProps} />)

    expect(screen.getByText("提出予定日")).toBeInTheDocument()
    const dialog = screen.getByTestId("due-date-edit-dialog")
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute("data-assignment-id", "assignment-1")
    expect(dialog).toHaveAttribute("data-due-date", "2026-03-15T10:00:00+09:00")
  })

  it("提出予定日が null の場合 DueDateEditDialog に空文字が渡される", () => {
    render(<ProgressTab {...defaultProps} dueDate={null} />)

    const dialog = screen.getByTestId("due-date-edit-dialog")
    expect(dialog).toHaveAttribute("data-due-date", "")
  })

  it("最新提出日を表示する", () => {
    render(<ProgressTab {...defaultProps} />)

    expect(screen.getByText("最新提出日")).toBeInTheDocument()
    expect(screen.getByTestId("latest-submission-date")).toHaveTextContent(/2026/)
  })

  it("最新提出日がない場合は「-」を表示する", () => {
    render(<ProgressTab {...defaultProps} latestSubmissionDate={null} />)

    expect(screen.getByTestId("latest-submission-date")).toHaveTextContent("-")
  })

  it("SubmitDialog コンポーネントが配置されている", () => {
    render(<ProgressTab {...defaultProps} />)

    const dialog = screen.getByTestId("submit-dialog")
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute("data-assignment-id", "assignment-1")
    expect(dialog).toHaveAttribute("data-is-grading", "false")
    expect(dialog).toHaveAttribute("data-is-archived", "false")
  })

  it("SubmissionHistory コンポーネントが配置されている", () => {
    render(<ProgressTab {...defaultProps} />)

    const history = screen.getByTestId("submission-history")
    expect(history).toBeInTheDocument()
    expect(history).toHaveAttribute("data-assignment-id", "assignment-1")
    expect(history).toHaveAttribute("data-current-page", "1")
    expect(history).toHaveAttribute("data-slug", "test-project")
  })

  it("提出履歴の見出しが表示される", () => {
    render(<ProgressTab {...defaultProps} />)

    expect(screen.getByText("提出履歴")).toBeInTheDocument()
  })

  it("isGrading が SubmitDialog に渡される", () => {
    render(<ProgressTab {...defaultProps} isGrading={true} />)

    const dialog = screen.getByTestId("submit-dialog")
    expect(dialog).toHaveAttribute("data-is-grading", "true")
  })

  it("isArchived が SubmitDialog に渡される", () => {
    render(<ProgressTab {...defaultProps} isArchived={true} />)

    const dialog = screen.getByTestId("submit-dialog")
    expect(dialog).toHaveAttribute("data-is-archived", "true")
  })
})
