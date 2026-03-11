import { z } from "zod"

/**
 * プロフィール編集用バリデーションスキーマ
 *
 * - lastName: 必須（姓）
 * - firstName: 必須（名）
 */
export const profileSchema = z.object({
  lastName: z
    .string()
    .min(1, { message: "姓を入力してください" }),
  firstName: z
    .string()
    .min(1, { message: "名を入力してください" }),
})

/**
 * パスワード変更用バリデーションスキーマ
 *
 * - newPassword: 必須、8文字以上
 * - confirmPassword: 必須、newPassword と一致
 */
export const passwordChangeSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, { message: "新しいパスワードを入力してください" })
      .min(8, { message: "パスワードは8文字以上で入力してください" }),
    confirmPassword: z
      .string()
      .min(1, { message: "確認用パスワードを入力してください" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  })

/**
 * アバター画像のクライアントサイドバリデーション定数
 */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

/**
 * 単一ジャンル分の稼働時間枠スキーマ
 *
 * - slots: 曜日_時刻 をキーとしたブール値マップ
 * - holidayShift: 祝日を平日シフトとして扱うかどうか
 * - bufferMinutes: 予約前後の確保時間（分）、0〜120
 * - slotDurationMinutes: 1枠のスロット時間（分）、15〜120
 */
const singleBusinessHoursSchema = z.object({
  slots: z.record(z.string(), z.boolean()),
  holidayShift: z.boolean(),
  bufferMinutes: z.number().int().min(0).max(120),
  slotDurationMinutes: z.number().int().min(15).max(120),
  bookingLeadDays: z.number().int().min(0).max(30).default(1),
  bookingWindowWeeks: z.number().int().min(1).max(12).default(2),
})

/**
 * 稼働時間枠用バリデーションスキーマ（後方互換）
 * 旧形式（フラット BusinessHours）または新形式（GenreBusinessHours）を受け付ける
 */
export const businessHoursSchema = z.union([
  singleBusinessHoursSchema,
  z.object({
    engineering: singleBusinessHoursSchema,
    design: singleBusinessHoursSchema,
  }),
])

/** 各スキーマから推論される型 */
export type ProfileFormValues = z.infer<typeof profileSchema>
export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>
export type BusinessHoursFormValues = z.infer<typeof businessHoursSchema>
