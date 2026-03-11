import { createDecipheriv } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * AES-256-GCM で暗号化されたトークンを復号する。
 * 形式: "iv:authTag:ciphertext" (hex エンコード)
 */
function decryptToken(encrypted: string, keyHex: string): string {
  const [ivHex, authTagHex, ciphertext] = encrypted.split(":")
  const key = Buffer.from(keyHex, "hex")
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")

  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

/**
 * リフレッシュトークンからアクセストークンを取得する。
 */
async function getAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured")
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`)
  }

  const data = await res.json()
  return data.access_token
}

/** Google Calendar の予定情報 */
export interface CalendarBusySlot {
  start: string // ISO 8601
  end: string   // ISO 8601
}

/**
 * Google Calendar FreeBusy API を呼び出して、指定期間の予定ありスロットを取得する。
 *
 * @param timeMin 開始日時 (ISO 8601)
 * @param timeMax 終了日時 (ISO 8601)
 * @returns 予定ありスロットの配列。連携未設定の場合は null。
 */
export async function getGoogleCalendarBusySlots(
  timeMin: string,
  timeMax: string
): Promise<CalendarBusySlot[] | null> {
  const encryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY is not set")
  }

  // DB から暗号化トークンを取得
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("system_integrations")
    .select("encrypted_refresh_token")
    .eq("service_name", "google_calendar")
    .single()

  if (error) {
    throw new Error(`DB query error: ${error.message}`)
  }

  if (!data?.encrypted_refresh_token) {
    throw new Error("No encrypted_refresh_token found")
  }

  // トークン復号 → アクセストークン取得
  const refreshToken = decryptToken(data.encrypted_refresh_token, encryptionKey)
  const accessToken = await getAccessToken(refreshToken)

  // FreeBusy API 呼び出し
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: "primary" }],
      }),
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`FreeBusy API error ${res.status}: ${body}`)
  }

  const result = await res.json()
  const busySlots: CalendarBusySlot[] =
    result.calendars?.primary?.busy ?? []

  return busySlots
}

/** Google Calendar イベント作成パラメータ */
export interface CreateCalendarEventParams {
  summary: string
  description?: string
  startDateTime: string // ISO 8601
  endDateTime: string   // ISO 8601
  timeZone?: string
}

/** カレンダーイベント作成の結果 */
export type CreateCalendarEventResult =
  | { ok: true; eventId: string; meetUrl: string | null }
  | { ok: false; reason: string }

/**
 * Google Calendar にイベントを作成する。
 *
 * エラー時は reason 付きの失敗結果を返す（例外は投げない）。
 */
export async function createCalendarEvent(
  params: CreateCalendarEventParams
): Promise<CreateCalendarEventResult> {
  const encryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  if (!encryptionKey) {
    const reason = "GOOGLE_TOKEN_ENCRYPTION_KEY が設定されていません"
    console.error(`createCalendarEvent: ${reason}`)
    return { ok: false, reason }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("system_integrations")
    .select("encrypted_refresh_token")
    .eq("service_name", "google_calendar")
    .single()

  if (error || !data?.encrypted_refresh_token) {
    const reason = "Google Calendar が連携されていません。設定画面から連携してください"
    console.error(`createCalendarEvent: ${reason}`, error?.message)
    return { ok: false, reason }
  }

  let accessToken: string
  try {
    const refreshToken = decryptToken(data.encrypted_refresh_token, encryptionKey)
    accessToken = await getAccessToken(refreshToken)
  } catch (e) {
    const reason = `Google 認証トークンの更新に失敗しました: ${e instanceof Error ? e.message : String(e)}`
    console.error(`createCalendarEvent: ${reason}`)
    return { ok: false, reason }
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: params.summary,
        description: params.description ?? "",
        start: {
          dateTime: params.startDateTime,
          timeZone: params.timeZone ?? "Asia/Tokyo",
        },
        end: {
          dateTime: params.endDateTime,
          timeZone: params.timeZone ?? "Asia/Tokyo",
        },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    }
  )

  if (!res.ok) {
    const body = await res.text()
    const reason = `Google Calendar API エラー (${res.status}): ${body}`
    console.error(`createCalendarEvent: ${reason}`)
    return { ok: false, reason }
  }

  const result = await res.json()
  const eventId = result.id
  if (!eventId) {
    return { ok: false, reason: "Google Calendar API からイベントIDが返されませんでした" }
  }

  // Google Meet URL を抽出
  const meetUrl: string | null =
    result.conferenceData?.entryPoints?.find(
      (ep: { entryPointType: string; uri: string }) => ep.entryPointType === "video"
    )?.uri ?? result.hangoutLink ?? null

  return { ok: true, eventId, meetUrl }
}

/**
 * Google Calendar のイベントを削除する。
 *
 * @returns 削除成功時は true、失敗時は false。
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const encryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  if (!encryptionKey) {
    console.error("deleteCalendarEvent: GOOGLE_TOKEN_ENCRYPTION_KEY is not set")
    return false
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("system_integrations")
    .select("encrypted_refresh_token")
    .eq("service_name", "google_calendar")
    .single()

  if (error || !data?.encrypted_refresh_token) {
    console.error("deleteCalendarEvent: No token found")
    return false
  }

  const refreshToken = decryptToken(data.encrypted_refresh_token, encryptionKey)
  const accessToken = await getAccessToken(refreshToken)

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!res.ok && res.status !== 410) {
    const body = await res.text()
    console.error(`deleteCalendarEvent: API error ${res.status}: ${body}`)
    return false
  }

  return true
}
