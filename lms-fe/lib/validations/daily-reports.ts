import { z } from "zod"

/**
 * 日報入力フォーム用バリデーションスキーマ
 *
 * - report_date: ISO 8601 日付文字列、未来日不可
 * - actual_hours: 正の数値、0.5 時間刻み
 * - content: 1 文字以上の非空文字列
 *
 * クライアントサイド（リアルタイムバリデーション）と
 * サーバーサイド（Server Action 内）の双方で使用する。
 */
export const dailyReportSchema = z.object({
  report_date: z
    .string()
    .min(1, { message: "対象日付を入力してください" })
    .refine(
      (val) => {
        const date = new Date(val)
        const today = new Date()
        today.setHours(23, 59, 59, 999)
        return date <= today
      },
      { message: "未来の日付は指定できません" }
    ),
  actual_hours: z
    .number({ message: "学習時間を入力してください" })
    .positive({ message: "学習時間は0より大きい値を入力してください" })
    .refine((v) => v % 0.5 === 0, {
      message: "学習時間は0.5時間刻みで入力してください",
    }),
  content: z
    .string()
    .min(1, { message: "学習内容を入力してください" }),
})

/** dailyReportSchema から推論される型 */
export type DailyReportFormValues = z.infer<typeof dailyReportSchema>
