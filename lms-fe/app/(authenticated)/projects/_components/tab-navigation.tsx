"use client"

import { useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { LoadingIndicator } from "@/components/ui/loading-screen"

/**
 * TabNavigation Client Component
 *
 * URL searchParams ベースのタブ切替 UI。
 * useTransition でサーバーレンダリング中にタブコンテンツ領域に
 * ローディングオーバーレイを表示する。
 *
 * Task 6.2
 * Requirements: 10.2, 10.4
 */

export type TabKey = "progress" | "requirements" | "tasks" | "history" | "evaluation"

const DEFAULT_TABS: { key: TabKey; label: string }[] = [
  { key: "progress", label: "進捗" },
  { key: "requirements", label: "案件要件" },
  { key: "evaluation", label: "評価項目" },
  { key: "tasks", label: "タスク管理" },
  { key: "history", label: "提出履歴" },
]

interface TabNavigationProps {
  activeTab: TabKey
  tabs?: { key: TabKey; label: string }[]
  children?: React.ReactNode
}

export function TabNavigation({ activeTab, tabs, children }: TabNavigationProps) {
  const TABS = tabs ?? DEFAULT_TABS
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const handleTabClick = (tabKey: TabKey) => {
    if (tabKey === activeTab) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tabKey)
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <>
      <div className="flex items-center border-b border-border">
        <div className="flex gap-0">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabClick(tab.key)}
                className={`border-b-2 px-5 py-2.5 font-[family-name:var(--font-primary)] text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {children && (
        <div className="relative min-h-[200px]">
          {isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60">
              <LoadingIndicator size="sm" />
            </div>
          )}
          <div className={isPending ? "pointer-events-none opacity-40 transition-opacity" : "transition-opacity"}>
            {children}
          </div>
        </div>
      )}
    </>
  )
}
