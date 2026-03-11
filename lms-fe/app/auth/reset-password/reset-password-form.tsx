"use client"

import { useActionState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import Link from "next/link"

import { requestPasswordReset } from "@/app/auth/actions/auth"
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
  type ActionResult,
} from "@/lib/validations/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { SubmitButton } from "@/components/ui/submit-button"

/**
 * パスワードリセット要求フォーム (Client Component)
 *
 * - react-hook-form + zodResolver(resetPasswordSchema) によるクライアントサイドバリデーション
 * - useActionState で requestPasswordReset Server Action を連携
 * - 送信成功時にフォームを非表示にし、確認メッセージを表示
 * - SubmitButton でローディング状態 + 二重送信防止
 */
export function ResetPasswordForm() {
  const [state, formAction] = useActionState<ActionResult, FormData>(
    requestPasswordReset,
    null
  )

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-[420px] border p-10 shadow-none gap-8">
        <CardContent className="flex flex-col gap-8 p-0">
          {/* Logo Area */}
          <div className="flex flex-col items-center gap-3">
            <Image
              src="/ifield-logo_max_blacktext.png"
              alt="i.field"
              width={160}
              height={38}
            />
            <div className="text-center">
              <h1 className="text-xl font-semibold">パスワードリセット</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
              </p>
            </div>
          </div>

          {/* Success Message - hide form and show confirmation */}
          {state?.success ? (
            <div className="flex flex-col gap-6">
              <div className="rounded-md bg-green-50 p-4 text-center text-sm text-green-700">
                パスワードリセットメールを送信しました
              </div>
              <p className="text-center text-[13px] text-muted-foreground">
                メールに記載されたリンクからパスワードを再設定してください。メールが届かない場合は、迷惑メールフォルダをご確認ください。
              </p>
              <Link
                href="/auth/login"
                className="text-center text-[13px] text-primary hover:underline"
              >
                ログインに戻る
              </Link>
            </div>
          ) : (
            <>
              {/* Server Error Message */}
              {state && !state.success && (
                <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
                  {state.message}
                </div>
              )}

              {/* Reset Password Form */}
              <Form {...form}>
                <form action={formAction} className="flex flex-col gap-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] font-medium">
                          メールアドレス
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="name@example.com"
                            className="h-10 px-3 rounded-md"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <SubmitButton
                    className="w-full"
                    pendingText="送信中..."
                  >
                    リセットメールを送信
                  </SubmitButton>
                </form>
              </Form>

              {/* Login Link */}
              <div className="text-center">
                <Link
                  href="/auth/login"
                  className="text-[13px] text-primary hover:underline"
                >
                  ログインに戻る
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
