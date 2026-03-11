import { createClient } from "@/lib/supabase/server"
import { KanbanBoard } from "./kanban-board"
import type { KanbanTask } from "./kanban-board"

/**
 * TasksTab Server Component
 *
 * 「タスク管理」タブの Server Component。
 * assignment に紐づくタスクを取得し、KanbanBoard に渡す。
 *
 * Task 10.4
 * Requirements: 11.1, 11.5, 11.6
 */

interface TasksTabProps {
  assignmentId: string
  userRole: string
  userId: string
}

export async function TasksTab({
  assignmentId,
  userRole,
  userId,
}: TasksTabProps) {
  const supabase = await createClient()

  // assignment に紐づくタスクを取得
  const { data: tasks, error } = await supabase
    .from("project_tasks")
    .select("id, task_number, title, description, status, order, created_by")
    .eq("assignment_id", assignmentId)
    .order("order", { ascending: true })

  if (error) {
    console.error("TasksTab fetch error:", error.message)
    return (
      <p className="font-mono text-sm text-muted-foreground">
        タスクの取得に失敗しました。
      </p>
    )
  }

  // KanbanTask 型に変換
  const initialTasks: KanbanTask[] = (tasks ?? []).map((t) => ({
    id: t.id,
    taskNumber: t.task_number,
    title: t.title,
    description: t.description,
    status: t.status as KanbanTask["status"],
    order: t.order,
    createdBy: t.created_by,
  }))

  // canEdit: User は自身の assignment のタスクのみ、Super Admin は全タスク編集可能、Manager は編集不可
  const canEdit = userRole === "user" || userRole === "super_admin"

  return (
    <div className="space-y-4">
      <h2 className="font-[family-name:var(--font-primary)] text-lg font-semibold text-foreground">
        タスク管理
      </h2>
      <KanbanBoard
        assignmentId={assignmentId}
        initialTasks={initialTasks}
        canEdit={canEdit}
      />
    </div>
  )
}
