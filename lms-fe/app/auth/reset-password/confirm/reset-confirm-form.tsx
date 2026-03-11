"use client"

import { useActionState, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { confirmPasswordReset } from "@/app/auth/actions/auth"
import {
  resetPasswordConfirmSchema,
  type ResetPasswordConfirmFormValues,
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
 * パスワードリセット確認フォーム (Client Component)
 *
 * - Supabase がハッシュフラグメントで返すトークンからセッションを確立
 * - react-hook-form + zodResolver(resetPasswordConfirmSchema) によるクライアントサイドバリデーション
 * - useActionState で confirmPasswordReset Server Action を連携
 * - エラー時にメッセージ表示 + 再リクエスト案内
 * - SubmitButton でローディング状態 + 二重送信防止
 */
export function ResetConfirmForm() {
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // ハッシュフラグメントからセッションを確立する。
    // Supabase のブラウザクライアントは onAuthStateChange で
    // URL ハッシュフラグメント内のトークンを自動検出してセッションを設定する。
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setSessionReady(true)
        }
      }
    )

    // すでにセッションがある場合（コールバック経由でリダイレクトされた場合）
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setSessionReady(true)
      }
    })

    // ハッシュフラグメントがなく、セッションもない場合のタイムアウト
    const timeout = setTimeout(() => {
      setSessionReady((ready) => {
        if (!ready) setSessionError(true)
        return ready
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const [state, formAction] = useActionState<ActionResult, FormData>(
    confirmPasswordReset,
    null
  )

  const form = useForm<ResetPasswordConfirmFormValues>({
    resolver: zodResolver(resetPasswordConfirmSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  // セッション確立中のローディング表示
  if (!sessionReady && !sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-[420px] border p-10 shadow-none gap-8">
          <CardContent className="flex flex-col items-center gap-4 p-0">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              認証情報を確認しています...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // セッション確立に失敗した場合
  if (sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-[420px] border p-10 shadow-none gap-8">
          <CardContent className="flex flex-col items-center gap-4 p-0">
            <Image
              src="/ifield-logo_max_blacktext.png"
              alt="i.field"
              width={160}
              height={38}
            />
            <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
              リセットリンクが無効または期限切れです
            </div>
            <p className="text-center text-[13px] text-muted-foreground">
              <Link
                href="/auth/reset-password"
                className="text-primary hover:underline"
              >
                パスワードリセットを再度リクエスト
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

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
              <h1 className="text-xl font-semibold">新しいパスワードを設定</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                新しいパスワードを入力してください
              </p>
            </div>
          </div>

          {/* Server Error Message */}
          {state && !state.success && (
            <div className="flex flex-col gap-3">
              <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
                {state.message}
              </div>
              <p className="text-center text-[13px] text-muted-foreground">
                <Link
                  href="/auth/reset-password"
                  className="text-primary hover:underline"
                >
                  パスワードリセットを再度リクエスト
                </Link>
              </p>
            </div>
          )}

          {/* Reset Confirm Form */}
          <Form {...form}>
            <form action={formAction} className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-medium">
                      新しいパスワード
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="8文字以上"
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-medium">
                      新しいパスワード（確認）
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="パスワードを再入力"
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
                pendingText="更新中..."
              >
                パスワードを更新
              </SubmitButton>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
