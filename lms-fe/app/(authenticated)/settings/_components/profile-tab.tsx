"use client"

import type { UserRole } from "@/lib/types/app-shell"
import { AvatarUploader } from "./avatar-uploader"
import { ProfileForm } from "./profile-form"
import { Separator } from "@/components/ui/separator"

/**
 * プロフィールタブのユーザー情報型
 */
export interface UserProfile {
  userId: string
  lastName: string
  firstName: string
  fullName: string
  email: string
  avatarUrl: string | null
  role: UserRole
  defaultGenre: string | null
}

/**
 * プロフィールタブ (Client Component)
 *
 * プロフィール表示・編集フォームとアバター画像コンポーネントを統合する。
 * - AvatarUploader: アバター画像の表示・変更
 * - ProfileForm: 姓名編集、メールアドレス表示、ロール表示
 */
export function ProfileTab({ userProfile }: { userProfile: UserProfile }) {
  return (
    <div className="flex flex-col gap-8 max-w-lg">
      {/* アバター画像セクション */}
      <AvatarUploader
        currentAvatarUrl={userProfile.avatarUrl}
        userId={userProfile.userId}
      />

      <Separator />

      {/* プロフィール編集フォームセクション */}
      <ProfileForm
        lastName={userProfile.lastName}
        firstName={userProfile.firstName}
        email={userProfile.email}
        role={userProfile.role}
        defaultGenre={userProfile.defaultGenre}
      />
    </div>
  )
}
