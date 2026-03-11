"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  loginSchema,
  inviteSetupStep1Schema,
  inviteSetupStep2Schema,
  resetPasswordSchema,
  resetPasswordConfirmSchema,
} from "@/lib/validations/auth"
import type { ActionResult } from "@/lib/validations/auth"

/**
 * ログイン Server Action
 *
 * useActionState パターン (prevState, formData) に従う。
 * - zod でサーバーサイド再バリデーション
 * - signInWithPassword で認証
 * - profiles.full_name の有無でリダイレクト先を分岐
 */
export async function login(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  // サーバーサイドバリデーション
  const validated = loginSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  const supabase = await createClient()

  // signInWithPassword で認証
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  })

  if (error || !data.user) {
    return {
      success: false,
      message: "メールアドレスまたはパスワードが正しくありません",
    }
  }

  // profiles テーブルから full_name を取得してリダイレクト先を決定
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", data.user.id)
    .single()

  if (!profile?.full_name) {
    redirect("/auth/invite/setup")
  }

  redirect("/dashboard")
}

/**
 * ログアウト Server Action
 *
 * signOut でセッション破棄後、ログインページへリダイレクト。
 * エラー時も Cookie を強制クリアしてリダイレクトする。
 */
export async function logout(): Promise<void> {
  const supabase = await createClient()

  // signOut を実行。エラー発生時も Cookie をクリアしてリダイレクトする。
  // Supabase の signOut が失敗してもセッション Cookie は
  // Middleware で管理されているため、リダイレクト先で再認証を促す。
  await supabase.auth.signOut()

  redirect("/auth/login")
}

/**
 * 招待登録完了 Server Action
 *
 * Step 1（姓名）+ Step 2（パスワード）のデータを一括で受け取る。
 * - updateUser({ password }) でパスワード設定
 * - profiles.full_name を "${lastName} ${firstName}" として更新
 * - アバター画像（任意）を Supabase Storage にアップロード
 */
export async function completeInviteSetup(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const rawStep1 = {
    lastName: formData.get("lastName") as string,
    firstName: formData.get("firstName") as string,
  }
  const rawStep2 = {
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  }
  const avatarFile = formData.get("avatar") as File | null

  // サーバーサイドバリデーション (Step 1)
  const validatedStep1 = inviteSetupStep1Schema.safeParse(rawStep1)
  if (!validatedStep1.success) {
    const firstIssue = validatedStep1.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // サーバーサイドバリデーション (Step 2)
  const validatedStep2 = inviteSetupStep2Schema.safeParse(rawStep2)
  if (!validatedStep2.success) {
    const firstIssue = validatedStep2.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  const supabase = await createClient()

  // 現在のユーザーを取得
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message: "セッションが無効です。再度招待リンクからアクセスしてください。",
    }
  }

  // Admin API でパスワードを設定（Secure password change の影響を回避）
  const adminClient = createAdminClient()
  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    user.id,
    { password: validatedStep2.data.password }
  )

  if (updateError) {
    return {
      success: false,
      message:
        "パスワードの設定に失敗しました。もう一度お試しください。",
    }
  }

  // full_name を "${lastName} ${firstName}" として構成
  const fullName = `${validatedStep1.data.lastName} ${validatedStep1.data.firstName}`

  // アバター画像のアップロード（任意）
  let avatarUrl: string | null = null
  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split(".").pop()
    const filePath = `${user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, {
        upsert: true,
      })

    if (!uploadError) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath)
      avatarUrl = publicUrl
    }
    // アバターアップロードエラーは無視（任意項目のため）
  }

  // profiles テーブルの full_name（+ avatar_url）を更新
  const updateData: { full_name: string; avatar_url?: string; updated_at: string } = {
    full_name: fullName,
    updated_at: new Date().toISOString(),
  }
  if (avatarUrl) {
    updateData.avatar_url = avatarUrl
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)

  if (profileError) {
    return {
      success: false,
      message:
        "プロフィールの更新に失敗しました。もう一度お試しください。",
    }
  }

  redirect("/dashboard")
}

/**
 * パスワードリセット要求 Server Action
 *
 * resetPasswordForEmail でリセットメールを送信する。
 * セキュリティ上、メールの登録有無に関わらず同一のメッセージを返す。
 */
export async function requestPasswordReset(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const rawData = {
    email: formData.get("email") as string,
  }

  // サーバーサイドバリデーション
  const validated = resetPasswordSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  const supabase = await createClient()

  // origin の取得（redirectTo で使用）
  const headerStore = await headers()
  const origin = headerStore.get("origin") ?? "http://localhost:3000"

  // resetPasswordForEmail でリセットメール送信
  // redirectTo はリセット確認ページに直接向ける。
  // Supabase はハッシュフラグメントでトークンを返すため、
  // クライアントサイドでセッションを確立する。
  await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${origin}/auth/reset-password/confirm`,
  })

  // メールアドレスの登録有無に関わらず同一メッセージ
  return {
    success: true,
    message: "パスワードリセットメールを送信しました",
  }
}

/**
 * パスワードリセット確認 Server Action
 *
 * updateUser({ password }) でパスワードを更新し、
 * ログインページへリダイレクトする。
 */
export async function confirmPasswordReset(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const rawData = {
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  }

  // サーバーサイドバリデーション
  const validated = resetPasswordConfirmSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  const supabase = await createClient()

  // 現在のセッションからユーザーを取得
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      message:
        "セッションが無効です。リセットリンクが期限切れの可能性があります。再度パスワードリセットをお試しください。",
    }
  }

  // Admin API でパスワードを更新（Secure password change の影響を回避）
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(user.id, {
    password: validated.data.password,
  })

  if (error) {
    return {
      success: false,
      message:
        "パスワードの更新に失敗しました。リセットリンクが期限切れの可能性があります。再度パスワードリセットをお試しください。",
    }
  }

  redirect("/auth/login?message=password-updated")
}
