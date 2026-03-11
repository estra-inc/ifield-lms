"use client"

import { useActionState, useEffect, useRef } from "react"
import { toast } from "sonner"

import { updateDailyReport } from "@/app/(authenticated)/reports/actions"
import { dailyReportSchema } from "@/lib/validations/daily-reports"
import type { ActionResult } from "@/lib/validations/auth"
import type { DailyReportEntry } from "@/lib/types/daily-reports"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/ui/submit-button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface EditReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: DailyReportEntry
}

export function EditReportDialog({
  open,
  onOpenChange,
  entry,
}: EditReportDialogProps) {
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction] = useActionState<ActionResult, FormData>(
    async (prevState: ActionResult, formData: FormData) => {
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

      return updateDailyReport(prevState, formData)
    },
    null
  )

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message)
      onOpenChange(false)
    }
  }, [state, onOpenChange])

  const fieldErrors = (state as ActionResult & { fieldErrors?: Record<string, string> })?.fieldErrors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>日報を編集</DialogTitle>
          <DialogDescription>
            日報の内容を編集できます。
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="reportId" value={entry.id} />

          {/* 対象日付 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit_report_date_${entry.id}`}>対象日付</Label>
            <Input
              id={`edit_report_date_${entry.id}`}
              name="report_date"
              type="date"
              defaultValue={entry.reportDate}
              required
            />
            {fieldErrors?.report_date && (
              <p className="text-sm text-destructive">{fieldErrors.report_date}</p>
            )}
          </div>

          {/* 学習時間 */}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`edit_actual_hours_${entry.id}`}>学習時間</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`edit_actual_hours_${entry.id}`}
                name="actual_hours"
                type="number"
                step="0.5"
                min="0.5"
                defaultValue={entry.actualHours}
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
            <Label htmlFor={`edit_content_${entry.id}`}>学習内容</Label>
            <Textarea
              id={`edit_content_${entry.id}`}
              name="content"
              defaultValue={entry.content}
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <SubmitButton pendingText="更新中...">
              更新する
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
