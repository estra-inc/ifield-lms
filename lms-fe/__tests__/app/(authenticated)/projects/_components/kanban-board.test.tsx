/**
 * @vitest-environment jsdom
 */

/**
 * KanbanBoard Client Component テスト
 *
 * Task 10.2: カンバンボード Client Component の作成
 * Task 10.3: タスク作成・編集ダイアログの実装
 * Requirements: 11.1, 11.2, 11.3, 11.4
 *
 * - 4カラム（バックログ / ToDo / 進行中 / 完了）の表示
 * - タスクカードの表示
 * - タスク作成ダイアログ
 * - タスク編集ダイアログ
 * - タスク削除
 * - canEdit=false の場合のフォーム非表示
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useEffect } from "react"

// Mock sonner toast
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

// Mock Server Actions
const mockCreateTask = vi.fn()
const mockUpdateTask = vi.fn()
const mockUpdateTaskStatus = vi.fn()
const mockDeleteTask = vi.fn()

// Mock MarkdownEditor as a simple textarea with mode switching
vi.mock(
  "@/app/(authenticated)/projects/_components/markdown-editor",
  () => ({
    MarkdownEditor: ({
      value,
      onChange,
      placeholder,
      disabled,
      id,
      defaultMode,
      onModeChange,
    }: {
      value: string
      onChange: (v: string) => void
      placeholder?: string
      disabled?: boolean
      id?: string
      defaultMode?: "edit" | "preview"
      onModeChange?: (mode: "edit" | "preview") => void
    }) => {
      useEffect(() => {
        onModeChange?.(defaultMode ?? "edit")
      }, [defaultMode, onModeChange])

      return (
        <div>
          <button
            type="button"
            onClick={() => onModeChange?.("edit")}
            data-testid="switch-to-edit"
          >
            編集モードへ
          </button>
          <textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            aria-label="説明"
          />
        </div>
      )
    },
  })
)

vi.mock("@/app/(authenticated)/projects/actions", () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
  updateTaskStatus: (...args: unknown[]) => mockUpdateTaskStatus(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
}))

import { KanbanBoard } from "@/app/(authenticated)/projects/_components/kanban-board"
import type { KanbanTask } from "@/app/(authenticated)/projects/_components/kanban-board"

// ---- Helpers ----

const MOCK_TASKS: KanbanTask[] = [
  {
    id: "task-1",
    title: "バックログタスク1",
    description: "説明1",
    status: "backlog",
    order: 0,
    createdBy: "user-1",
  },
  {
    id: "task-2",
    title: "ToDoタスク1",
    description: null,
    status: "todo",
    order: 0,
    createdBy: "user-1",
  },
  {
    id: "task-3",
    title: "進行中タスク1",
    description: "進行中の説明",
    status: "in_progress",
    order: 0,
    createdBy: "user-1",
  },
  {
    id: "task-4",
    title: "完了タスク1",
    description: null,
    status: "done",
    order: 0,
    createdBy: "user-1",
  },
]

const DEFAULT_PROPS = {
  assignmentId: "assign-1",
  initialTasks: MOCK_TASKS,
  canEdit: true,
}

// ---- Tests ----

describe("KanbanBoard (Task 10.2, 10.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==============================
  // カラム表示
  // ==============================
  describe("カラム表示", () => {
    it("4つのカラム（バックログ / ToDo / 進行中 / 完了）を表示する", () => {
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      expect(screen.getByText("バックログ")).toBeInTheDocument()
      expect(screen.getByText("ToDo")).toBeInTheDocument()
      expect(screen.getByText("進行中")).toBeInTheDocument()
      expect(screen.getByText("完了")).toBeInTheDocument()
    })

    it("各カラムにタスクカードを表示する", () => {
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      expect(screen.getByText("バックログタスク1")).toBeInTheDocument()
      expect(screen.getByText("ToDoタスク1")).toBeInTheDocument()
      expect(screen.getByText("進行中タスク1")).toBeInTheDocument()
      expect(screen.getByText("完了タスク1")).toBeInTheDocument()
    })

    it("タスクの説明が存在する場合に表示する", () => {
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      expect(screen.getByText("説明1")).toBeInTheDocument()
      expect(screen.getByText("進行中の説明")).toBeInTheDocument()
    })
  })

  // ==============================
  // タスクが空の場合
  // ==============================
  describe("タスクが空の場合", () => {
    it("空のカンバンボードを表示する", () => {
      render(
        <KanbanBoard
          assignmentId="assign-1"
          initialTasks={[]}
          canEdit={true}
        />
      )

      // カラムは表示される
      expect(screen.getByText("バックログ")).toBeInTheDocument()
      expect(screen.getByText("ToDo")).toBeInTheDocument()
      expect(screen.getByText("進行中")).toBeInTheDocument()
      expect(screen.getByText("完了")).toBeInTheDocument()
    })
  })

  // ==============================
  // タスク作成（Task 10.3）
  // ==============================
  describe("タスク作成", () => {
    it("canEdit=true の場合にタスク追加ボタンを表示する", () => {
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      // 各カラムにタスク追加ボタンがある
      const addButtons = screen.getAllByRole("button", { name: /タスクを追加/i })
      expect(addButtons.length).toBeGreaterThan(0)
    })

    it("canEdit=false の場合にタスク追加ボタンを表示しない", () => {
      render(<KanbanBoard {...DEFAULT_PROPS} canEdit={false} />)

      const addButtons = screen.queryAllByRole("button", { name: /タスクを追加/i })
      expect(addButtons.length).toBe(0)
    })

    it("タスク追加ボタンをクリックすると作成ダイアログを表示する", async () => {
      const user = userEvent.setup()
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      const addButtons = screen.getAllByRole("button", { name: /タスクを追加/i })
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText("タスクを作成")).toBeInTheDocument()
      })
    })

    it("タスク作成フォームにタイトルと説明の入力欄がある", async () => {
      const user = userEvent.setup()
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      const addButtons = screen.getAllByRole("button", { name: /タスクを追加/i })
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByLabelText(/タイトル/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/説明/i)).toBeInTheDocument()
      })
    })

    it("タスク作成成功時にタスクを追加する", async () => {
      mockCreateTask.mockResolvedValue({
        success: true,
        message: "タスクを作成しました。",
        task: {
          id: "task-new",
          title: "新しいタスク",
          description: null,
          status: "backlog",
          order: 1,
        },
      })

      const user = userEvent.setup()
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      // 追加ボタンをクリック
      const addButtons = screen.getAllByRole("button", { name: /タスクを追加/i })
      await user.click(addButtons[0])

      // タイトルを入力
      await waitFor(async () => {
        const titleInput = screen.getByLabelText(/タイトル/i)
        await user.type(titleInput, "新しいタスク")
      })

      // 作成ボタンをクリック
      const createButton = screen.getByRole("button", { name: /作成$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockCreateTask).toHaveBeenCalled()
      })
    })
  })

  // ==============================
  // タスク編集（Task 10.3）
  // ==============================
  describe("タスク編集", () => {
    it("canEdit=true の場合にタスクカードクリックで編集ダイアログを開く", async () => {
      const user = userEvent.setup()
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      await user.click(screen.getByText("バックログタスク1"))

      await waitFor(() => {
        expect(screen.getByText("タスクを編集")).toBeInTheDocument()
      })
    })

    it("canEdit=false の場合にタスクカードクリックで編集ダイアログを開かない", async () => {
      const user = userEvent.setup()
      render(<KanbanBoard {...DEFAULT_PROPS} canEdit={false} />)

      await user.click(screen.getByText("バックログタスク1"))

      // 編集ダイアログは表示されない
      expect(screen.queryByText("タスクを編集")).not.toBeInTheDocument()
    })

    it("タスク更新成功時にタスクを更新する", async () => {
      mockUpdateTask.mockResolvedValue({
        success: true,
        message: "タスクを更新しました。",
        task: {
          id: "task-1",
          title: "更新されたタスク",
          description: "更新された説明",
          status: "backlog",
          order: 0,
        },
      })

      const user = userEvent.setup()
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      // タスクカードをクリック（プレビューモードで開く）
      await user.click(screen.getByText("バックログタスク1"))

      // 編集モードへ切り替え
      await user.click(screen.getByTestId("switch-to-edit"))

      // タイトルを更新
      await waitFor(async () => {
        const titleInput = screen.getByLabelText(/タイトル/i)
        await user.clear(titleInput)
        await user.type(titleInput, "更新されたタスク")
      })

      // 更新ボタンをクリック
      const updateButton = screen.getByRole("button", { name: /更新$/i })
      await user.click(updateButton)

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalled()
      })
    })
  })

  // ==============================
  // タスク削除
  // ==============================
  describe("タスク削除", () => {
    it("canEdit=true の場合に削除ボタンを表示する", async () => {
      const user = userEvent.setup()
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      // タスクカードをクリックして編集ドロワーを開く
      await user.click(screen.getByText("バックログタスク1"))

      // 編集モードへ切り替え
      await user.click(screen.getByTestId("switch-to-edit"))

      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: /削除/i })
        expect(deleteButton).toBeInTheDocument()
      })
    })

    it("削除成功時にタスクを削除する", async () => {
      mockDeleteTask.mockResolvedValue({
        success: true,
        message: "タスクを削除しました。",
      })

      const user = userEvent.setup()
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      // タスクカードをクリック
      await user.click(screen.getByText("バックログタスク1"))

      // 編集モードへ切り替え
      await user.click(screen.getByTestId("switch-to-edit"))

      // 削除ボタンをクリック → 確認モーダル表示
      await waitFor(async () => {
        const deleteButton = screen.getByRole("button", { name: /^削除$/i })
        await user.click(deleteButton)
      })

      // 確認モーダルの「削除する」をクリック
      await waitFor(async () => {
        const confirmButton = screen.getByRole("button", { name: /削除する/i })
        await user.click(confirmButton)
      })

      await waitFor(() => {
        expect(mockDeleteTask).toHaveBeenCalledWith("task-1")
      })
    })
  })

  // ==============================
  // エラーハンドリング
  // ==============================
  describe("エラーハンドリング", () => {
    it("タスク作成失敗時にエラートーストを表示する", async () => {
      mockCreateTask.mockResolvedValue({
        success: false,
        message: "タスクの作成に失敗しました。",
      })

      const user = userEvent.setup()
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      const addButtons = screen.getAllByRole("button", { name: /タスクを追加/i })
      await user.click(addButtons[0])

      await waitFor(async () => {
        const titleInput = screen.getByLabelText(/タイトル/i)
        await user.type(titleInput, "テスト")
      })

      const createButton = screen.getByRole("button", { name: /作成$/i })
      await user.click(createButton)

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled()
      })
    })

    it("タスク削除失敗時にエラートーストを表示する", async () => {
      mockDeleteTask.mockResolvedValue({
        success: false,
        message: "タスクの削除に失敗しました。",
      })

      const user = userEvent.setup()
      render(<KanbanBoard {...DEFAULT_PROPS} />)

      await user.click(screen.getByText("バックログタスク1"))

      // 編集モードへ切り替え
      await user.click(screen.getByTestId("switch-to-edit"))

      await waitFor(async () => {
        const deleteButton = screen.getByRole("button", { name: /^削除$/i })
        await user.click(deleteButton)
      })

      // 確認モーダルの「削除する」をクリック
      await waitFor(async () => {
        const confirmButton = screen.getByRole("button", { name: /削除する/i })
        await user.click(confirmButton)
      })

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalled()
      })
    })
  })
})
