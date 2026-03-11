"use client"

import { useState, useTransition, useActionState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { updateProfile, updateCoachingGenre } from "@/app/(authenticated)/settings/actions"
import {
  profileSchema,
  type ProfileFormValues,
} from "@/lib/validations/settings"
import type { ActionResult } from "@/lib/validations/auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import type { UserRole } from "@/lib/types/app-shell"

// ---- ロールラベルマッピング ----

const ROLE_LABELS: Record<UserRole, string> = {
  user: "受講生",
  manager: "マネージャー",
  super_admin: "スーパー管理者",
}

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  user: "bg-blue-100 text-blue-700 border-blue-200",
  manager: "bg-purple-100 text-purple-700 border-purple-200",
  super_admin: "bg-red-100 text-red-700 border-red-200",
}

// ---- Props ----

interface ProfileFormProps {
  lastName: string
  firstName: string
  email: string
  role: UserRole
  defaultGenre: string | null
}

/**
 * プロフィール編集フォーム (Client Component)
 *
 * - React Hook Form + Zod (profileSchema) によるクライアントサイドバリデーション
 * - useTransition で Server Action を呼び出し、送信中はボタンを disabled 化
 * - 保存成功時に sonner toast で成功メッセージを表示
 * - バリデーションエラーは該当フィールドをハイライト
 * - メールアドレスはロックアイコン付き読み取り専用
 * - ロールはバッジで表示
 */
const GENRE_LABELS: Record<string, string> = {
  engineering: "エンジニアリング",
  design: "デザイン",
}

export function ProfileForm({
  lastName,
  firstName,
  email,
  role,
  defaultGenre,
}: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [state, formAction] = useActionState<ActionResult, FormData>(
    updateProfile,
    null
  )
  const [genrePending, startGenreTransition] = useTransition()
  const [selectedGenre, setSelectedGenre] = useState(defaultGenre ?? "engineering")

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      lastName,
      firstName,
    },
  })

  const handleSubmit = (data: ProfileFormValues) => {
    const formData = new FormData()
    formData.append("lastName", data.lastName)
    formData.append("firstName", data.firstName)

    startTransition(() => {
      formAction(formData)
    })
  }

  // state が変わったら toast を表示（useEffect で副作用として処理）
  const prevStateRef = useRef(state)
  useEffect(() => {
    if (state === prevStateRef.current) return
    prevStateRef.current = state

    if (state?.success) {
      toast.success(state.message)
    } else if (state && !state.success) {
      toast.error(state.message)
    }
  }, [state])

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* ロール表示 */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">ロール</span>
        <Badge
          variant="outline"
          className={ROLE_BADGE_CLASSES[role]}
        >
          {ROLE_LABELS[role]}
        </Badge>
      </div>

      {/* コーチングジャンル (Super Admin のみ) */}
      {role === "super_admin" && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">コーチングジャンル</label>
          <div className="flex items-center gap-3">
            <select
              value={selectedGenre}
              onChange={(e) => {
                const newGenre = e.target.value
                setSelectedGenre(newGenre)
                startGenreTransition(async () => {
                  const formData = new FormData()
                  formData.append("genre", newGenre)
                  const result = await updateCoachingGenre(null, formData)
                  if (result?.success) {
                    toast.success(result.message)
                  } else {
                    toast.error(result?.message ?? "保存に失敗しました。")
                    setSelectedGenre(defaultGenre ?? "engineering")
                  }
                })
              }}
              disabled={genrePending}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="engineering">{GENRE_LABELS.engineering}</option>
              <option value="design">{GENRE_LABELS.design}</option>
            </select>
            {genrePending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">
            コーチングで担当するジャンルを選択してください
          </p>
        </div>
      )}

      {/* メールアドレス (読み取り専用) */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">メールアドレス</label>
        <div className="relative">
          <Input
            type="email"
            value={email}
            readOnly
            disabled
            className="h-10 pr-10 bg-muted/50"
          />
          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* 名前編集フォーム */}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-6"
        >
          {/* 姓名フィールド (横並び) */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">姓</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="山田"
                      className="h-10"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">名</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="太郎"
                      className="h-10"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 注意書き */}
          <p className="text-xs text-muted-foreground">
            ※ 正式な表記で氏名を入力してください
          </p>

          {/* 保存ボタン */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-fit ml-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存する"
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
