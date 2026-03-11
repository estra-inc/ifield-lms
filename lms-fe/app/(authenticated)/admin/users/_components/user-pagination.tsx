"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UserPaginationProps {
  totalCount: number
  page: number
  perPage: number
}

export function UserPagination({
  totalCount,
  page,
  perPage,
}: UserPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const totalPages = Math.ceil(totalCount / perPage)

  if (totalPages <= 1) {
    return null
  }

  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, totalCount)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  const goToPage = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (targetPage <= 1) {
      params.delete("page")
    } else {
      params.set("page", String(targetPage))
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const getPageNumbers = (): number[] => {
    const pages: number[] = []
    let start = Math.max(1, page - 2)
    const end = Math.min(totalPages, start + 4)

    if (end - start < 4) {
      start = Math.max(1, end - 4)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <>
      <p className="text-[13px] text-muted-foreground">
        全 {totalCount} 件中 {from}-{to} 件を表示
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          className="size-8 p-0"
          disabled={!hasPrev}
          onClick={() => goToPage(page - 1)}
          aria-label="前のページ"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>

        {getPageNumbers().map((pageNum) => (
          <Button
            key={pageNum}
            variant={pageNum === page ? "default" : "outline"}
            className="size-8 p-0 text-[13px]"
            onClick={() => goToPage(pageNum)}
          >
            {pageNum}
          </Button>
        ))}

        <Button
          variant="outline"
          className="size-8 p-0"
          disabled={!hasNext}
          onClick={() => goToPage(page + 1)}
          aria-label="次のページ"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </>
  )
}
