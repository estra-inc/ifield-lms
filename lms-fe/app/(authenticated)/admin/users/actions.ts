"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  inviteUserSchema,
  changeRoleSchema,
  userIdSchema,
  grantCreditsSchema,
} from "@/lib/validations/user-management"
import type { ActionResult } from "@/lib/validations/auth"

// ---- 共通ヘルパー ----

/**
 * 呼び出し元ユーザーの認証確認と super_admin 権限の検証を行う。
 *
 * @returns 認証済みユーザーのID。認証失敗時は ActionResult を返す。
 */
async function verifySuperAdmin(): Promise<
  { userId: string } | { error: ActionResult }
> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      error: {
        success: false,
        message: "認証されていません。再度ログインしてください。",
      },
    }
  }

  // profiles テーブルから role を取得
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return {
      error: {
        success: false,
        message: "ユーザー情報の取得に失敗しました。",
      },
    }
  }

  if (profile.role !== "super_admin") {
    return {
      error: {
        success: false,
        message: "この操作を行う権限がありません。",
      },
    }
  }

  return { userId: user.id }
}

// ---- Server Actions ----

/**
 * ユーザー招待 Server Action
 *
 * Supabase Auth Admin API の inviteUserByEmail を使用して招待メールを送信する。
 * 招待時に options.data で user_metadata にロール情報を設定する。
 */
export async function inviteUser(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 認証・権限チェック
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  // バリデーション
  const rawData = {
    email: formData.get("email") as string,
    role: formData.get("role") as string,
  }

  const validated = inviteUserSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // Admin API で招待メール送信
  const headerStore = await headers()
  const origin = headerStore.get("origin") ?? "http://localhost:3000"

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.inviteUserByEmail(
    validated.data.email,
    {
      data: { role: validated.data.role },
      redirectTo: `${origin}/auth/callback`,
    }
  )

  if (error) {
    // 重複メールアドレスのエラーハンドリング
    if (
      error.message.includes("already registered") ||
      error.message.includes("already been registered")
    ) {
      return {
        success: false,
        message: "このメールアドレスは既に登録されています。",
      }
    }

    console.error("inviteUser error:", error.message, error.status)
    return {
      success: false,
      message: `招待メールの送信に失敗しました: ${error.message}`,
    }
  }

  revalidatePath("/admin/users")
  return {
    success: true,
    message: "招待メールを送信しました。",
  }
}

/**
 * ロール変更 Server Action
 *
 * profiles テーブルの role カラムを指定されたロールに更新する。
 */
