"use client"

import { useState, useRef, useActionState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import { Check, Camera } from "lucide-react"

import { completeInviteSetup } from "@/app/auth/actions/auth"
import {
  inviteSetupStep1Schema,
  inviteSetupStep2Schema,
  type InviteSetupStep1FormValues,
  type InviteSetupStep2FormValues,
  type ActionResult,
} from "@/lib/validations/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { SubmitButton } from "@/components/ui/submit-button"

/**
 * ステッパーコンポーネント
 *
 * 2 ステップのプログレスを表示する。
 * - Step 1 アクティブ: Primary 背景 + "1"
 * - Step 1 完了: Primary 背景 + Check アイコン
 * - Step 2 非アクティブ: Border 枠 + "2"
 * - Step 2 アクティブ: Primary 背景 + "2"
 */
function Stepper({ currentStep }: { currentStep: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {/* Step 1 */}
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
          currentStep === 1
            ? "bg-primary text-primary-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {currentStep === 2 ? (
          <Check className="h-4 w-4" />
        ) : (
          "1"
        )}
      </div>

      {/* Connector Line */}
      <div
        className={`h-[2px] w-12 ${
          currentStep === 2 ? "bg-primary" : "bg-border"
        }`}
      />

      {/* Step 2 */}
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
          currentStep === 2
            ? "bg-primary text-primary-foreground"
            : "border-2 border-border text-muted-foreground"
        }`}
      >
        2
      </div>
    </div>
  )
}

/**
 * 招待登録フォーム (Client Component) - 2ステップ構成
 *
 * Step 1: 氏名設定 (姓・名 + アバター画像アップロード)
 * Step 2: パスワード設定
 *
 * - useState で currentStep: 1 | 2 を管理 (URL は変わらない)
 * - Step 1 のデータはローカルステートに保持
 * - Step 2 送信時に Step 1 + Step 2 データ + アバターを一括で FormData 送信
 */
export function InviteSetupForm() {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [step1Data, setStep1Data] = useState<InviteSetupStep1FormValues | null>(null)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [state, formAction] = useActionState<ActionResult, FormData>(
    completeInviteSetup,
    null
  )
  const [isPending, startTransition] = useTransition()

  // Step 1 form
  const step1Form = useForm<InviteSetupStep1FormValues>({
    resolver: zodResolver(inviteSetupStep1Schema),
    defaultValues: {
      lastName: "",
      firstName: "",
    },
  })

  // Step 2 form
  const step2Form = useForm<InviteSetupStep2FormValues>({
    resolver: zodResolver(inviteSetupStep2Schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  /**
   * Step 1 バリデーション成功時に Step 2 へ遷移
   */
  const handleStep1Submit = (data: InviteSetupStep1FormValues) => {
    setStep1Data(data)
    setCurrentStep(2)
  }

  /**
   * アバター画像選択ハンドラ
   */
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatar(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  /**
   * Step 2 送信: Step 1 + Step 2 データを FormData にまとめて Server Action へ送信
   */
  const handleStep2Submit = (data: InviteSetupStep2FormValues) => {
    if (!step1Data) return

    const formData = new FormData()
    formData.append("lastName", step1Data.lastName)
    formData.append("firstName", step1Data.firstName)
    formData.append("password", data.password)
    formData.append("confirmPassword", data.confirmPassword)
    if (avatar) {
      formData.append("avatar", avatar)
    }

    startTransition(() => {
      formAction(formData)
    })
  }

  const subtitleText =
    currentStep === 1
      ? "招待を受け付けました。プロフィール情報を入力してください。"
      : "ログイン用のパスワードを設定してください。"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-[420px] border p-10 shadow-none gap-8">
        <CardContent className="flex flex-col gap-8 p-0">
          {/* Logo Area */}
          <div className="flex flex-col items-center gap-3">
            <Image
              src="/ifield-logo_max_blacktext.png"
              alt="i.field"
              width={160}
              height={38}
            />
            <div className="text-center">
              <h1 className="text-xl font-semibold">アカウント設定</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {subtitleText}
              </p>
            </div>
          </div>

          {/* Stepper */}
          <Stepper currentStep={currentStep} />

          {/* Server Error Message */}
          {state && !state.success && (
            <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
              {state.message}
            </div>
          )}

          {/* Step 1: Profile Setup */}
          {currentStep === 1 && (
            <Form {...step1Form}>
              <form
                onSubmit={step1Form.handleSubmit(handleStep1Submit)}
                className="flex flex-col gap-6"
              >
                {/* Avatar Upload Area */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/30 transition-colors hover:bg-muted/50"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="avatar preview"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    data-testid="avatar-input"
                  />
                  <p className="text-[12px] text-muted-foreground">
                    クリックして画像をアップロード（任意）
                  </p>
                </div>

                {/* Name Fields (side by side) */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={step1Form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] font-medium">
                          姓
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="山田"
                            className="h-10 px-3 rounded-md"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={step1Form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[13px] font-medium">
                          名
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="太郎"
                            className="h-10 px-3 rounded-md"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full">
                  次へ
                </Button>
              </form>
            </Form>
          )}

          {/* Step 2: Password Setup */}
          {currentStep === 2 && (
            <Form {...step2Form}>
              <form
                onSubmit={step2Form.handleSubmit(handleStep2Submit)}
                className="flex flex-col gap-6"
              >
                <FormField
                  control={step2Form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-medium">
                        パスワード
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="8文字以上"
                          className="h-10 px-3 rounded-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={step2Form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] font-medium">
                        パスワード（確認）
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="パスワードを再入力"
                          className="h-10 px-3 rounded-md"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <SubmitButton
                  className="w-full"
                  pendingText="作成中..."
                >
                  アカウントを作成
                </SubmitButton>

                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-center text-[13px] text-muted-foreground hover:text-foreground"
                >
                  ← 戻る
                </button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
