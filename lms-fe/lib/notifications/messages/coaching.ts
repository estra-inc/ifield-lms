/**
 * コーチング予約・キャンセルの Slack 通知メッセージビルダー
 *
 * notifyCoachingBooked / notifyCoachingCancelled は Server Action から
 * 呼ばれるエントリポイント。内部で resolveCoachMention を呼んで
 * メンション文字列を取得し、Block Kit メッセージを構築して notifySlack に渡す。
 *
 * buildBookingBlocks / buildCancellationBlocks はピュア関数として分離し
 * 単体テスト（スナップショット）を容易にしている。
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"
import { notifySlack, type SlackBlock } from "../slack"
import { resolveCoachMention } from "../mentions"

const ADMIN_COACHING_URL = "https://ifield-lms.vercel.app/admin/coaching"

const GENRE_LABELS = {
  engineering: "エンジニアリング",
  design: "デザイン",
} as const

export type CoachingGenre = keyof typeof GENRE_LABELS

export type CoachingNotificationInput = {
  studentName: string
  coachId: string | null
  coachName: string | null
  genre: CoachingGenre
  /** YYYY-MM-DD */
  sessionDate: string
  /** HH:MM */
  startTime: string
  /** HH:MM */
  endTime: string
}

/**
 * "2026-04-15" + "14:00" + "15:00" → "2026/04/15 (水) 14:00〜15:00"
 *
 * 曜日は JST 基準で算出する（Vercel/UTC 環境でも一貫した結果を返すため）。
 */
export function formatCoachingDateTime(
  sessionDate: string,
  startTime: string,
  endTime: string
): string {
  // YYYY-MM-DD を JST の 0:00 として解釈する
  const [year, month, day] = sessionDate.split("-").map(Number)
  // タイムゾーンの揺らぎを避けるため UTC で生成し、後段で曜日のみ取り出す
  const date = new Date(Date.UTC(year, month - 1, day))
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    weekday: "short",
    timeZone: "UTC",
  }).format(date)
  const formattedDate = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`
  return `${formattedDate} (${weekday}) ${startTime}〜${endTime}`
}

/**
 * 新規コーチング予約通知の Block Kit 配列を構築する（ピュア関数）。
 */
export function buildBookingBlocks(
  input: CoachingNotificationInput,
  mention: string
): SlackBlock[] {
  const dateTimeText = formatCoachingDateTime(
    input.sessionDate,
    input.startTime,
    input.endTime
  )
  const genreLabel = GENRE_LABELS[input.genre]
  const coachName = input.coachName ?? "未割当"

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📅 新規コーチング予約",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${mention} 新しいコーチング予約が入りました。\n\n*日時:* ${dateTimeText}\n*受講生:* ${input.studentName}\n*担当コーチ:* ${coachName}\n*ジャンル:* ${genreLabel}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "管理画面で開く",
            emoji: false,
          },
          url: ADMIN_COACHING_URL,
        },
      ],
    },
  ]
}

/**
 * コーチング受講生キャンセル通知の Block Kit 配列を構築する（ピュア関数）。
 */
export function buildCancellationBlocks(
  input: CoachingNotificationInput,
  mention: string
): SlackBlock[] {
  const dateTimeText = formatCoachingDateTime(
    input.sessionDate,
    input.startTime,
    input.endTime
  )
  const genreLabel = GENRE_LABELS[input.genre]
  const coachName = input.coachName ?? "未割当"

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "❌ コーチング予約キャンセル",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${mention} 受講生がコーチング予約をキャンセルしました。\n\n*元の日時:* ${dateTimeText}\n*受講生:* ${input.studentName}\n*担当コーチ:* ${coachName}\n*ジャンル:* ${genreLabel}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "管理画面で開く",
            emoji: false,
          },
          url: ADMIN_COACHING_URL,
        },
      ],
    },
  ]
}

/**
 * 新規コーチング予約の Slack 通知を送信する。
 *
 * Server Action（bookSession）の成功末尾で呼ばれる。
 * 内部で resolveCoachMention を呼び、メンション付きで Slack へ POST する。
 * すべての例外は内部で吸収される（fail-safe）。
 */
export async function notifyCoachingBooked(
  client: SupabaseClient<Database>,
  input: CoachingNotificationInput
): Promise<void> {
  const mention = await resolveCoachMention(client, input.coachId)
  const blocks = buildBookingBlocks(input, mention)
  const summary = `📅 新規コーチング予約: ${input.studentName} ${formatCoachingDateTime(
    input.sessionDate,
    input.startTime,
    input.endTime
  )}`
  await notifySlack({ text: summary, blocks })
}

/**
 * 受講生によるコーチング予約キャンセルの Slack 通知を送信する。
 *
 * Server Action（cancelSession）の成功末尾で呼ばれる。
 */
export async function notifyCoachingCancelled(
  client: SupabaseClient<Database>,
  input: CoachingNotificationInput
): Promise<void> {
  const mention = await resolveCoachMention(client, input.coachId)
  const blocks = buildCancellationBlocks(input, mention)
  const summary = `❌ コーチング予約キャンセル: ${input.studentName} ${formatCoachingDateTime(
    input.sessionDate,
    input.startTime,
    input.endTime
  )}`
  await notifySlack({ text: summary, blocks })
}
