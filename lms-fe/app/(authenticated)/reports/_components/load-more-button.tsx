"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LoadMoreButtonProps {
  nextCursor: string
  basePath: string
}

/**
 * 「もっと見る」ボタン (Client Component)
 *
 * cursor-based ページネーション用。
 * クリック時に ?cursor= パラメータ付きで次ページへ遷移する。
 */
export function LoadMoreButton({ nextCursor, basePath }: LoadMoreButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(() => {
      router.push(`${basePath}?cursor=${encodeURIComponent(nextCursor)}`)
    })
  }

  return (
    <div className="flex justify-center py-4">
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" />
            読み込み中...
          </>
        ) : (
          "もっと見る"
        )}
      </Button>
    </div>
  )
}