export async function changeUserRole(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 認証・権限チェック
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  // バリデーション
  const rawData = {
    userId: formData.get("userId") as string,
    role: formData.get("role") as string,
  }

  const validated = changeRoleSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // profiles テーブルの role を更新
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("profiles")
    .update({ role: validated.data.role, updated_at: new Date().toISOString() })
    .eq("id", validated.data.userId)

  if (error) {
    console.error("changeUserRole error:", error.message)
    return {
      success: false,
      message: "ロールの変更に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${validated.data.userId}`)
  return {
    success: true,
    message: "ロールを変更しました。",
  }
}

/**
 * アカウント無効化（ban）Server Action
 *
 * Supabase Auth Admin API の updateUserById で ban_duration: "876000h" を設定する。
 */
export async function deactivateUser(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 認証・権限チェック
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  // バリデーション
  const rawData = {
    userId: formData.get("userId") as string,
  }

  const validated = userIdSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // Auth Admin API で ban を設定
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(
    validated.data.userId,
    { ban_duration: "876000h" }
  )

  if (error) {
    console.error("deactivateUser error:", error.message)
    return {
      success: false,
      message: "アカウントの無効化に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${validated.data.userId}`)
  return {
    success: true,
    message: "アカウントを無効化しました。",
  }
}

/**
 * アカウント有効化（unban）Server Action
 *
 * Supabase Auth Admin API の updateUserById で ban_duration: "none" を設定して ban を解除する。
 */
export async function activateUser(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 認証・権限チェック
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  // バリデーション
  const rawData = {
    userId: formData.get("userId") as string,
  }

  const validated = userIdSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // Auth Admin API で ban を解除
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(
    validated.data.userId,
    { ban_duration: "none" }
  )

  if (error) {
    console.error("activateUser error:", error.message)
    return {
      success: false,
      message: "アカウントの有効化に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/admin/users")
  revalidatePath(`/admin/users/${validated.data.userId}`)
  return {
    success: true,
    message: "アカウントを有効化しました。",
  }
}

/**
 * 物理削除 Server Action
 *
 * Supabase Auth Admin API の deleteUser を使用して対象ユーザーを完全に削除する。
 * profiles テーブルは ON DELETE CASCADE で連動削除される。
 */
export async function deleteUserPermanently(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 認証・権限チェック
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  // バリデーション
  const rawData = {
    userId: formData.get("userId") as string,
  }

  const validated = userIdSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // Auth Admin API で物理削除
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(
    validated.data.userId
  )

  if (error) {
    console.error("deleteUserPermanently error:", error.message)
    return {
      success: false,
      message: "ユーザーの削除に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/admin/users")
  return {
    success: true,
    message: "ユーザーを完全に削除しました。",
  }
}

/**
 * コーチング枠付与 Server Action
 *
 * coaching_credits に amount: +N, reason: 'admin_grant' を INSERT する。
 * Super Admin のみ実行可能。
 */
export async function grantCoachingCredits(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  const rawData = {
    userId: formData.get("userId") as string,
    amount: Number(formData.get("amount")),
  }

  const validated = grantCreditsSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("coaching_credits")
    .insert({
      user_id: validated.data.userId,
      amount: validated.data.amount,
      reason: "admin_grant" as const,
      granted_by: authResult.userId,
    })

  if (error) {
    console.error("grantCoachingCredits error:", error.message)
    return {
      success: false,
      message: "コーチング枠の付与に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath(`/admin/users/${validated.data.userId}`)
  const amt = validated.data.amount
  return {
    success: true,
    message: amt > 0
      ? `コーチング枠を ${amt} 回分付与しました。`
      : `コーチング枠を ${Math.abs(amt)} 回分剥奪しました。`,
  }
}

/**
 * コーチ手動割り当て / 変更 Server Action（管理者用）
 *
 * coach_assignments に UPSERT する。
 */
export async function assignCoach(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  const userId = formData.get("userId") as string
  const genre = formData.get("genre") as string
  const coachId = formData.get("coachId") as string

  if (!userId || !genre || !coachId) {
    return { success: false, message: "必須パラメータが不足しています。" }
  }

  if (genre !== "engineering" && genre !== "design") {
    return { success: false, message: "無効なジャンルです。" }
  }

  // コーチが有効か確認（role + genre + ban）
  const adminClient = createAdminClient()

  const { data: coachProfile } = await adminClient
    .from("profiles")
    .select("id, full_name, role, default_genre")
    .eq("id", coachId)
    .single()

  if (!coachProfile || coachProfile.role !== "super_admin") {
    return { success: false, message: "指定されたコーチが見つからないか、コーチ権限がありません。" }
  }

  if (coachProfile.default_genre !== genre) {
    return { success: false, message: "指定されたコーチはこのジャンルを担当していません。" }
  }

  // ban チェック
  const { data: authData } = await adminClient.auth.admin.getUserById(coachId)
  const bannedUntil = authData?.user?.banned_until ?? null
  if (bannedUntil && new Date(bannedUntil) > new Date()) {
    return { success: false, message: "指定されたコーチは現在無効化されています。" }
  }

  const { error } = await adminClient
    .from("coach_assignments")
    .upsert(
      {
        user_id: userId,
        genre: genre as "engineering" | "design",
        coach_id: coachId,
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,genre" }
    )

  if (error) {
    console.error("assignCoach error:", error.message)
    return { success: false, message: "コーチの割り当てに失敗しました。" }
  }

  revalidatePath(`/admin/users/${userId}`)
  return {
    success: true,
    message: `${coachProfile.full_name ?? "コーチ"} を担当コーチに割り当てました。`,
  }
}

/**
 * コーチングセッション メモ保存 Server Action（管理者用）
 *
 * Super Admin が任意ユーザーのセッション notes を更新する。
 */
export async function saveSessionNote(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  const sessionId = formData.get("sessionId") as string
  const notes = formData.get("notes") as string | null

  if (!sessionId) {
    return { success: false, message: "セッションIDが不足しています。" }
  }

  const adminClient = createAdminClient()

  const { error: updateError } = await adminClient
    .from("coaching_sessions")
    .update({
      notes: notes ?? "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  if (updateError) {
    console.error("saveSessionNote: update error:", updateError.message)
    return { success: false, message: "メモの保存に失敗しました。" }
  }

  return { success: true, message: "メモを保存しました。" }
}
