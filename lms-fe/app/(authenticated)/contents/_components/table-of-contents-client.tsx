"use client"

import { useEffect, useState } from "react"
import type { TocItem } from "@/lib/markdown/render-markdown"

interface TableOfContentsClientProps {
  tocItems: TocItem[]
}

/**
 * サイドバー目次のスクロール追従アクティブハイライト（Client Component）
 *
 * Intersection Observer API で画面内の見出しを検出し、
 * アクティブな見出しをハイライト表示する。
 */
export function TableOfContentsClient({
  tocItems,
}: TableOfContentsClientProps) {
  const [activeId, setActiveId] = useState<string>("")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      {
        rootMargin: "0px 0px -70% 0px",
      }
    )

    // 見出し要素を監視
    for (const item of tocItems) {
      const element = document.getElementById(item.id)
      if (element) {
        observer.observe(element)
      }
    }

    return () => {
      observer.disconnect()
    }
  }, [tocItems])

  const handleClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="hidden md:block w-60 shrink-0 pt-6">
      <nav className="sticky top-6 max-h-[calc(100vh-3rem)] rounded-lg border border-border bg-card p-4 overflow-y-auto">
        <h4 className="font-[family-name:var(--font-primary)] text-sm font-bold text-foreground">
          目次
        </h4>
        <div className="mt-3 flex flex-col gap-0.5">
          {tocItems.map((item) => {
            const isActive = activeId === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`text-left px-3 py-1.5 font-mono text-[12px] leading-relaxed transition-colors rounded ${
                  item.level === 3 ? "pl-5" : ""
                } ${
                  isActive
                    ? "bg-[#EFF9FE] border-l-[3px] border-primary font-semibold text-primary"
                    : "text-muted-foreground hover:text-foreground border-l-[3px] border-transparent"
                }`}
              >
                {item.text}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
