"use client"

import Link from "next/link"
import { CheckCircle, ArrowRight, LayoutList, BookOpen } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface CongratulationsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionTitle: string
  hasNextSection: boolean
  nextSectionPath: string | null
  chapterListPath: string
}

/**
 * おめでとうモーダル
 *
 * 読了完了時に表示されるモーダルダイアログ。
 * shadcn/ui の Dialog コンポーネントをベースに実装。
 */
export function CongratulationsModal({
  open,
  onOpenChange,
  sectionTitle,
  hasNextSection,
  nextSectionPath,
  chapterListPath,
}: CongratulationsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[440px] rounded-xl p-6 sm:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
      >
        <div className="flex flex-col items-center gap-6">
          {/* アイコン */}
          <div className="flex size-16 items-center justify-center rounded-full bg-[#ECFDF5]">
            <CheckCircle className="size-8 text-[#22C55E]" fill="#22C55E" stroke="white" />
          </div>

          {/* タイトル */}
          <DialogTitle className="text-center font-[family-name:var(--font-primary)] text-xl font-bold text-foreground">
            おめでとうございます!
          </DialogTitle>

          {/* 説明文 */}
          <DialogDescription className="text-center font-mono text-[13px] leading-[1.7] text-muted-foreground">
            {hasNextSection ? (
              <>
                「{sectionTitle}」の学習が完了しました。
                <br />
                引き続き次のセクションに進みましょう。
              </>
            ) : (
              <>
                「{sectionTitle}」の学習が完了しました。
                <br />
                このチャプターのすべてのセクションを修了しました!
              </>
            )}
          </DialogDescription>

          {/* ボタングループ */}
          <div className="flex w-full flex-col gap-2.5">
            {/* プライマリボタン */}
            {hasNextSection && nextSectionPath ? (
              <Link
                href={nextSectionPath}
                onClick={() => onOpenChange(false)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-[family-name:var(--font-primary)] text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                次のセクションに進む
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <Link
                href={chapterListPath}
                onClick={() => onOpenChange(false)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-[family-name:var(--font-primary)] text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                チャプター一覧に戻る
                <LayoutList className="size-4" />
              </Link>
            )}

            {/* セカンダリボタン */}
            <Link
              href="/contents"
              onClick={() => onOpenChange(false)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border font-[family-name:var(--font-primary)] text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <BookOpen className="size-4" />
              教材一覧に戻る
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
