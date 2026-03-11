import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * UUID v4 形式のバリデーション用正規表現。
 * version_id パラメータのバリデーションに使用する。
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 文字列が有効な UUID 形式であるかを検証する。
 *
 * @param value - 検証する文字列
 * @returns UUID 形式の場合 true
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

/**
 * active バージョンの ID を取得する共通ユーティリティ関数。
 *
 * content_versions テーブルから status='active' のバージョン ID を取得する。
 * active バージョンが存在しない場合やクエリエラー時は null を返す。
 *
 * 主に管理画面やプレビュー機能で使用する。
 * 受講生向けページでは version_id ベースフィルタに使用する。
 *
 * @param supabase - Supabase クライアントインスタンス
 * @returns active バージョンの UUID 文字列、または null
 */
export async function getActiveVersionId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase
    .from("content_versions")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data.id
}

/**
 * searchParams の version_id パラメータを解決し、使用するバージョン ID を返す。
 *
 * 以下のロジックで version_id を決定する:
 * 1. searchParams に version_id が存在しない、または空の場合 -> active バージョン ID を返す
 * 2. version_id が有効な UUID 形式でない場合 -> active バージョン ID を返す
 * 3. version_id が有効な UUID で、現在のユーザーが Super Admin の場合 -> 指定された version_id を返す
 * 4. version_id が有効な UUID だが Super Admin でない場合 -> active バージョン ID を返す（サイレント無視）
 *
 * @param supabase - Supabase クライアントインスタンス
 * @param searchParams - URL searchParams オブジェクト（version_id?: string）
 * @returns 解決されたバージョン ID、または null（active バージョンが存在しない場合）
 */
export async function resolveVersionId(
  supabase: SupabaseClient,
  searchParams: { version_id?: string }
): Promise<string | null> {
  const versionIdParam = searchParams.version_id

  // version_id パラメータが未指定または空の場合は active バージョンにフォールバック
  if (!versionIdParam) {
    return getActiveVersionId(supabase)
  }

  // UUID 形式のバリデーション
  if (!isValidUUID(versionIdParam)) {
    return getActiveVersionId(supabase)
  }

  // 認証ユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return getActiveVersionId(supabase)
  }

  // Super Admin 判定: profiles テーブルから role を取得
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile || profile.role !== "super_admin") {
    return getActiveVersionId(supabase)
  }

  // Super Admin が有効な UUID を指定した場合、その version_id を使用
  return versionIdParam
}
