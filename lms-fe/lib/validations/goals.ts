import { z } from "zod"

/**
 * 月次目標バリデーションスキーマ
 *
 * - year_month: "YYYY-MM" 形式の文字列
 * - target_hours: 0 より大きい正の数値
 */
export const monthlyGoalSchema = z.object({
  year_month: z
    .string()
    .min(1, { message: "対象月を入力してください" })
    .regex(/^\d{4}-\d{2}$/, {
      message: "対象月はYYYY-MM形式で入力してください",
    }),
  target_hours: z
    .number({ message: "目標時間を入力してください" })
    .positive({ message: "目標時間は0より大きい値を入力してください" }),
})

/**
 * 週次目標バリデーションスキーマ
 *
 * - start_date: ISO 8601 日付文字列（UIの週セレクターにより月曜日が保証される）
 * - end_date: ISO 8601 日付文字列（UIの週セレクターにより日曜日が保証される）
 * - target_hours: 0 より大きい正の数値
 */
export const weeklyGoalSchema = z.object({
  start_date: z
    .string()
    .min(1, { message: "開始日を入力してください" }),
  end_date: z
    .string()
    .min(1, { message: "終了日を入力してください" }),
  target_hours: z
    .number({ message: "目標時間を入力してください" })
    .positive({ message: "目標時間は0より大きい値を入力してください" }),
})

/** 各スキーマから推論される型 */
export type MonthlyGoalFormValues = z.infer<typeof monthlyGoalSchema>
export type WeeklyGoalFormValues = z.infer<typeof weeklyGoalSchema>
