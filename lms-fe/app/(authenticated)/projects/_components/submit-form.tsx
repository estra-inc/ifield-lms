"use client"

import { useTransition, useState, useRef } from "react"
import { toast } from "sonner"
import { Loader2, Send, Paperclip, X, Plus, Link as LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { submitWork } from "@/app/(authenticated)/projects/actions"
import { createClient } from "@/lib/supabase/client"

/**
 * SubmitForm Client Component
 *
 * 成果物提出フォーム。複数URL入力 + ファイルアップロード（複数可）。
 */

interface UploadedFile {
  name: string
  url: string
}

export interface SubmitFormProps {
  assignmentId: string
  isGrading: boolean
  isArchived: boolean
  onSuccess?: () => void
}

export function SubmitForm({
  assignmentId,
  isGrading,
  isArchived,
  onSuccess,
}: SubmitFormProps) {
  const [isPending, startTransition] = useTransition()
  const [urls, setUrls] = useState<string[]>([""])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (isArchived) {
    return (
      <p className="font-mono text-sm text-muted-foreground">
        この案件はアーカイブされたため提出できません
      </p>
    )
  }

  const isDisabled = isGrading || isPending || isUploading
  const validUrls = urls.filter((u) => u.trim() !== "")
  const hasContent = validUrls.length > 0 || files.length > 0

  // --- URL 操作 ---
  const updateUrl = (index: number, value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)))
  }

  const addUrl = () => {
    setUrls((prev) => [...prev, ""])
  }

  const removeUrl = (index: number) => {
    setUrls((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length === 0 ? [""] : next
    })
  }

  // --- ファイル操作 ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setIsUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("認証情報を取得できませんでした")
        return
      }

      const newFiles: UploadedFile[] = []

      for (const file of Array.from(selectedFiles)) {
        const ext = file.name.split(".").pop() || "bin"
        const safeFileName = `${crypto.randomUUID()}.${ext}`
        const storagePath = `${user.id}/${assignmentId}/${safeFileName}`
        const { error: uploadError } = await supabase.storage
          .from("task-attachments")
          .upload(storagePath, file)

        if (uploadError) {
          toast.error(`${file.name} のアップロードに失敗しました: ${uploadError.message}`)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from("task-attachments")
          .getPublicUrl(storagePath)

        newFiles.push({ name: file.name, url: publicUrl })
      }

      setFiles((prev) => [...prev, ...newFiles])
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // --- 提出 ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasContent) {
      toast.error("URLまたはファイルを入力してください")
      return
    }

    startTransition(async () => {
      const result = await submitWork(
        assignmentId,
        validUrls.length > 0 ? validUrls.join("\n") : null,
        files.length > 0 ? files : null
      )

      if (result.success) {
        toast.success(result.message)
        setUrls([""])
        setFiles([])
        onSuccess?.()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* URL 入力（複数可） */}
      <div className="space-y-2">
        <Label className="text-[13px] font-medium">
          リンク（任意・複数可）
        </Label>
        <div className="space-y-2">
          {urls.map((url, index) => (
            <div key={index} className="flex items-center gap-2">
              <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://..."
                disabled={isDisabled}
                value={url}
                onChange={(e) => updateUrl(index, e.target.value)}
                className="flex-1"
              />
              {urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeUrl(index)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  disabled={isDisabled}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isDisabled}
            onClick={addUrl}
            className="gap-1 text-xs text-muted-foreground"
          >
            <Plus className="size-3.5" />
            リンクを追加
          </Button>
        </div>
      </div>

      {/* ファイルアップロード */}
      <div className="space-y-2">
        <Label className="text-[13px] font-medium">
          ファイル（任意・複数可）
        </Label>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={isDisabled}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDisabled}
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Paperclip className="size-4" />
            )}
            {isUploading ? "アップロード中..." : "ファイルを追加"}
          </Button>
        </div>

        {files.length > 0 && (
          <div className="space-y-1.5">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm"
              >
                <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate flex-1 font-mono text-xs">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  disabled={isDisabled}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {isGrading && (
        <p className="font-mono text-xs text-muted-foreground">
          前回の提出がまだ採点されていません。採点完了までお待ちください。
        </p>
      )}

      <Button type="submit" disabled={isDisabled || !hasContent} className="gap-2">
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        提出する
      </Button>
    </form>
  )
}
