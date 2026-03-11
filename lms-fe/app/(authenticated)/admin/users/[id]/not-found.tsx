import Link from "next/link"
import { UserX } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function UserNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <UserX className="size-16 text-muted-foreground opacity-40" />
      <div className="text-center">
        <h2 className="text-xl font-semibold">
          ユーザーが見つかりません
        </h2>
        <p className="text-muted-foreground text-sm mt-2">
          指定されたユーザーは存在しないか、既に削除されています。
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/admin/users">ユーザー一覧に戻る</Link>
      </Button>
    </div>
  )
}
