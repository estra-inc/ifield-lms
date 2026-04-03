"use client"

import { useEffect, useState } from "react"
import { List, ChevronDown } from "lucide-react"
import type { TocItem } from "@/lib/markdown/render-markdown"

interface TableOfContentsClientProps {
  tocItems: TocItem[]
}

function useTocActiveId(tocItems: TocItem[]) {
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

  return activeId
}

function TocItemButton({
  item,
  isActive,
  onClick,
}: {
  item: TocItem
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
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
}

/**
 * デスクトップ用サイドバー目次（スクロール追従アクティブハイライト）
 */
export function TableOfContentsClient({
  tocItems,
}: TableOfContentsClientProps) {
  const activeId = useTocActiveId(tocItems)

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
          {tocItems.map((item) => (
            <TocItemButton
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onClick={() => handleClick(item.id)}
            />
          ))}
        </div>
      </nav>
    </div>
  )
}

/**
 * モバイル用折りたたみ式目次
 */
export function MobileTableOfContents({
  tocItems,
}: TableOfContentsClientProps) {
  const activeId = useTocActiveId(tocItems)
  const [isOpen, setIsOpen] = useState(false)

  const handleClick = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
      setIsOpen(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-2">
          <List className="size-4 text-foreground" />
          <span className="font-[family-name:var(--font-primary)] text-[13px] font-semibold text-foreground">
            目次
          </span>
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="flex flex-col gap-0.5 px-4 pb-3">
          {tocItems.map((item) => (
            <TocItemButton
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onClick={() => handleClick(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
