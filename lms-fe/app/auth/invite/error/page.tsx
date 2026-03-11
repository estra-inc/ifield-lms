import Image from "next/image"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/**
 * 招待エラーページ (Server Component)
 *
 * 無効/期限切れの招待リンクにアクセスした場合に表示される。
 * Auth Callback Route Handler がトークン検証失敗時にリダイレクトする先。
 *
 * - AlertCircle アイコンを赤い円形背景に表示
 * - エラーメッセージと管理者への再招待依頼案内を表示
 * - ログインページへの Outline スタイルのボタン
 */
export default function InviteErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-[420px] border p-10 shadow-none gap-8">
        <CardContent className="flex flex-col items-center gap-8 p-0">
          {/* Logo */}
          <Image
            src="/ifield-logo_max_blacktext.png"
            alt="i.field"
            width={160}
            height={38}
          />

          {/* Error Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEE2E2]">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>

          {/* Error Message */}
          <div className="text-center">
            <h1 className="text-xl font-semibold">
              招待リンクが無効または期限切れです
            </h1>
            <p className="mt-2 text-[13px] text-muted-foreground">
              招待リンクが無効であるか、有効期限が切れています。管理者に連絡して、新しい招待リンクの発行を依頼してください。
            </p>
          </div>

          {/* Action Button */}
          <Button variant="outline" className="w-full" asChild>
            <Link href="/auth/login">
              ログインページに戻る
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
