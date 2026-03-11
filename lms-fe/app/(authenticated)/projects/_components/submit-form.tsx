"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { submitWork } from "@/app/(authenticated)/projects/actions"

/**
 * SubmitForm Client Component
 *
 * GitHub URL 提出フォームを提供する。
 *
 * Task 8.2
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.5, 6.6
 */

const githubUrlSchema = z.object({
  githubUrl: z
    .string()
    .min(1, { message: "GitHub の URL を入力してください" })
    .url({ message: "有効な URL を入力してください" })
    .regex(/^https:\/\/github\.com\//, {
      message: "GitHub の URL を入力してください",
    }),
})

type SubmitFormValues = z.infer<typeof githubUrlSchema>

export interface SubmitFormProps {
  assignmentId: string
  isGrading: boolean
  isArchived: boolean
  onSuccess?: () => void
}

export function SubmitForm({
  assignmentId,
  isGrading,
  isArchived,
  onSuccess,
}: SubmitFormProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<SubmitFormValues>({
    resolver: zodResolver(githubUrlSchema),
    defaultValues: {
      githubUrl: "",
    },
  })

  // archived 案件の場合はフォーム非表示 + メッセージ
  if (isArchived) {
    return (
      <p className="font-mono text-sm text-muted-foreground">
        この案件はアーカイブされたため提出できません
      </p>
    )
  }

  const isDisabled = isGrading || isPending

  const onSubmit = (values: SubmitFormValues) => {
    startTransition(async () => {
      const result = await submitWork(assignmentId, values.githubUrl)

      if (result.success) {
        toast.success(result.message)
        form.reset()
        onSuccess?.()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="githubUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[13px] font-medium">
                GitHub URL
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="https://github.com/username/repository"
                  disabled={isDisabled}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isGrading && (
          <p className="font-mono text-xs text-muted-foreground">
            採点中のため提出できません。採点完了までお待ちください。
          </p>
        )}

        <Button type="submit" disabled={isDisabled} className="gap-2">
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          提出する
        </Button>
      </form>
    </Form>
  )
}
