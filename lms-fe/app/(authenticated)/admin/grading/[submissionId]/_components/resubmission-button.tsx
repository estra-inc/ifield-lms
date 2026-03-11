"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { requestResubmission } from "../../actions"

interface ResubmissionButtonProps {
  submissionId: string
}

export function ResubmissionButton({ submissionId }: ResubmissionButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleResubmission = () => {
    startTransition(async () => {
      const result = await requestResubmission({ submissionId })
      if (result.success) {
        toast.success(result.message)
        router.push("/admin/grading")
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isPending}>
          <RotateCcw className="mr-2 h-4 w-4" />
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
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "処理中..." : "再提出を依頼"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
