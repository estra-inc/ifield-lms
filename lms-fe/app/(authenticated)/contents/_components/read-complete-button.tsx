"use client"

import { useState, useTransition } from "react"
import { CheckCircle } from "lucide-react"
import { markAsRead } from "@/app/(authenticated)/contents/actions"
import { CongratulationsModal } from "./congratulations-modal"

interface ReadCompleteButtonProps {
  contentId: string
  isCompleted: boolean
  sectionTitle: string
  hasNextSection: boolean
  nextSectionPath: string | null
  chapterListPath: string
}

/**
 * 読了ボタン（Client Component）
 *
 * 未読了: 「読了する」ボタンを表示。クリックで markAsRead Server Action を呼び出す。
 * 読了済み: 「読了済み」状態で disabled 表示。
 * Server Action 完了後、おめでとうモーダルを表示する。
 */
export function ReadCompleteButton({
  contentId,
  isCompleted: initialIsCompleted,
  sectionTitle,
  hasNextSection,
  nextSectionPath,
  chapterListPath,
}: ReadCompleteButtonProps) {
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted)
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleMarkAsRead = () => {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("contentId", contentId)
      const result = await markAsRead(null, formData)

      if (result?.success && !result.alreadyCompleted) {
        setIsCompleted(true)
        setShowModal(true)
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-3 pt-8">
      {!isCompleted && (
        <p className="font-mono text-[13px] text-muted-foreground">
          このセクションを読み終えましたか?
        </p>
      )}

      <button
        onClick={handleMarkAsRead}
        disabled={isCompleted || isPending}
        className={`flex items-center gap-2 rounded-lg px-8 py-3 font-[family-name:var(--font-primary)] text-sm font-semibold transition-colors ${
          isCompleted
            ? "bg-muted text-[#22C55E] cursor-default"
            : "bg-primary text-white hover:bg-primary/90"
        }`}
      >
        <CheckCircle className="size-4" />
        {isPending
          ? "処理中..."
          : isCompleted
            ? "読了済み"
            : "読了する"}
      </button>

      <CongratulationsModal
        open={showModal}
        onOpenChange={setShowModal}
        sectionTitle={sectionTitle}
        hasNextSection={hasNextSection}
        nextSectionPath={nextSectionPath}
        chapterListPath={chapterListPath}
      />
    </div>
  )
}
