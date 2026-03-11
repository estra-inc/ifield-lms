/**
 * Markdown レンダラー
 *
 * Markdown 原文を HTML 文字列に変換し、シンタックスハイライト付きでレンダリングする。
 * 同時に ToC 用の見出し情報（h2, h3）を抽出する。
 *
 * 技術スタック:
 * - unified + remark-parse + remark-gfm + remark-rehype: Markdown → HTML AST 変換
 * - rehype-pretty-code (Shiki / github-dark): コードブロックのシンタックスハイライト（非同期）
 * - rehype-stringify: HTML 文字列出力
 */

import React from "react"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import rehypeRaw from "rehype-raw"
import rehypePrettyCode from "rehype-pretty-code"
import rehypeStringify from "rehype-stringify"
import type { Heading, PhrasingContent } from "mdast"

/**
 * ToC アイテムの型定義
 */
export interface TocItem {
  /** slug 化された見出し ID（アンカーリンク用） */
  id: string
  /** 見出しテキスト */
  text: string
  /** 見出しレベル（h2 = 2, h3 = 3） */
  level: 2 | 3
}

/**
 * Markdown レンダリング結果の型定義
 */
export interface MarkdownRenderResult {
  /** HTML 文字列としてレンダリング済みのコンテンツ */
  content: React.ReactNode
  /** 抽出された見出し一覧 */
  tocItems: TocItem[]
}

/**
 * テキストをスラッグ化する
 *
 * 英数字とハイフンのみを残し、小文字に変換する。
 * 日本語文字は除去される。
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim() || "heading"
}

/**
 * Heading ノードからテキストを抽出する
 */
function extractText(children: PhrasingContent[]): string {
  return children
    .map((child) => {
      if (child.type === "text") return child.value
      if ("children" in child) return extractText(child.children as PhrasingContent[])
      return ""
    })
    .join("")
}

/**
 * Markdown 原文から ToC 用の見出しデータ（h2, h3）を抽出する
 *
 * unified + remark-parse で独立に AST を解析し、見出しデータを取得する。
 */
export function extractTocItems(markdownBody: string): TocItem[] {
  const tree = unified().use(remarkParse).parse(markdownBody)
  const tocItems: TocItem[] = []
  const usedIds = new Map<string, number>()

  for (const node of tree.children) {
    if (node.type === "heading") {
      const heading = node as Heading
      if (heading.depth === 2) {
        const text = extractText(heading.children)
        const baseId = slugify(text)

        // 重複時にサフィックスを付与
        const count = usedIds.get(baseId) ?? 0
        const id = count > 0 ? `${baseId}-${count}` : baseId
        usedIds.set(baseId, count + 1)

        tocItems.push({
          id,
          text,
          level: heading.depth as 2 | 3,
        })
      }
    }
  }

  return tocItems
}

/**
 * 見出しに id 属性を付与する rehype プラグイン
 */
function rehypeHeadingIds(tocItems: TocItem[]) {
  const headingIdMap = new Map<string, string>()
  for (const item of tocItems) {
    headingIdMap.set(item.text, item.id)
  }

  return () => {
    return (tree: { children: Array<{ type: string; tagName?: string; children?: Array<{ type: string; value?: string }>; properties?: Record<string, unknown> }> }) => {
      function visit(node: { type: string; tagName?: string; children?: Array<{ type: string; value?: string; children?: unknown[] }>; properties?: Record<string, unknown> }) {
        if (node.type === "element" && (node.tagName === "h2" || node.tagName === "h3")) {
          const text = extractTextFromHast(node.children ?? [])
          const id = headingIdMap.get(text) ?? slugify(text)
          node.properties = node.properties ?? {}
          node.properties.id = id
        }
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            visit(child as typeof node)
          }
        }
      }
      visit(tree as unknown as { type: string; children?: Array<{ type: string; value?: string; children?: unknown[] }>; properties?: Record<string, unknown> })
    }
  }
}

function extractTextFromHast(children: Array<{ type: string; value?: string; children?: Array<{ type: string; value?: string }> }>): string {
  return children
    .map((child) => {
      if (child.type === "text") return child.value ?? ""
      if (child.children) return extractTextFromHast(child.children as typeof children)
      return ""
    })
    .join("")
}

/**
 * コードブロックの言語識別子を正規化する rehype プラグイン
 *
 * ファイル名形式（例: `web.php`, `styles.css`）を拡張子ベースの言語名に変換し、
 * rehype-pretty-code が正しくハイライトできるようにする。
 */
const EXTENSION_TO_LANG: Record<string, string> = {
  php: "php",
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  css: "css",
  html: "html",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  md: "markdown",
  xml: "xml",
  vue: "vue",
  svelte: "svelte",
  swift: "swift",
  kt: "kotlin",
  c: "c",
  cpp: "cpp",
  cs: "csharp",
  r: "r",
  lua: "lua",
  toml: "toml",
  env: "dotenv",
}

function rehypeNormalizeCodeLanguage() {
  return (tree: any) => {
    function visit(node: any) {
      if (
        node.type === "element" &&
        node.tagName === "code" &&
        node.properties?.className
      ) {
        const classes = node.properties.className as string[]
        node.properties.className = classes.map((cls: string) => {
          if (!cls.startsWith("language-") || !cls.includes(".")) return cls
          const lang = cls.replace("language-", "")
          const ext = lang.split(".").pop()?.toLowerCase()
          if (ext && EXTENSION_TO_LANG[ext]) {
            return `language-${EXTENSION_TO_LANG[ext]}`
          }
          return cls
        })
      }
      if (node.children && Array.isArray(node.children)) {
        for (const child of node.children) {
          visit(child)
        }
      }
    }
    visit(tree)
  }
}

/**
 * Markdown 原文を HTML に変換し、ToC データを抽出する
 *
 * unified の非同期パイプラインを使用し、rehype-pretty-code の
 * 非同期処理（Shiki テーマ読み込み）に対応する。
 *
 * @param markdownBody - Markdown 原文（空でない文字列）
 * @returns content（レンダリング済み React Node）と tocItems（見出し一覧）
 */
export async function renderMarkdown(
  markdownBody: string
): Promise<MarkdownRenderResult> {
  // ToC データを独立に抽出
  const tocItems = extractTocItems(markdownBody)

  // unified 非同期パイプラインで Markdown → HTML 変換
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHeadingIds(tocItems))
    .use(rehypeNormalizeCodeLanguage)
    .use(rehypePrettyCode, {
      theme: "github-dark",
      keepBackground: true,
      defaultLang: "text",
    })
    .use(rehypeStringify)
    .process(markdownBody)

  const html = String(result)

  const content = React.createElement("div", {
    className: "prose-contents",
    dangerouslySetInnerHTML: { __html: html },
  })

  return {
    content,
    tocItems,
  }
}
