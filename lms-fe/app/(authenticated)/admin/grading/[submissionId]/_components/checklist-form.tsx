"use client"

import { useState, useTransition, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { MarkdownEditor } from "@/components/markdown-editor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Save, CheckCircle2, Loader2, RotateCcw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { calculateScore } from "@/lib/utils/grading"
import type { EvaluationCategory, EvaluationState } from "@/lib/types/grading"
import { saveDraft, finalizeGrading, requestResubmission } from "@/app/(authenticated)/admin/grading/actions"

export interface ChecklistFormProps {
  submissionId: string
  studentName: string
  projectTitle: string
  githubUrl: string
  categories: EvaluationCategory[]
  initialEvaluations: EvaluationState
  initialFeedbackComment: string
  isDraft: boolean
}

export function ChecklistForm({
  submissionId,
  categories,
  initialEvaluations,
  initialFeedbackComment,
}: ChecklistFormProps) {
  const router = useRouter()
  const [evaluations, setEvaluations] =
    useState<EvaluationState>(initialEvaluations)
  const [feedbackComment, setFeedbackComment] = useState(
    initialFeedbackComment
  )
  const [isSaving, startSavingTransition] = useTransition()
  const [isFinalizing, startFinalizingTransition] = useTransition()
  const [isRejecting, startRejectingTransition] = useTransition()

  // スコアリアルタイム計算
  const scoreResult = useMemo(
    () => calculateScore(categories, evaluations),
    [categories, evaluations]
  )

  // チェックボックストグル
  const handleToggle = useCallback((itemId: string) => {
    setEvaluations((prev) => ({
      ...prev,
      [itemId]: prev[itemId] === true ? false : true,
    }))
  }, [])

  // ファイルアップロード（Supabase Storage）
  const handleUpload = useCallback(
    async (file: File) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("認証されていません。再度ログインしてください。")
        return null
      }

      const timestamp = Date.now()
      const storagePath = `grading/${submissionId}/${timestamp}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(storagePath, file)

      if (uploadError) {
        toast.error(`アップロードに失敗しました: ${uploadError.message}`)
        return null
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("task-attachments").getPublicUrl(storagePath)

      return publicUrl
    },
    [submissionId]
  )

  // 大項目ごとにカテゴリをグループ化
  const groupedCategories = useMemo(() => {
    const groups = new Map<string, EvaluationCategory[]>()
    for (const cat of categories) {
      const existing = groups.get(cat.category_large) ?? []
      existing.push(cat)
      groups.set(cat.category_large, existing)
    }
    return groups
  }, [categories])

  // 一時保存
  function handleSaveDraft() {
    startSavingTransition(async () => {
      const result = await saveDraft({
        submissionId,
        evaluations,
        feedbackComment,
      })
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  // 採点確定
  function handleFinalize() {
    // 全項目未評価チェック
    const hasAnyEvaluation = Object.values(evaluations).some(
      (v) => v === true || v === false
    )
    if (!hasAnyEvaluation) {
      toast.error("1項目以上の評価が必要です")
      return
    }

    startFinalizingTransition(async () => {
      const result = await finalizeGrading({
        submissionId,
        evaluations,
        feedbackComment,
      })
      if (result.success) {
        toast.success(result.message)
        router.push("/admin/grading")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  // 再提出依頼（現在のチェック状態とコメントも保存してから差し戻す）
  function handleResubmission() {
    startRejectingTransition(async () => {
      const result = await requestResubmission({
        submissionId,
        evaluations,
        feedbackComment,
      })
      if (result.success) {
        toast.success(result.message)
        router.push("/admin/grading")
      } else {
        toast.error(result.message)
      }
    })
  }

  const isProcessing = isSaving || isFinalizing || isRejecting

  return (
    <div className="flex flex-col gap-6">
      {/* スコアプレビュー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">スコア</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums">
              {scoreResult.totalScore}%
            </span>
            <span className="text-sm text-muted-foreground">
              ({scoreResult.totalOkCount} / {scoreResult.totalItemCount} 項目,{" "}
              {scoreResult.totalEarnedPoints} / {scoreResult.totalMaxPoints} pt)
            </span>
          </div>

          {/* 大項目別スコア */}
          {scoreResult.categoryScores.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {scoreResult.categoryScores.map((cs) => (
                <Badge
                  key={cs.categoryLarge}
                  variant="outline"
                  className="text-xs"
                >
                  {cs.categoryLarge}: {cs.okCount}/{cs.totalCount} (
                  {cs.percentage}%)
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* チェックリスト */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">評価チェックリスト</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={Array.from(groupedCategories.keys())}>
            {Array.from(groupedCategories.entries()).map(
              ([largeCat, mediumCats]) => {
                // 大項目の小計
                const catScore = scoreResult.categoryScores.find(
                  (cs) => cs.categoryLarge === largeCat
                )

                return (
                  <AccordionItem key={largeCat} value={largeCat}>
                    <AccordionTrigger className="text-base font-semibold">
                      <div className="flex items-center gap-3">
                        <span>{largeCat}</span>
                        {catScore && (
                          <Badge variant="secondary" className="text-xs">
                            {catScore.okCount} / {catScore.totalCount} (
                            {catScore.percentage}%)
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-4 pl-2">
                        {mediumCats.map((medCat) => (
                          <div key={`${largeCat}-${medCat.category_medium}`}>
                            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                              {medCat.category_medium}
                            </h4>
                            <div className="flex flex-col gap-2 pl-2">
                              {medCat.items.map((item) => (
                                <label
                                  key={item.id}
                                  className="flex items-center gap-3 cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                                >
                                  <Checkbox
                                    checked={evaluations[item.id] === true}
                                    onCheckedChange={() =>
                                      handleToggle(item.id)
                                    }
                                    disabled={isProcessing}
                                  />
                                  <span className="text-sm flex-1">
                                    {item.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground tabular-nums">
                                    {item.point}pt
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              }
            )}
          </Accordion>
        </CardContent>
      </Card>

      {/* フィードバックコメント */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">フィードバックコメント</CardTitle>
        </CardHeader>
        <CardContent>
          <MarkdownEditor
            value={feedbackComment}
            onChange={setFeedbackComment}
            placeholder="フィードバックコメントを入力してください（任意）"
            disabled={isProcessing}
            onUpload={handleUpload}
          />
          <div className="mt-1 text-right text-xs text-muted-foreground">
            {feedbackComment.length} / 2000
          </div>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isProcessing}>
              {isRejecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              再提出を依頼する
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>再提出を依頼しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                受講生にこの提出物の再提出を依頼します。受講生の進捗タブに「再提出が依頼されています」と表示されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResubmission}
                disabled={isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isRejecting ? "処理中..." : "再提出を依頼"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isProcessing}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            一時保存
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isProcessing}>
                {isFinalizing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                採点確定
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>採点を確定しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消すことができません。
                  採点確定後はチェック内容やスコアの変更はできなくなります。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleFinalize}>
                  確定する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
