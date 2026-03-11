/**
 * ProfileInfoCard
 *
 * 受講生ダッシュボード用の基本情報カード。
 * GoalMetricCard と同サイズ・同スタイルで情報をコンパクトに表示する。
 * Server Component。
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ProfileInfoCardProps {
  avatarUrl: string | null
  fullName: string | null
  email: string
  role: string
  currentTerm: string | null
  createdAt: string
  coachName: string | null
}

const TERM_LABELS: Record<string, string> = {
  基礎: "基礎",
  実践: "実践",
}

const ROLE_LABELS: Record<string, string> = {
  user: "受講生",
}

function getElapsedDays(createdAt: string): number {
  const start = new Date(createdAt)
  const now = new Date()
  return Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  )
}

export function ProfileInfoCard({
  avatarUrl,
  fullName,
  email,
  role,
  currentTerm,
  createdAt,
  coachName,
}: ProfileInfoCardProps) {
  const initials = (fullName ?? email)
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase()

  const elapsedDays = getElapsedDays(createdAt)
  const startDate = new Date(createdAt)
  const startDateStr = `${startDate.getFullYear()}/${String(startDate.getMonth() + 1).padStart(2, "0")}/${String(startDate.getDate()).padStart(2, "0")}`
  const termLabel = TERM_LABELS[currentTerm ?? ""] ?? currentTerm ?? "—"
  const roleLabel = ROLE_LABELS[role] ?? role

  return (
    <Card className="gap-2 rounded-none border-border py-4 shadow-none">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="font-[family-name:var(--font-primary)] text-xs font-semibold tracking-wide text-muted-foreground">
          基本情報
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 px-4">
        {/* アバター + 名前 */}
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8 shrink-0">
            <AvatarImage src={avatarUrl ?? undefined} alt={fullName ?? ""} />
            <AvatarFallback className="text-[10px] font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight">
              {fullName ?? "—"}
            </p>
            <p className="truncate font-mono text-[10px] leading-tight text-muted-foreground">
              {email}
            </p>
          </div>
        </div>

        {/* 情報グリッド（2列） */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
          <span className="text-muted-foreground">ロール</span>
          <span className="text-right font-medium">{roleLabel}</span>

          <span className="text-muted-foreground">受講状態</span>
          <span className="text-right font-medium">{currentTerm ? "受講中" : "未開始"}</span>

          <span className="text-muted-foreground">ターム</span>
          <span className="text-right font-medium">{termLabel}</span>

          <span className="text-muted-foreground">開始日</span>
          <span className="text-right font-mono font-medium">{startDateStr}</span>

          <span className="text-muted-foreground">経過</span>
          <span className="text-right font-mono font-medium">{elapsedDays}日</span>

          <span className="text-muted-foreground">コーチ</span>
          <span className="text-right font-medium">{coachName ?? "未割り当て"}</span>
        </div>
      </CardContent>
    </Card>
  )
}
