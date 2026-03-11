"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * startProject の戻り値型
 */
export interface StartProjectResult {
  success: boolean
  message: string
  termChanged?: boolean
}

/**
 * startProject Server Action
 *
 * 着手操作を実行する。排他制御 + assignment 作成 + ターム移行を
 * start_project RPC 関数のトランザクションで処理する。
 * 着手時に提出予定日（dueDate）を設定する。
 *
 * Task 7.1
 * Requirements: 3.1, 3.5, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4, 6.6
 *
 * @param projectId - 着手する模擬案件の ID
 * @param dueDate - 提出予定日（ISO 8601 文字列、任意）
 * @returns StartProjectResult - 成功/失敗、メッセージ、ターム移行有無
 */
export async function startProject(
  projectId: string,
  dueDate?: string | null
): Promise<StartProjectResult> {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // start_project RPC 呼び出し
  const { data, error } = await supabase.rpc("start_project", {
    p_user_id: user.id,
    p_project_id: projectId,
  })

  if (error) {
    console.error("startProject RPC error:", error.message)
    return {
      success: false,
      message: "着手処理に失敗しました。もう一度お試しください。",
    }
  }

  // 提出予定日の設定（RPC 成功後に assignment を更新）
  // RPC は SECURITY DEFINER で INSERT するため、直後の UPDATE が RLS で弾かれる場合に備え adminClient を使用
  if (dueDate && data?.assignment_id) {
    const adminClient = createAdminClient()
    const { error: dueDateError } = await adminClient
      .from("project_assignments")
      .update({ due_date: dueDate })
      .eq("id", data.assignment_id)

    if (dueDateError) {
      console.error("startProject due_date update error:", dueDateError.message)
    }
  }

  // 成功: revalidatePath で詳細ページを再検証
  revalidatePath("/projects")

  const termChanged = data?.term_changed ?? false

  return {
    success: true,
    message: termChanged
      ? "案件に着手しました。実践タームに移行しました。"
      : "案件に着手しました。",
    termChanged,
  }
}

/**
 * updateDueDate Server Action
 *
 * 提出予定日を更新する。
 *
 * @param assignmentId - 対象の assignment ID
 * @param dueDate - 提出予定日（ISO 8601 文字列、null で解除）
 * @returns { success, message }
 */
export async function updateDueDate(
  assignmentId: string,
  dueDate: string | null
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // 過去日付のバリデーション
  if (dueDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(dueDate)
    selected.setHours(0, 0, 0, 0)
    if (selected < today) {
      return {
        success: false,
        message: "過去の日付は設定できません。",
      }
    }
  }

  // 所有者確認
  const { data: assignment } = await supabase
    .from("project_assignments")
    .select("id")
    .eq("id", assignmentId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!assignment) {
    return {
      success: false,
      message: "この操作を行う権限がありません。",
    }
  }

  // adminClient で更新（RLS による UPDATE 失敗を回避）
  const adminClient = createAdminClient()
  const { error: updateError } = await adminClient
    .from("project_assignments")
    .update({ due_date: dueDate })
    .eq("id", assignmentId)

  if (updateError) {
    console.error("updateDueDate error:", updateError.message)
    return {
      success: false,
      message: "提出予定日の更新に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/projects")

  return {
    success: true,
    message: dueDate
      ? "提出予定日を設定しました。"
      : "提出予定日を解除しました。",
  }
}

/**
 * submitWork の戻り値型
 */
export interface SubmitWorkResult {
  success: boolean
  message: string
}

/**
 * submitWork Server Action
 *
 * 成果物を提出する。URL（任意）+ ファイル（任意・複数可）。
 * 認証チェックと grading 中の排他制御（サーバーサイド二重防御）を行う。
 *
 * Task 8.1
 * Requirements: 5.3, 5.8, 6.5, 6.6
 *
 * @param assignmentId - 提出先の assignment ID
 * @param submissionUrl - 提出 URL（任意）
 * @param submissionFiles - 提出ファイル情報（任意・複数可）
 * @returns SubmitWorkResult - 成功/失敗、メッセージ
 */
export async function submitWork(
  assignmentId: string,
  submissionUrl?: string | null,
  submissionFiles?: { name: string; url: string }[] | null
): Promise<SubmitWorkResult> {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // grading 中チェック（最新 submission のステータス確認）
  const { data: latestSubmission } = await supabase
    .from("project_submissions")
    .select("id, status")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (latestSubmission?.status === "grading") {
    return {
      success: false,
      message: "採点中のため提出できません。採点完了までお待ちください。",
    }
  }

  // project_submissions に status='submitted' でレコード作成
  const { error: insertError } = await supabase
    .from("project_submissions")
    .insert({
      assignment_id: assignmentId,
      submission_url: submissionUrl || null,
      submission_files: submissionFiles ?? [],
      status: "submitted",
    })
    .select()
    .single()

  if (insertError) {
    console.error("submitWork insert error:", insertError.message)
    return {
      success: false,
      message: "提出に失敗しました。もう一度お試しください。",
    }
  }

  // 成功: revalidatePath で詳細ページを再検証
  revalidatePath("/projects")

  return {
    success: true,
    message: "成果物を提出しました。",
  }
}

// ==============================
// Task CRUD Types & Actions
// ==============================

/**
 * タスクステータス型
 */
export type TaskStatus = "backlog" | "todo" | "in_progress" | "done"

/**
 * タスク CRUD の戻り値型
 */
export interface TaskResult {
  success: boolean
  message: string
  task?: {
    id: string
    taskNumber: number
    title: string
    description: string | null
    status: TaskStatus
    order: number
  }
}

/**
 * ロールチェック共通ユーティリティ
 *
 * Manager は編集不可。User と Super Admin のみ編集可能。
 */
async function checkTaskEditPermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ allowed: boolean; message?: string }> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  if (profileError || !profile) {
    return { allowed: false, message: "ユーザー情報の取得に失敗しました。" }
  }

  if (profile.role === "manager") {
    return {
      allowed: false,
      message: "この操作を行う権限がありません。",
    }
  }

  return { allowed: true }
}

