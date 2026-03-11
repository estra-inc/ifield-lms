import { z } from "zod"

/**
 * ログインフォーム用バリデーションスキーマ
 *
 * - email: 必須、メール形式
 * - password: 必須、空チェック
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "メールアドレスを入力してください" })
    .email({ message: "メールアドレスの形式が正しくありません" }),
  password: z
    .string()
    .min(1, { message: "パスワードを入力してください" }),
})

/**
 * 招待登録 Step 1 用バリデーションスキーマ（氏名設定）
 *
 * - lastName: 必須（姓）
 * - firstName: 必須（名）
 */
export const inviteSetupStep1Schema = z.object({
  lastName: z
    .string()
    .min(1, { message: "姓を入力してください" }),
  firstName: z
    .string()
    .min(1, { message: "名を入力してください" }),
})

/**
 * 招待登録 Step 2 用バリデーションスキーマ（パスワード設定）
 *
 * - password: 必須、8文字以上
 * - confirmPassword: 必須、password と一致
 */
export const inviteSetupStep2Schema = z
  .object({
    password: z
      .string()
      .min(1, { message: "パスワードを入力してください" })
      .min(8, { message: "パスワードは8文字以上で入力してください" }),
    confirmPassword: z
      .string()
      .min(1, { message: "確認用パスワードを入力してください" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  })

/**
 * パスワードリセット要求用バリデーションスキーマ
 *
 * - email: 必須、メール形式
 */
export const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: "メールアドレスを入力してください" })
    .email({ message: "メールアドレスの形式が正しくありません" }),
})

/**
 * パスワードリセット確認用バリデーションスキーマ
 *
 * - password: 必須、8文字以上
 * - confirmPassword: 必須、password と一致
 */
export const resetPasswordConfirmSchema = z
  .object({
    password: z
      .string()
      .min(1, { message: "パスワードを入力してください" })
      .min(8, { message: "パスワードは8文字以上で入力してください" }),
    confirmPassword: z
      .string()
      .min(1, { message: "確認用パスワードを入力してください" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  })

/** 各スキーマから推論される型 */
export type LoginFormValues = z.infer<typeof loginSchema>
export type InviteSetupStep1FormValues = z.infer<typeof inviteSetupStep1Schema>
export type InviteSetupStep2FormValues = z.infer<typeof inviteSetupStep2Schema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
export type ResetPasswordConfirmFormValues = z.infer<typeof resetPasswordConfirmSchema>

/**
 * Server Actions の共通戻り値型
 *
 * 初期状態は null。Server Action 実行後に { success, message } を返す。
 * useActionState と連携してフォーム UI にフィードバックを表示する。
 */
export type ActionResult = {
  success: boolean
  message: string
} | null
