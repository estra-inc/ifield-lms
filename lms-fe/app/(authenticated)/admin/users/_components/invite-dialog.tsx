"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"

import { inviteUser } from "@/app/(authenticated)/admin/users/actions"
import {
  inviteUserSchema,
  type InviteUserFormValues,
} from "@/lib/validations/user-management"
import type { ActionResult } from "@/lib/validations/auth"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { SubmitButton } from "@/components/ui/submit-button"

const INVITE_ROLE_OPTIONS = [
  { value: "user", label: "受講生 (User)" },
  { value: "manager", label: "マネージャー (Manager)" },
] as const

export function InviteDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<ActionResult, FormData>(
    inviteUser,
    null
  )

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      role: "user",
    },
  })

  const prevStateRef = useRef<ActionResult>(null)

  // アクション結果のハンドリング
  useEffect(() => {
    if (state && state !== prevStateRef.current) {
      if (state.success) {
        toast.success(state.message)
        setOpen(false)
        form.reset()
      }
      prevStateRef.current = state
    }
  }, [state, form])

  // ダイアログを閉じた時にフォームをリセット
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      form.reset()
      prevStateRef.current = null
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          ユーザーを招待
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>ユーザーを招待</DialogTitle>
          <DialogDescription>
            メールアドレスとロールを指定して招待メールを送信します
          </DialogDescription>
        </DialogHeader>

        {/* サーバーエラー表示 */}
        {state && !state.success && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {state.message}
          </div>
        )}

        <Form {...form}>
          <form action={formAction} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ロール</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    name="role"
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="ロールを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INVITE_ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                キャンセル
              </Button>
              <SubmitButton pendingText="送信中...">
                <SendIcon />
                招待メールを送信
              </SubmitButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
