"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ExternalLinkIcon } from "lucide-react"

type ChangeType = "added" | "updated" | "deleted"

export interface DiffItem {
  path: string
  changeType: ChangeType
}

export interface DiffTabData {
  label: string
  items: DiffItem[]
  summary: { added: number; updated: number; deleted: number } | null
  emptyMessage?: string
}

interface VersionDiffTabsProps {
  tabs: DiffTabData[]
  versionId: string
}

const CHANGE_TYPE_BADGE_CONFIG: Record<
  ChangeType,
  { label: string; className: string }
> = {
  added: {
    label: "追加",
    className: "rounded-none bg-green-100 text-green-800 hover:bg-green-100",
  },
  updated: {
    label: "更新",
    className: "rounded-none bg-[#7FCEF4]/20 text-[#00B0EC] hover:bg-[#7FCEF4]/20",
  },
  deleted: {
    label: "削除",
    className: "rounded-none bg-red-100 text-red-800 hover:bg-red-100",
  },
}

const ROW_BG_CONFIG: Record<ChangeType, string> = {
  added: "bg-green-50",
  updated: "",
  deleted: "bg-red-50",
}

function buildPreviewLink(slugPath: string, versionId: string): string {
  const parts = slugPath.split("/")
  const tutorialSlug = parts[1] ?? ""
  return `/contents/${tutorialSlug}?version_id=${versionId}`
}

function formatSummaryBadge(summary: { added: number; updated: number; deleted: number } | null): string {
  if (!summary) return ""
  const parts: string[] = []
  if (summary.added > 0) parts.push(`+${summary.added}`)
  if (summary.updated > 0) parts.push(`~${summary.updated}`)
  if (summary.deleted > 0) parts.push(`-${summary.deleted}`)
  return parts.join(" ")
}

export function VersionDiffTabs({ tabs, versionId }: VersionDiffTabsProps) {
  return (
    <Tabs defaultValue={tabs[0]?.label}>
      <TabsList variant="line" className="w-full justify-start border-b border-border">
        {tabs.map((tab) => {
          const summaryText = formatSummaryBadge(tab.summary)
          return (
            <TabsTrigger
              key={tab.label}
              value={tab.label}
              className="rounded-none font-[family-name:var(--font-primary)] text-sm px-4"
            >
              {tab.label}
              {summaryText && (
                <span className="ml-2 font-[family-name:var(--font-secondary)] text-xs text-muted-foreground">
                  {summaryText}
                </span>
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.label} value={tab.label}>
          {tab.items.length > 0 ? (
            <div className="rounded-none border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="h-11 bg-muted">
                    <TableHead className="text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
                      パス
                    </TableHead>
                    <TableHead className="w-[100px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
                      変更種別
                    </TableHead>
                    <TableHead className="w-[120px] text-[13px] font-[family-name:var(--font-primary)] text-muted-foreground">
                      操作
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tab.items.map((item) => {
                    const badgeConfig = CHANGE_TYPE_BADGE_CONFIG[item.changeType]
                    const rowBg = ROW_BG_CONFIG[item.changeType]
                    const isDeleted = item.changeType === "deleted"

                    return (
                      <TableRow
                        key={item.path}
                        className={`h-[52px] ${rowBg}`}
                      >
                        <TableCell>
                          <code
                            className={`font-[family-name:var(--font-secondary)] text-sm text-foreground ${
                              isDeleted ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {item.path}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge className={badgeConfig.className}>
                            {badgeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isDeleted ? (
                            <span className="font-[family-name:var(--font-primary)] text-sm text-muted-foreground">
                              {"\u2014"}
                            </span>
                          ) : (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="rounded-none h-8 px-2 font-[family-name:var(--font-primary)] text-[#00B0EC] hover:text-[#00B0EC]/80"
                            >
                              <Link
                                href={buildPreviewLink(item.path, versionId)}
                                target="_blank"
                              >
                                プレビュー
                                <ExternalLinkIcon className="size-3 ml-1" />
                              </Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border border-border rounded-none">
              <p className="font-[family-name:var(--font-primary)] text-sm">
                {tab.emptyMessage ?? "変更はありません"}
              </p>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
