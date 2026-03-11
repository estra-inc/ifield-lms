"use client"

import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createDailyReport } from "@/app/(authenticated)/reports/actions"
import { dailyReportSchema } from "@/lib/validations/daily-reports"
import type { ActionResult } from "@/lib/validations/auth"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"

/**
 * 日報入力フォーム (Client Component)
 *
 * - 3 fields: report_date, actual_hours, content
 * - useActionState で createDailyReport Server Action と連携
 * - クライアントサイド Zod バリデーション
 * - 送信成功時: toast + /reports/list へ遷移
 * - 送信失敗時: エラーメッセージ表示 + 再送信可能
 */
export function DailyReportForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction] = useActionState<ActionResult, FormData>(
    async (prevState: ActionResult, formData: FormData) => {
      // クライアントサイドバリデーション
      const rawData = {
        report_date: formData.get("report_date") as string,
        actual_hours: Number(formData.get("actual_hours")),
        content: formData.get("content") as string,
      }

      const validated = dailyReportSchema.safeParse(rawData)
      if (!validated.success) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of validated.error.issues) {
          const field = issue.path[0] as string
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message
          }
        }
        return {
          success: false,
          message: Object.values(fieldErrors).join(", "),
          fieldErrors,
        } as ActionResult
      }

      // Server Action 実行
      return createDailyReport(prevState, formData)
    },
    null
  )

  // 送信成功時の処理
  useEffect(() => {
    if (state?.success) {
      toast.success(state.message)
      router.push("/reports/list")
    }
  }, [state, router])

  // フィールドエラーの抽出
  const fieldErrors = (state as ActionResult & { fieldErrors?: Record<string, string> })?.fieldErrors

  // 今日の日付をデフォルト値として取得
  const today = new Date().toISOString().split("T")[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          新しい日報を作成
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-5">
          {/* 対象日付 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="report_date">対象日付</Label>
            <Input
              id="report_date"
              name="report_date"
              type="date"
              defaultValue={today}
              required
            />
            {fieldErrors?.report_date && (
              <p className="text-sm text-destructive">{fieldErrors.report_date}</p>
            )}
          </div>

          {/* 学習時間 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="actual_hours">学習時間</Label>
            <div className="flex items-center gap-2">
              <Input
                id="actual_hours"
                name="actual_hours"
                type="number"
                step="0.5"
                min="0.5"
                placeholder="0.0"
                required
                className="w-32"
              />
              <span className="text-sm text-muted-foreground font-medium">h</span>
            </div>
            {fieldErrors?.actual_hours && (
              <p className="text-sm text-destructive">{fieldErrors.actual_hours}</p>
            )}
          </div>

          {/* 学習内容 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="content">学習内容</Label>
            <Textarea
              id="content"
              name="content"
              placeholder="今日学んだことを記録しましょう..."
              rows={4}
              required
            />
            {fieldErrors?.content && (
              <p className="text-sm text-destructive">{fieldErrors.content}</p>
            )}
          </div>

          {/* サーバーエラー */}
          {state && !state.success && !fieldErrors && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          {/* 送信ボタン */}
          <SubmitButton pendingText="保存中..." className="self-end">
            日報を保存
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}
