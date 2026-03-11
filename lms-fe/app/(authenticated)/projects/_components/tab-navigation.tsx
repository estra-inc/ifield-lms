"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"

/**
 * TabNavigation Client Component
 *
 * 3つのタブの切替 UI を提供する。
 * searchParams ?tab= でアクティブタブを管理する。
 *
 * Task 6.2
 * Requirements: 10.2, 10.4
 */

export type TabKey = "progress" | "requirements" | "tasks" | "history" | "evaluation"

const DEFAULT_TABS: { key: TabKey; label: string }[] = [
  { key: "progress", label: "進捗" },
  { key: "requirements", label: "案件要件" },
  { key: "tasks", label: "タスク管理" },
  { key: "history", label: "提出履歴" },
]

interface TabNavigationProps {
  activeTab: TabKey
  tabs?: { key: TabKey; label: string }[]
}

export function TabNavigation({ activeTab, tabs }: TabNavigationProps) {
  const TABS = tabs ?? DEFAULT_TABS
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const handleTabClick = (tabKey: TabKey) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tabKey)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
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
  )
}
