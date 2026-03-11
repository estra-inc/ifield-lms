"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { ActionResult } from "@/lib/validations/auth"

/**
 * バージョン承認 Server Action
 *
 * Super Admin 権限を検証した後、RPC approve_content_version を呼び出して
 * draft バージョンを active に昇格させる。
 *
 * Requirements: 8.3, 8.4, 5.1, 5.4
 */
export async function approveVersion(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // --- 認証・Super Admin 権限の検証 ---
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

  // --- versionId のバリデーション ---
  const versionId = formData.get("versionId") as string | null

  if (!versionId || versionId.trim() === "") {
    return {
      success: false,
      message: "バージョン ID が指定されていません。",
    }
  }

  // --- RPC 呼び出し ---
  const adminClient = createAdminClient()

  const { error: rpcError } = await adminClient.rpc(
    "approve_content_version",
    {
      p_version_id: versionId,
      p_approved_by: user.id,
    }
  )

  if (rpcError) {
    console.error("approveVersion RPC error:", rpcError.message)
    return {
      success: false,
      message: `承認処理に失敗しました: ${rpcError.message}`,
    }
  }

  // --- revalidatePath ---
  revalidatePath("/admin/content-versions")
  revalidatePath("/contents")

  return {
    success: true,
    message: "コンテンツが公開されました。",
  }
}
