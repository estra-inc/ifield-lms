"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { randomBytes } from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  profileSchema,
  passwordChangeSchema,
  businessHoursSchema,
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/validations/settings"
import type { ActionResult } from "@/lib/validations/auth"

// ---- 型定義 ----

/**
 * アバターアップロードの戻り値型
 *
 * ActionResult を拡張し、アップロード成功時に新しい avatarUrl を含む。
 */
export interface AvatarUploadResult {
  success: boolean
  message: string
  avatarUrl?: string
}

/**
 * OAuth URL 生成の戻り値型
 */
export interface OAuthUrlResult {
  success: boolean
  message: string
  url?: string
}

// ---- 共通ヘルパー ----

/**
 * 呼び出し元ユーザーの認証確認を行う。
 *
 * @returns 認証済みユーザーのID。認証失敗時は ActionResult を返す。
 */
async function verifyAuthenticated(): Promise<
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

  return { userId: user.id }
}

/**
 * 呼び出し元ユーザーの認証確認と Super Admin 権限の検証を行う。
 *
 * @returns 認証済みユーザーのID。認証失敗または権限不足時は ActionResult を返す。
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

/**
 * MIME タイプからファイル拡張子を取得する。
 */
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  }
  return map[mimeType] ?? "bin"
}

// ---- Server Actions ----

/**
 * プロフィール更新 Server Action
 *
 * profiles テーブルの last_name, first_name, full_name を更新する。
 * full_name は常に "${last_name} ${first_name}" として同期更新する。
 */
export async function updateProfile(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 認証確認
  const authResult = await verifyAuthenticated()
  if ("error" in authResult) {
    return authResult.error
  }

  // Zod サーバーサイドバリデーション
  const rawData = {
    lastName: formData.get("lastName") as string,
    firstName: formData.get("firstName") as string,
  }

  const validated = profileSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // profiles テーブル更新
  const supabase = await createClient()
  const { lastName, firstName } = validated.data
  const fullName = `${lastName} ${firstName}`

  const { error } = await supabase
    .from("profiles")
    .update({
      last_name: lastName,
      first_name: firstName,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authResult.userId)

  if (error) {
    console.error("updateProfile error:", error.message)
    return {
      success: false,
      message: "プロフィールの更新に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/settings")
  return {
    success: true,
    message: "プロフィールを更新しました。",
  }
}

/**
 * アバター画像アップロード Server Action
 *
 * サーバーサイドでファイル形式・サイズを検証し、
 * avatars バケットにアップロード後、profiles.avatar_url を更新する。
 * 既存のアバターファイルは list + remove で削除する。
 */
export async function uploadAvatar(
  _prevState: ActionResult,
  formData: FormData
): Promise<AvatarUploadResult> {
  // 認証確認
  const authResult = await verifyAuthenticated()
  if ("error" in authResult) {
    return {
      success: false,
      message: "認証されていません。再度ログインしてください。",
    }
  }

  // ファイル取得
  const file = formData.get("avatar")
  if (!file || !(file instanceof File) || file.size === 0) {
    return {
      success: false,
      message: "アバター画像ファイルを選択してください。",
    }
  }

  // サーバーサイド MIME タイプ検証
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
    return {
      success: false,
      message: "ファイル形式が不正です。JPEG、PNG、WebP のいずれかを選択してください。",
    }
  }

  // サーバーサイドファイルサイズ検証
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      message: "ファイルサイズが2MBを超えています。2MB以下の画像を選択してください。",
    }
  }

  const supabase = await createClient()
  const userId = authResult.userId
  const ext = getExtensionFromMimeType(file.type)
  const filePath = `${userId}/avatar.${ext}`

  // 既存のアバターファイルを削除
  const { data: existingFiles } = await supabase.storage
    .from("avatars")
    .list(userId)

  if (existingFiles && existingFiles.length > 0) {
    const filesToRemove = existingFiles.map((f) => `${userId}/${f.name}`)
    await supabase.storage.from("avatars").remove(filesToRemove)
  }

  // 新しい画像をアップロード
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) {
    console.error("uploadAvatar storage error:", uploadError.message)
    return {
      success: false,
      message: "アバター画像のアップロードに失敗しました。もう一度お試しください。",
    }
  }

  // publicUrl を取得
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath)

  // profiles.avatar_url を更新
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (updateError) {
    console.error("uploadAvatar profile update error:", updateError.message)
    return {
      success: false,
      message: "プロフィールの更新に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/settings")
  return {
    success: true,
    message: "アバター画像を更新しました。",
    avatarUrl: publicUrl,
  }
}

/**
 * パスワード変更 Server Action
 *
 * Supabase Admin API (adminClient.auth.admin.updateUserById) を使用してパスワードを更新する。
 * Admin API を使用するため、現在のパスワード入力は不要。
 */
