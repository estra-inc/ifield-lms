import { Search } from "lucide-react"
import type { UserRole } from "@/lib/types/app-shell"

interface SearchBarPlaceholderProps {
  userRole: UserRole
}

/**
 * セマンティック検索バープレースホルダー
 *
 * User ロールのみ表示。検索機能は未実装（disabled 状態）。
 * ヘッダー中央に配置される。
 */
export function SearchBarPlaceholder({ userRole }: SearchBarPlaceholderProps) {
  // User ロールのみ表示
  if (userRole !== "user") {
    return null
  }

  return (
    <div className="flex w-[600px] items-center gap-2 rounded-lg bg-muted px-3 h-9">
      <Search className="size-4 text-muted-foreground" />
      <input
        type="text"
        disabled
        placeholder="教材をセマンティック検索..."
        className="flex-1 bg-transparent font-mono text-[13px] text-muted-foreground placeholder:text-muted-foreground outline-none cursor-not-allowed"
      />
    </div>
  )
}
