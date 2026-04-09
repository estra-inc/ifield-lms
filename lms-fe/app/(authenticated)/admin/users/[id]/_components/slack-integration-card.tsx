"use client"

import { useActionState, useTransition, useRef, useEffect } from "react"
import { Loader2, Info, Unlink } from "lucide-react"
import { toast } from "sonner"

import { updateSlackUserId, clearSlackUserId } from "../../actions"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface SlackIntegrationCardProps {
  userId: string
  currentSlackUserId: string | null
}

export function SlackIntegrationCard({
  userId,
  currentSlackUserId,
}: SlackIntegrationCardProps) {
  const [state, formAction, isPending] = useActionState(
    updateSlackUserId,
    null
  )
  const [isClearPending, startClearTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  // 保存結果のフィードバック
  useEffect(() => {
    if (state?.success) {
      toast.success(state.message)
    } else if (state && !state.success) {
      toast.error(state.message)
    }
  }, [state])

  const handleClear = () => {
    startClearTransition(async () => {
      const result = await clearSlackUserId(userId)
      if (result?.success) {
        toast.success(result.message)
        // 入力欄をクリア
        if (formRef.current) {
          const input = formRef.current.querySelector<HTMLInputElement>(
            'input[name="slackUserId"]'
          )
          if (input) input.value = ""
        }
      } else if (result) {
        toast.error(result.message)
      }
    })
  }

  const isLoading = isPending || isClearPending

  return (
    <>
      <Separator />
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-muted-foreground">
            Slack 連携
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Slack 連携についての説明"
                className="text-muted-foreground hover:text-foreground"
              >
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px]">
              Slack のプロフィール →「その他」→「メンバー ID
              をコピー」で取得できる U または W
              から始まる文字列を貼り付けてください。
              <br />
              コーチング予約・キャンセル時の Slack
              通知でこのコーチがメンションされます。
            </TooltipContent>
          </Tooltip>
          {isLoading && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        <form ref={formRef} action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="userId" value={userId} />
          <Label htmlFor={`slack-id-${userId}`} className="sr-only">
            Slack User ID
          </Label>
          <div className="flex gap-2">
            <Input
              id={`slack-id-${userId}`}
              name="slackUserId"
              defaultValue={currentSlackUserId ?? ""}
              placeholder="U01ABC..."
              className="h-9 flex-1 text-[13px]"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="sm"
              className="h-9"
              disabled={isLoading}
            >
              保存
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            {currentSlackUserId ? (
              <span className="flex items-center gap-1.5">
                <Badge
                  variant="secondary"
                  className="text-[10px] font-normal"
                >
                  登録済み
                </Badge>
                <span className="font-mono">{currentSlackUserId}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] font-normal">
                  未登録
                </Badge>
                <span>通知時は @here でフォールバック</span>
              </span>
            )}
          </div>

          {currentSlackUserId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-muted-foreground hover:text-destructive"
                  disabled={isLoading}
                >
                  <Unlink className="mr-1 size-3" />
                  解除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Slack 連携を解除しますか？
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    解除すると、このコーチへの個別メンションが行われなくなり、通知は
                    @here でフォールバックされます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClear}>
                    解除する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </>
  )
}
