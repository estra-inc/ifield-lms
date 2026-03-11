import { z } from "zod"

/**
 * ユーザー招待フォーム用バリデーションスキーマ
 *
 * - email: 必須、メール形式
 * - role: user または manager（super_admin は招待時に選択不可）
 */
export const inviteUserSchema = z.object({
  email: z
    .string()
    .min(1, { message: "メールアドレスを入力してください" })
    .email({ message: "メールアドレスの形式が正しくありません" }),
  role: z.enum(["user", "manager"], {
    error: "ロールを選択してください",
  }),
})

/**
 * ロール変更用バリデーションスキーマ
 *
 * - userId: UUID 形式
 * - role: user / manager / super_admin
 */
export const changeRoleSchema = z.object({
  userId: z
    .string()
    .uuid({ message: "ユーザーIDの形式が正しくありません" }),
  role: z.enum(["user", "manager", "super_admin"], {
    error: "ロールの値が正しくありません",
  }),
})

/**
 * ユーザーID指定操作の共通バリデーションスキーマ
 *
 * 無効化・有効化・物理削除で使用する。
 * - userId: UUID 形式
 */
export const userIdSchema = z.object({
  userId: z
    .string()
    .uuid({ message: "ユーザーIDの形式が正しくありません" }),
})

/**
 * コーチング枠付与用バリデーションスキーマ
 *
 * - userId: UUID 形式
 * - amount: 1〜100 の正の整数
 */
export const grantCreditsSchema = z.object({
  userId: z
    .string()
    .uuid({ message: "ユーザーIDの形式が正しくありません" }),
  amount: z
    .number({ message: "枠数を入力してください" })
    .int({ message: "枠数は整数で入力してください" })
    .refine((v) => v !== 0, { message: "0以外の値を入力してください" })
    .refine((v) => v >= -100 && v <= 100, { message: "一度に操作できる枠数は-100〜100までです" }),
})

/** 各スキーマから推論される型 */
export type InviteUserFormValues = z.infer<typeof inviteUserSchema>
export type ChangeRoleFormValues = z.infer<typeof changeRoleSchema>
export type UserIdFormValues = z.infer<typeof userIdSchema>
export type GrantCreditsFormValues = z.infer<typeof grantCreditsSchema>
