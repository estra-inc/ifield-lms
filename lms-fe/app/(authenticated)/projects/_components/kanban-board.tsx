"use client"

import { useState, useTransition, useCallback } from "react"
import { toast } from "sonner"
import { Plus, GripVertical, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownEditor } from "@/app/(authenticated)/projects/_components/markdown-editor"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from "@/app/(authenticated)/projects/actions"
import type { TaskStatus } from "@/app/(authenticated)/projects/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"

/**
 * KanbanBoard Client Component
 *
 * 4カラム（バックログ / ToDo / 進行中 / 完了）のカンバンボードを表示する。
 * ドラッグ&ドロップによるカラム間のタスク移動と並び替えを実装する。
 *
 * Task 10.2, 10.3
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

export interface KanbanTask {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  order: number
  createdBy: string
}

export interface KanbanBoardProps {
  assignmentId: string
  initialTasks: KanbanTask[]
  canEdit: boolean
}

/**
 * カラム定義
 */
const COLUMNS: { key: TaskStatus; label: string; colorClass: string }[] = [
  { key: "backlog", label: "バックログ", colorClass: "text-muted-foreground" },
  { key: "todo", label: "ToDo", colorClass: "text-primary" },
  { key: "in_progress", label: "進行中", colorClass: "text-amber-500" },
  { key: "done", label: "完了", colorClass: "text-emerald-500" },
]

