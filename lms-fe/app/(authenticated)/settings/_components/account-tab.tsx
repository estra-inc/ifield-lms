"use client"

import { useTransition, useActionState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { changePassword } from "@/app/(authenticated)/settings/actions"
import {
  passwordChangeSchema,
  type PasswordChangeFormValues,
} from "@/lib/validations/settings"
import type { ActionResult } from "@/lib/validations/auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"

/**
 * アカウントタブ -- パスワード変更フォーム (Client Component)
 *
 * - React Hook Form + Zod (passwordChangeSchema) によるクライアントサイドバリデーション
 * - useTransition で changePassword Server Action を呼び出し、送信中はボタンを disabled 化
 * - 成功時にフォームをリセットして成功トーストを表示
 * - エラー時はエラートーストを表示
 * - パスワード不一致時・最低文字数未満時のバリデーションエラーをフィールドレベルで表示
 */
export function AccountTab() {
  const [isPending, startTransition] = useTransition()
  const [state, formAction] = useActionState<ActionResult, FormData>(
    changePassword,
    null
  )

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  })

  const handleSubmit = (data: PasswordChangeFormValues) => {
    const formData = new FormData()
    formData.append("newPassword", data.newPassword)
    formData.append("confirmPassword", data.confirmPassword)

    startTransition(() => {
      formAction(formData)
    })
  }

  // state が変わったら toast を表示し、成功時はフォームをリセット
  const prevStateRef = useRef(state)
  useEffect(() => {
    if (state === prevStateRef.current) return
    prevStateRef.current = state

    if (state?.success) {
      toast.success(state.message)
      form.reset()
    } else if (state && !state.success) {
      toast.error(state.message)
    }
  }, [state, form])

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">
          パスワード変更
        </h2>
        <p className="text-sm text-muted-foreground">
          新しいパスワードを設定します
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-6"
        >
          {/* 新しいパスワード */}
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  新しいパスワード
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="8文字以上で入力"
                    className="h-10"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 確認パスワード */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  パスワード確認
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="もう一度入力"
                    className="h-10"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 変更ボタン */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-fit ml-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                変更中...
              </>
            ) : (
              "パスワードを変更"
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
