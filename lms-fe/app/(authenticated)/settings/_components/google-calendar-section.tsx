"use client"

import { useTransition, useActionState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Calendar, Link as LinkIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  initiateGoogleOAuth,
  disconnectGoogle,
} from "@/app/(authenticated)/settings/actions"
import type { ActionResult } from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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

// ---- Props ----

interface GoogleCalendarSectionProps {
  isConnected: boolean
  connectedAt: string | null
}

// ---- エラーメッセージマッピング ----

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_params: "OAuth パラメータが不足しています。もう一度お試しください。",
  invalid_state: "セキュリティ検証に失敗しました。もう一度お試しください。",
  unauthenticated: "認証が切れました。再度ログインしてください。",
  unauthorized: "この操作を行う権限がありません。",
  config_error: "サーバー設定に問題があります。管理者に連絡してください。",
  token_exchange_failed: "Google との認証に失敗しました。もう一度お試しください。",
  no_refresh_token: "Google からリフレッシュトークンを取得できませんでした。",
  db_error: "データベースの更新に失敗しました。もう一度お試しください。",
  unexpected_error: "予期しないエラーが発生しました。もう一度お試しください。",
}

/**
 * Google Calendar 連携セクション (Client Component)
 *
 * - 連携ステータス（連携済み / 未連携）をバッジで表示
 * - 未連携時: 「連携する」ボタン -> initiateGoogleOAuth -> window.location.href リダイレクト
 * - 連携済み時: 「連携解除」ボタン -> AlertDialog 確認 -> disconnectGoogle
 * - OAuth コールバックからのエラーを error クエリパラメータで検出して表示
 */
export function GoogleCalendarSection({
  isConnected,
  connectedAt,
}: GoogleCalendarSectionProps) {
  const searchParams = useSearchParams()
  const [isConnecting, startConnectTransition] = useTransition()
  const [disconnectState, disconnectAction] = useActionState<
    ActionResult,
    FormData
  >(disconnectGoogle, null)
  const [isDisconnecting, startDisconnectTransition] = useTransition()

  // OAuth コールバックからのエラーを検出
  const errorParam = searchParams.get("error")
  const errorShownRef = useRef(false)

  useEffect(() => {
    if (errorParam && !errorShownRef.current) {
      errorShownRef.current = true
      const message =
        OAUTH_ERROR_MESSAGES[errorParam] ??
        "Google Calendar 連携中にエラーが発生しました。"
      toast.error(message)
    }
  }, [errorParam])

  // disconnectGoogle の結果を toast で表示
  const prevDisconnectStateRef = useRef(disconnectState)
  useEffect(() => {
    if (disconnectState === prevDisconnectStateRef.current) return
    prevDisconnectStateRef.current = disconnectState

    if (disconnectState?.success) {
      toast.success(disconnectState.message)
    } else if (disconnectState && !disconnectState.success) {
      toast.error(disconnectState.message)
    }
  }, [disconnectState])

  /**
   * 「連携する」ボタン押下ハンドラ
   * Server Action で OAuth URL を取得し、window.location.href でリダイレクト
   */
  const handleConnect = () => {
    startConnectTransition(async () => {
      const result = await initiateGoogleOAuth()
      if (result.success && result.url) {
        window.location.href = result.url
      } else {
        toast.error(result.message)
      }
    })
  }

  /**
   * 「連携解除」確認ダイアログの実行ハンドラ
   */
  const handleDisconnect = () => {
    startDisconnectTransition(() => {
      disconnectAction(new FormData())
    })
  }

  const isPending = isConnecting || isDisconnecting

  return (
    <div className="rounded-lg border bg-card p-6 flex flex-col gap-5">
      {/* タイトル & 説明 */}
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">Google Calendar 連携</h3>
        <p className="text-xs text-muted-foreground">
          Google Calendarと連携して、コーチング予約のスケジュールを管理します。
        </p>
      </div>

      <Separator />

      {/* ステータス行: アイコン + ラベル + バッジ ... ボタン */}
      <div className="flex items-center">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">連携ステータス</span>
          {isConnected ? (
            <Badge
              variant="outline"
              className="bg-green-100 text-green-700 border-green-200"
            >
              連携済み
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-amber-100 text-amber-700 border-amber-200"
            >
              未連携
            </Badge>
          )}
          {isConnected && connectedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(connectedAt).toLocaleString("ja-JP")} に連携
            </span>
          )}
        </div>

        {/* アクションボタン */}
        {isConnected ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    解除中...
                  </>
                ) : (
                  "連携解除"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Google Calendar 連携を解除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  連携を解除すると、Google Calendar
                  との同期が停止されます。再度連携するには、もう一度
                  OAuth 認証が必要です。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDisconnect}
                >
                  連携解除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            size="sm"
            onClick={handleConnect}
            disabled={isPending}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                準備中...
              </>
            ) : (
              <>
                <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                連携する
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