export function KanbanBoard({
  assignmentId,
  initialTasks,
  canEdit,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<KanbanTask[]>(initialTasks)
  const [isPending, startTransition] = useTransition()

  // ドロワー状態
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null)
  const [dialogTargetStatus, setDialogTargetStatus] =
    useState<TaskStatus>("backlog")
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null)

  // フォーム状態
  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")

  // 削除確認モーダル状態
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // エディタモード状態（プレビュー時にフッターを非表示にするため）
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit")

  // ドラッグ状態
  const [draggedTask, setDraggedTask] = useState<KanbanTask | null>(null)

  /**
   * カラムのタスクを取得（order 順にソート）
   */
  const getColumnTasks = useCallback(
    (status: TaskStatus): KanbanTask[] => {
      return tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.order - b.order)
    },
    [tasks]
  )

  /**
   * タスク追加ドロワーを開く
   */
  const openCreateDialog = (status: TaskStatus) => {
    setDialogMode("create")
    setDialogTargetStatus(status)
    setFormTitle("")
    setFormDescription("")
    setEditingTask(null)
    setEditorMode("edit")
  }

  /**
   * タスク編集ドロワーを開く
   */
  const openEditDialog = (task: KanbanTask) => {
    if (!canEdit) return
    setDialogMode("edit")
    setEditingTask(task)
    setFormTitle(task.title)
    setFormDescription(task.description ?? "")
    setEditorMode("preview")
  }

  /**
   * ドロワーを閉じる
   */
  const closeDialog = () => {
    setDialogMode(null)
    setEditingTask(null)
    setFormTitle("")
    setFormDescription("")
    setEditorMode("edit")
  }

  /**
   * タスク作成の実行
   */
  const handleCreateTask = () => {
    if (!formTitle.trim()) return

    startTransition(async () => {
      const result = await createTask(
        assignmentId,
        formTitle.trim(),
        formDescription.trim() || null,
        dialogTargetStatus
      )

      if (result.success && result.task) {
        setTasks((prev) => [
          ...prev,
          {
            id: result.task!.id,
            title: result.task!.title,
            description: result.task!.description,
            status: result.task!.status,
            order: result.task!.order,
            createdBy: "",
          },
        ])
        toast.success(result.message)
        closeDialog()
      } else {
        toast.error(result.message)
      }
    })
  }

  /**
   * タスク更新の実行
   */
  const handleUpdateTask = () => {
    if (!editingTask || !formTitle.trim()) return

    startTransition(async () => {
      const result = await updateTask(
        editingTask.id,
        formTitle.trim(),
        formDescription.trim() || null
      )

      if (result.success && result.task) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === editingTask.id
              ? {
                  ...t,
                  title: result.task!.title,
                  description: result.task!.description,
                }
              : t
          )
        )
        toast.success(result.message)
        closeDialog()
      } else {
        toast.error(result.message)
      }
    })
  }

  /**
   * タスク削除の実行
   */
  const handleDeleteTask = (taskId: string) => {
    startTransition(async () => {
      const result = await deleteTask(taskId)

      if (result.success) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId))
        toast.success(result.message)
        closeDialog()
      } else {
        toast.error(result.message)
      }
    })
  }

  /**
   * ファイルアップロードコールバック（クライアントから直接 Supabase Storage へ）
   */
  const handleUpload = useCallback(
    async (file: File) => {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("認証されていません。再度ログインしてください。")
        return null
      }

      const timestamp = Date.now()
      const storagePath = `${user.id}/${assignmentId}/${timestamp}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(storagePath, file)

      if (uploadError) {
        toast.error(`アップロードに失敗しました: ${uploadError.message}`)
        return null
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("task-attachments").getPublicUrl(storagePath)

      return publicUrl
    },
    [assignmentId]
  )

  /**
   * ドラッグ開始
   */
  const handleDragStart = (task: KanbanTask) => {
    if (!canEdit) return
    setDraggedTask(task)
  }

  /**
   * ドラッグオーバー（カラムへのドロップを許可）
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  /**
   * ドロップ（楽観的更新）
   */
  const handleDrop = (targetStatus: TaskStatus) => {
    if (!draggedTask || !canEdit) return

    const previousTasks = [...tasks]
    const targetColumnTasks = tasks.filter(
      (t) => t.status === targetStatus && t.id !== draggedTask.id
    )
    const newOrder = targetColumnTasks.length

    // 楽観的更新
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTask.id
          ? { ...t, status: targetStatus, order: newOrder }
          : t
      )
    )

    setDraggedTask(null)

    // サーバーに永続化
    startTransition(async () => {
      const result = await updateTaskStatus(
        draggedTask.id,
        targetStatus,
        newOrder
      )

      if (!result.success) {
        // ロールバック
        setTasks(previousTasks)
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((column) => {
          const columnTasks = getColumnTasks(column.key)

          return (
            <div
              key={column.key}
              className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.key)}
              data-testid={`column-${column.key}`}
            >
              {/* カラムヘッダー */}
              <div className="flex items-center justify-between">
                <h3
                  className={`font-[family-name:var(--font-primary)] text-sm font-semibold ${column.colorClass}`}
                >
                  {column.label}
                </h3>
                <span className="font-mono text-xs text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>

              {/* タスクカード */}
              <div className="flex flex-col gap-1.5">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`group cursor-pointer rounded-md border border-border bg-card p-3 transition-colors hover:bg-muted/50 ${
                      draggedTask?.id === task.id ? "opacity-50" : ""
                    }`}
                    draggable={canEdit}
                    onDragStart={() => handleDragStart(task)}
                    onClick={() => openEditDialog(task)}
                    data-testid={`task-card-${task.id}`}
                  >
                    <div className="flex items-start gap-2">
                      {canEdit && (
                        <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-medium text-foreground">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="mt-1 line-clamp-2 font-mono text-xs text-muted-foreground">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* タスク追加ボタン */}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-1 text-muted-foreground"
                  onClick={() => openCreateDialog(column.key)}
                  aria-label={`${column.label}にタスクを追加`}
                >
                  <Plus className="size-3.5" />
                  タスクを追加
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* タスク作成・編集ドロワー */}
      <Sheet
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <SheetContent
          side="right"
          className="sm:max-w-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {dialogMode === "create" ? (
            <SheetHeader>
              <SheetTitle>タスクを作成</SheetTitle>
              <SheetDescription>
                新しいタスクを作成します。
              </SheetDescription>
            </SheetHeader>
          ) : (
            <SheetHeader className="sr-only">
              <SheetTitle>タスクを編集</SheetTitle>
              <SheetDescription>
                タスクの内容を編集します。
              </SheetDescription>
            </SheetHeader>
          )}

          <div className={`flex min-h-0 flex-1 flex-col gap-4 px-4 ${dialogMode === "edit" ? "pt-6" : ""}`}>
            <div className="space-y-2">
              <h3 className="font-[family-name:var(--font-primary)] text-sm font-semibold">
                タイトル
              </h3>
              <Input
                id="task-title"
                aria-label="タイトル"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="タスクのタイトル"
                disabled={isPending}
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <h3 className="font-[family-name:var(--font-primary)] text-sm font-semibold">
                説明
              </h3>
              <MarkdownEditor
                key={editingTask?.id ?? "create"}
                id="task-description"
                aria-label="説明"
                value={formDescription}
                onChange={setFormDescription}
                onUpload={handleUpload}
                placeholder="タスクの説明（任意）"
                disabled={isPending}
                defaultMode={dialogMode === "edit" ? "preview" : "edit"}
                onModeChange={setEditorMode}
                className="flex min-h-0 flex-1 flex-col"
              />
            </div>
          </div>

          {editorMode === "edit" && (
            <SheetFooter>
              {dialogMode === "edit" && editingTask && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isPending}
                  className="mr-auto"
                >
                  {isPending ? (
                    <Loader2 className="mr-1 size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 size-3.5" />
                  )}
                  削除
                </Button>
              )}
              <Button
                variant="outline"
                onClick={closeDialog}
                disabled={isPending}
              >
                キャンセル
              </Button>
              <Button
                onClick={
                  dialogMode === "create" ? handleCreateTask : handleUpdateTask
                }
                disabled={isPending || !formTitle.trim()}
              >
                {isPending && (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                )}
                {dialogMode === "create" ? "作成" : "更新"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* 削除確認モーダル */}
      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>タスクを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。タスクは完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (editingTask) handleDeleteTask(editingTask.id)
              }}
            >
              {isPending && (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              )}
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
