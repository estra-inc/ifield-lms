"use client"

import { useState, useRef, useTransition, useCallback } from "react"
import { User, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { uploadAvatar } from "@/app/(authenticated)/settings/actions"
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/validations/settings"
import { Button } from "@/components/ui/button"

// ---- 定数 ----

const MAX_RESIZE_PX = 512

// ---- Props ----

interface AvatarUploaderProps {
  currentAvatarUrl: string | null
  userId: string
}

// ---- Canvas リサイズヘルパー ----

/**
 * 画像を Canvas API で最大 512x512px にリサイズし、WebP Blob として返す。
 * アスペクト比を維持し、元画像が 512px 以下の場合はそのまま返す。
 */
async function resizeImageToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img

      // 512px 以下ならリサイズ不要だが WebP 変換は行う
      if (width > MAX_RESIZE_PX || height > MAX_RESIZE_PX) {
        const scale = Math.min(MAX_RESIZE_PX / width, MAX_RESIZE_PX / height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas context の取得に失敗しました"))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("WebP 変換に失敗しました"))
          }
        },
        "image/webp",
        0.85
      )
    }
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"))
    img.src = URL.createObjectURL(file)
  })
}

// ---- コンポーネント ----

/**
 * アバター画像アップロードコンポーネント (Client Component)
 *
 * - 現在のアバター画像を円形で表示（未設定時はデフォルトアイコン）
 * - ファイル選択時にクライアントサイドで形式・サイズを検証
 * - Canvas API で最大 512x512px にリサイズし WebP で圧縮
 * - プレビュー表示後にアップロードを実行
 * - hidden input + クリックハンドラのパターンでファイル選択
 * - アバター画像、「プロフィール画像」ラベル、「画像を変更」ボタンを一行に配置
 */
export function AvatarUploader({
  currentAvatarUrl,
  userId,
}: AvatarUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const avatarUrl = preview

  /**
   * ファイル選択ハンドラ
   *
   * 1. クライアントサイドで MIME タイプとファイルサイズを検証
   * 2. Canvas API でリサイズ + WebP 変換
   * 3. プレビュー表示
   * 4. Server Action でアップロード
   */
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // クライアントサイドファイル形式検証
      if (
        !ACCEPTED_IMAGE_TYPES.includes(
          file.type as (typeof ACCEPTED_IMAGE_TYPES)[number]
        )
      ) {
        toast.error(
          "ファイル形式が不正です。JPEG、PNG、WebP のいずれかを選択してください。"
        )
        return
      }

      // クライアントサイドファイルサイズ検証
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          "ファイルサイズが2MBを超えています。2MB以下の画像を選択してください。"
        )
        return
      }

      try {
        // Canvas API でリサイズ + WebP 変換
        const webpBlob = await resizeImageToWebP(file)

        // リサイズ後のサイズも検証
        if (webpBlob.size > MAX_FILE_SIZE) {
          toast.error(
            "リサイズ後もファイルサイズが2MBを超えています。別の画像をお試しください。"
          )
          return
        }

        // プレビュー表示
        const previewUrl = URL.createObjectURL(webpBlob)
        setPreview(previewUrl)

        // Server Action でアップロード
        const webpFile = new File([webpBlob], "avatar.webp", {
          type: "image/webp",
        })
        const formData = new FormData()
        formData.append("avatar", webpFile)

        startTransition(async () => {
          const result = await uploadAvatar(null, formData)
          if (result.success) {
            toast.success(result.message)
            if (result.avatarUrl) {
              setPreview(result.avatarUrl)
            }
          } else {
            toast.error(result.message)
            // エラー時は元の画像に戻す
            setPreview(currentAvatarUrl)
          }
        })
      } catch {
        toast.error("画像の処理中にエラーが発生しました。")
      }

      // ファイル入力をリセット（同じファイルの再選択を可能にする）
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [currentAvatarUrl, startTransition]
  )

  return (
    <div className="flex items-center gap-4">
      {/* アバター画像 (円形) */}
      <div className="relative h-16 w-16 shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="アバター"
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* ラベルとボタン */}
      <div className="flex flex-1 items-center justify-between">
        <span className="text-sm font-medium">プロフィール画像</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
        >
          画像を変更
        </Button>
      </div>

      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        data-testid="avatar-file-input"
      />
    </div>
  )
}
