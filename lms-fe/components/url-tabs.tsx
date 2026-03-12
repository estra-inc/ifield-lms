"use client"

import { useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { LoadingIndicator } from "@/components/ui/loading-screen"

interface Tab {
  key: string
  label: string
}

interface UrlTabsProps {
  tabs: Tab[]
  activeTab: string
  paramName?: string
  /** searchParams のうち tab 切替時に保持するキー */
  preserveParams?: string[]
  children: React.ReactNode
}

/**
 * URL searchParams ベースのタブ切替コンポーネント。
 *
 * useTransition でタブ切替中のサーバーレンダリングを検知し、
 * タブコンテンツ領域にローディングオーバーレイを表示する。
 */
export function UrlTabs({
  tabs,
  activeTab,
  paramName = "tab",
  preserveParams,
  children,
}: UrlTabsProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const handleTabChange = (tabKey: string) => {
    if (tabKey === activeTab) return
    const params = new URLSearchParams()
    // 保持するパラメータをコピー
    if (preserveParams) {
      for (const key of preserveParams) {
        const value = searchParams.get(key)
        if (value) params.set(key, value)
      }
    }
    params.set(paramName, tabKey)
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <>
      {/* タブ行 */}
      <div className="flex items-center border-b border-border">
        <div className="flex gap-0">
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
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

      {/* タブコンテンツ */}
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
    </>
  )
}
