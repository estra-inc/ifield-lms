import { differenceInDays, format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { UserDetail } from "@/lib/types/user-management"
import type { UserRole } from "@/lib/types/app-shell"
import {
  CoachAssignmentSection,
  type CoachAssignmentItem,
  type CoachOption,
} from "./coach-assignment-section"

const ROLE_LABELS: Record<UserRole, string> = {
  user: "User",
  manager: "Manager",
  super_admin: "Super Admin",
}

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  user: "border-[#DBEAFE] text-[#1D4ED8]",
  manager: "border-[#F3E8FF] text-[#7C3AED]",
  super_admin: "border-[#FEE2E2] text-[#DC2626]",
}

const ROLE_BADGE_BG: Record<UserRole, string> = {
  user: "bg-[#DBEAFE]",
  manager: "bg-[#F3E8FF]",
  super_admin: "bg-[#FEE2E2]",
}

function getInitial(fullName: string | null): string {
  if (!fullName) return "?"
  return fullName.charAt(0)
}

interface ProfileCardProps {
  user: UserDetail
  coachAssignments?: CoachAssignmentItem[]
  availableCoaches?: CoachOption[]
  coachReadOnly?: boolean
}

export function ProfileCard({
  user,
  coachAssignments = [],
  availableCoaches = [],
  coachReadOnly = false,
}: ProfileCardProps) {
  const createdDate = format(new Date(user.createdAt), "yyyy/MM/dd")
  const elapsedDays = differenceInDays(new Date(), new Date(user.createdAt))

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-6">
        {/* アバター */}
        <Avatar className="size-20">
          {user.avatarUrl && (
            <AvatarImage src={user.avatarUrl} alt={user.fullName ?? ""} />
          )}
          <AvatarFallback className="text-2xl bg-muted">
            {getInitial(user.fullName)}
          </AvatarFallback>
        </Avatar>

        {/* 氏名 */}
        <h2 className="text-xl font-bold">
          {user.fullName ?? "未設定"}
        </h2>

        {/* メール */}
        <p className="text-sm text-muted-foreground">{user.email}</p>

        {/* ロールバッジ */}
        <Badge
          variant="outline"
          className={`rounded-full px-3 py-1 text-xs font-medium ${ROLE_BADGE_CLASSES[user.role]} ${ROLE_BADGE_BG[user.role]}`}
        >
          {ROLE_LABELS[user.role]}
        </Badge>

        <Separator />

        {/* 情報行（左ラベル - 右値） */}
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">受講状態</span>
            <span
              className={`text-[13px] font-medium ${
                user.isBanned ? "text-red-600" : "text-green-600"
              }`}
            >
              {user.isBanned ? "無効" : "有効"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">現在のターム</span>
            <span className="text-[13px]">{user.currentTerm ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">作成日</span>
            <span className="text-[13px] tabular-nums">{createdDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">経過日数</span>
            <span className="text-[13px] tabular-nums">{elapsedDays}日</span>
          </div>

          {/* コーチ割り当てセクション（user ロールのみ） */}
          {user.role === "user" && (
            <CoachAssignmentSection
              userId={user.id}
              assignments={coachAssignments}
              coaches={availableCoaches}
              readOnly={coachReadOnly}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