/**
 * createTask Server Action
 *
 * タスクを作成する。
 * 認証チェックとロール確認を行い、デフォルトステータス backlog で作成する。
 *
 * Task 10.1
 * Requirements: 11.2, 11.3, 11.4
 *
 * @param assignmentId - 紐づく assignment の ID
 * @param title - タスクタイトル（必須）
 * @param description - タスク説明（任意）
 * @param status - タスクステータス
 * @returns TaskResult - 処理結果
 */
export async function createTask(
  assignmentId: string,
  title: string,
  description: string | null,
  status: TaskStatus
): Promise<TaskResult> {
  // タイトルバリデーション
  if (!title || title.trim() === "") {
    return {
      success: false,
      message: "タイトルは必須です。",
    }
  }

  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // ロールチェック
  const permission = await checkTaskEditPermission(supabase, user.id)
  if (!permission.allowed) {
    return {
      success: false,
      message: permission.message ?? "この操作を行う権限がありません。",
    }
  }

  // 同じ assignment + status の既存タスク数を取得して order を決定
  const { data: existingTasks } = await supabase
    .from("project_tasks")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("status", status)

  const order = existingTasks?.length ?? 0

  // task_number を算出（assignment 内の MAX + 1、削除されても欠番にしない）
  const { data: maxRow } = await supabase
    .from("project_tasks")
    .select("task_number")
    .eq("assignment_id", assignmentId)
    .order("task_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  const taskNumber = (maxRow?.task_number ?? 0) + 1

  // タスク作成（RLS による INSERT 失敗を回避するため adminClient を使用）
  const adminClient = createAdminClient()
  const { data: task, error: insertError } = await adminClient
    .from("project_tasks")
    .insert({
      assignment_id: assignmentId,
      title: title.trim(),
      description: description?.trim() || null,
      status,
      order,
      created_by: user.id,
      task_number: taskNumber,
    })
    .select("id, task_number, title, description, status, order")
    .single()

  if (insertError || !task) {
    console.error("createTask insert error:", insertError?.message)
    return {
      success: false,
      message: "タスクの作成に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/projects")

  return {
    success: true,
    message: "タスクを作成しました。",
    task: {
      id: task.id,
      taskNumber: task.task_number,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      order: task.order,
    },
  }
}

/**
 * updateTask Server Action
 *
 * タスクのタイトルと説明を更新する。
 *
 * Task 10.1
 * Requirements: 11.2, 11.3
 *
 * @param taskId - 更新対象のタスク ID
 * @param title - 新しいタイトル（必須）
 * @param description - 新しい説明（任意）
 * @returns TaskResult - 処理結果
 */
export async function updateTask(
  taskId: string,
  title: string,
  description: string | null
): Promise<TaskResult> {
  // タイトルバリデーション
  if (!title || title.trim() === "") {
    return {
      success: false,
      message: "タイトルは必須です。",
    }
  }

  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // ロールチェック
  const permission = await checkTaskEditPermission(supabase, user.id)
  if (!permission.allowed) {
    return {
      success: false,
      message: permission.message ?? "この操作を行う権限がありません。",
    }
  }

  // タスク更新（RLS による UPDATE 失敗を回避するため adminClient を使用）
  const adminClient = createAdminClient()
  const { data: task, error: updateError } = await adminClient
    .from("project_tasks")
    .update({
      title: title.trim(),
      description: description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select("id, task_number, title, description, status, order")
    .single()

  if (updateError || !task) {
    console.error("updateTask error:", updateError?.message)
    return {
      success: false,
      message: "タスクの更新に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/projects")

  return {
    success: true,
    message: "タスクを更新しました。",
    task: {
      id: task.id,
      taskNumber: task.task_number,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      order: task.order,
    },
  }
}

/**
 * updateTaskStatus Server Action
 *
 * タスクのステータスと並び順を更新する。
 * カンバンボードのドラッグ&ドロップで使用される。
 *
 * Task 10.1
 * Requirements: 11.4
 *
 * @param taskId - 更新対象のタスク ID
 * @param status - 新しいステータス
 * @param order - 新しい並び順
 * @returns TaskResult - 処理結果
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  order: number
): Promise<TaskResult> {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // ロールチェック
  const permission = await checkTaskEditPermission(supabase, user.id)
  if (!permission.allowed) {
    return {
      success: false,
      message: permission.message ?? "この操作を行う権限がありません。",
    }
  }

  // ステータスと order を更新（RLS による UPDATE 失敗を回避するため adminClient を使用）
  const adminClient = createAdminClient()
  const { data: task, error: updateError } = await adminClient
    .from("project_tasks")
    .update({
      status,
      order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select("id, task_number, title, description, status, order")
    .single()

  if (updateError || !task) {
    console.error("updateTaskStatus error:", updateError?.message)
    return {
      success: false,
      message: "タスクのステータス更新に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/projects")

  return {
    success: true,
    message: "タスクのステータスを更新しました。",
    task: {
      id: task.id,
      taskNumber: task.task_number,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      order: task.order,
    },
  }
}

/**
 * deleteTask Server Action
 *
 * タスクを物理削除する。
 *
 * Task 10.1
 * Requirements: 11.4
 *
 * @param taskId - 削除対象のタスク ID
 * @returns { success, message } - 処理結果
 */
export async function deleteTask(
  taskId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // ロールチェック
  const permission = await checkTaskEditPermission(supabase, user.id)
  if (!permission.allowed) {
    return {
      success: false,
      message: permission.message ?? "この操作を行う権限がありません。",
    }
  }

  // タスク削除（RLS による DELETE 失敗を回避するため adminClient を使用）
  const adminClient = createAdminClient()
  const { error: deleteError } = await adminClient
    .from("project_tasks")
    .delete()
    .eq("id", taskId)

  if (deleteError) {
    console.error("deleteTask error:", deleteError.message)
    return {
      success: false,
      message: "タスクの削除に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/projects")

  return {
    success: true,
    message: "タスクを削除しました。",
  }
}

/**
 * updateSubmissionStatus Server Action
 *
 * Super Admin が submission のステータスを graded に手動変更する。
 * 長期 rejected 状態のブロック解除用途。
 *
 * Task 11.1
 * Requirements: 6.7
 *
 * @param submissionId - 対象の submission ID
 * @param status - 変更先のステータス（"graded" のみ許可）
 * @returns { success, message } - 処理結果
 */
export async function updateSubmissionStatus(
  submissionId: string,
  status: "graded"
): Promise<{ success: boolean; message: string }> {
  // 引数バリデーション
  if (!submissionId) {
    return {
      success: false,
      message: "submission ID が指定されていません。",
    }
  }

  if (status !== "graded") {
    return {
      success: false,
      message: "変更可能なステータスは graded のみです。",
    }
  }

  // 認証チェック
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // Super Admin ロール確認
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return {
      success: false,
      message: "ユーザー情報の取得に失敗しました。",
    }
  }

  if (profile.role !== "super_admin") {
    return {
      success: false,
      message: "この操作を行う権限がありません。",
    }
  }

  // Admin Client で RLS をバイパスしてステータスを更新
  const adminClient = createAdminClient()

  const { error: updateError } = await adminClient
    .from("project_submissions")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)

  if (updateError) {
    console.error("updateSubmissionStatus error:", updateError.message)
    return {
      success: false,
      message: "ステータスの更新に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/projects")

  return {
    success: true,
    message: "提出ステータスを採点完了に更新しました。",
  }
}
