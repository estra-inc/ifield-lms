"use client"

import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ComponentProps } from "react"

/**
 * ローディング状態付き送信ボタン (SubmitButton)
 *
 * useFormStatus の pending を監視し、送信中は以下の挙動を行う:
 * - ボタンを disabled にして二重送信を防止
 * - スピナー (Loader2) を表示
 * - テキストを pendingText に変更（例: "ログイン" -> "ログイン中..."）
 *
 * shadcn/ui の Button を拡張し、type="submit" をデフォルトとする。
 *
 * @param children - デフォルト表示テキスト（例: "ログイン"）
 * @param pendingText - 送信中に表示するテキスト（例: "ログイン中..."）
 */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: ComponentProps<typeof Button> & {
  pendingText?: string
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