export async function changePassword(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // 認証確認
  const authResult = await verifyAuthenticated()
  if ("error" in authResult) {
    return authResult.error
  }

  // Zod サーバーサイドバリデーション
  const rawData = {
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  }

  const validated = passwordChangeSchema.safeParse(rawData)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // Admin API でパスワード更新
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(
    authResult.userId,
    { password: validated.data.newPassword }
  )

  if (error) {
    console.error("changePassword error:", error.message)
    return {
      success: false,
      message: "パスワードの変更に失敗しました。もう一度お試しください。",
    }
  }

  return {
    success: true,
    message: "パスワードを変更しました。",
  }
}

/**
 * Google OAuth 認可 URL 生成 Server Action
 *
 * Super Admin のみ実行可能。OAuth 認可画面への URL を生成し返却する。
 * CSRF 対策として state パラメータにランダムトークンを含め、Cookie に保存する。
 */
export async function initiateGoogleOAuth(): Promise<OAuthUrlResult> {
  // Super Admin 権限確認
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return {
      success: false,
      message: authResult.error?.message ?? "認証に失敗しました。",
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !redirectUri) {
    console.error("initiateGoogleOAuth: Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI")
    return {
      success: false,
      message: "Google Calendar 連携の設定が不足しています。管理者に連絡してください。",
    }
  }

  // CSRF 対策: ランダム state トークンを生成
  const state = randomBytes(32).toString("hex")

  // state を Cookie に保存
  const cookieStore = await cookies()
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10分
    path: "/",
  })

  // OAuth 認可 URL を構築
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
    state,
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return {
    success: true,
    message: "OAuth 認可 URL を生成しました。",
    url,
  }
}

/**
 * Google Calendar 連携解除 Server Action
 *
 * Super Admin のみ実行可能。system_integrations テーブルの
 * encrypted_refresh_token と connected_at を NULL に更新する。
 */
export async function disconnectGoogle(
  _prevState: ActionResult,
  _formData: FormData
): Promise<ActionResult> {
  // Super Admin 権限確認
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  // Admin Client で system_integrations を更新（RLS をバイパス）
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("system_integrations")
    .update({
      encrypted_refresh_token: null,
      connected_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("service_name", "google_calendar")

  if (error) {
    console.error("disconnectGoogle error:", error.message)
    return {
      success: false,
      message: "Google Calendar 連携の解除に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/settings")
  return {
    success: true,
    message: "Google Calendar 連携を解除しました。",
  }
}

/**
 * コーチングジャンル保存 Server Action
 *
 * Super Admin のみ実行可能。profiles テーブルの
 * default_genre カラムを更新する。
 */
export async function updateCoachingGenre(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  const genre = formData.get("genre") as string | null
  if (!genre || !["engineering", "design"].includes(genre)) {
    return {
      success: false,
      message: "無効なジャンルが指定されました。",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({
      default_genre: genre,
      updated_at: new Date().toISOString(),
    })
    .eq("id", authResult.userId)

  if (error) {
    console.error("updateCoachingGenre error:", error.message)
    return {
      success: false,
      message: "コーチングジャンルの保存に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/settings")
  return {
    success: true,
    message: "コーチングジャンルを保存しました。",
  }
}

/**
 * 稼働時間枠保存 Server Action
 *
 * Super Admin のみ実行可能。system_integrations テーブルの
 * business_hours カラムを UPSERT で更新する。
 * formData の businessHours フィールドに JSON 文字列を期待する。
 */
export async function updateBusinessHours(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // Super Admin 権限確認
  const authResult = await verifySuperAdmin()
  if ("error" in authResult) {
    return authResult.error
  }

  // formData から businessHours JSON 文字列を取得
  const rawJson = formData.get("businessHours") as string | null
  if (!rawJson) {
    return {
      success: false,
      message: "稼働時間枠データが送信されていません。",
    }
  }

  // JSON パース
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    return {
      success: false,
      message: "稼働時間枠データの形式が不正です。",
    }
  }

  // Zod バリデーション
  const validated = businessHoursSchema.safeParse(parsed)
  if (!validated.success) {
    const firstIssue = validated.error.issues[0]
    return {
      success: false,
      message: firstIssue.message,
    }
  }

  // Admin Client で system_integrations を更新（RLS をバイパス）
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("system_integrations")
    .update({
      business_hours: validated.data as import("@/lib/types/database").BusinessHours | import("@/lib/types/database").GenreBusinessHours,
      updated_at: new Date().toISOString(),
    })
    .eq("service_name", "google_calendar")

  if (error) {
    console.error("updateBusinessHours error:", error.message)
    return {
      success: false,
      message: "稼働時間枠の保存に失敗しました。もう一度お試しください。",
    }
  }

  revalidatePath("/settings")
  return {
    success: true,
    message: "稼働時間枠を保存しました。",
  }
}
