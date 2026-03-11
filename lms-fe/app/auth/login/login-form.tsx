"use client"

import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import Link from "next/link"

import { login } from "@/app/auth/actions/auth"
import { loginSchema, type LoginFormValues, type ActionResult } from "@/lib/validations/auth"
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
 * ログインフォーム (Client Component)
 *
 * - react-hook-form + zodResolver(loginSchema) によるクライアントサイドバリデーション
 * - useActionState で login Server Action を連携
 * - URL パラメータ ?message=password-updated でパスワードリセット成功メッセージを表示
 * - SubmitButton でローディング状態 + 二重送信防止
 */
export function LoginForm() {
  const searchParams = useSearchParams()
  const passwordUpdated = searchParams.get("message") === "password-updated"

  const [state, formAction] = useActionState<ActionResult, FormData>(login, null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
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
              <h1 className="text-xl font-semibold">LMS にログイン</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                メールアドレスとパスワードを入力してください
              </p>
            </div>
          </div>

          {/* Password Reset Success Message */}
          {passwordUpdated && (
            <div className="rounded-md bg-green-50 p-3 text-center text-sm text-green-700">
              パスワードが更新されました。新しいパスワードでログインしてください。
            </div>
          )}

          {/* Server Error Message */}
          {state && !state.success && (
            <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
              {state.message}
            </div>
          )}

          {/* Login Form */}
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[13px] font-medium">
                        パスワード
                      </FormLabel>
                      <Link
                        href="/auth/reset-password"
                        className="text-[13px] text-primary hover:underline"
                      >
                        パスワードを忘れた方はこちら
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="パスワードを入力"
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
                pendingText="ログイン中..."
              >
                ログイン
              </SubmitButton>
            </form>
          </Form>

          {/* Footer */}
          <p className="text-center text-[13px] text-muted-foreground">
            アカウントをお持ちでない方は、管理者からの招待メールをご確認ください
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
