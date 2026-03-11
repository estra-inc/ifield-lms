"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Bold,
  Italic,
  Heading2,
  List,
  Code,
  FileCode,
  Link,
  ImagePlus,
  Video,
  Loader2,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i

function isVideoUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname
    return VIDEO_EXTENSIONS.test(pathname)
  } catch {
    return VIDEO_EXTENSIONS.test(url)
  }
}

export interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  "aria-label"?: string
  onUpload?: (file: File) => Promise<string | null>
  defaultMode?: "edit" | "preview"
  onModeChange?: (mode: "edit" | "preview") => void
}

type ToolbarAction = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  apply: (text: string, start: number, end: number) => { newText: string; cursorStart: number; cursorEnd: number }
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    icon: Bold,
    label: "太字",
    apply: (text, start, end) => {
      const selected = text.slice(start, end)
      const replacement = selected ? `**${selected}**` : "**テキスト**"
      const newText = text.slice(0, start) + replacement + text.slice(end)
      if (selected) {
        return { newText, cursorStart: start + 2, cursorEnd: start + 2 + selected.length }
      }
      return { newText, cursorStart: start + 2, cursorEnd: start + 2 + "テキスト".length }
    },
  },
  {
    icon: Italic,
    label: "斜体",
    apply: (text, start, end) => {
      const selected = text.slice(start, end)
      const replacement = selected ? `*${selected}*` : "*テキスト*"
      const newText = text.slice(0, start) + replacement + text.slice(end)
      if (selected) {
        return { newText, cursorStart: start + 1, cursorEnd: start + 1 + selected.length }
      }
      return { newText, cursorStart: start + 1, cursorEnd: start + 1 + "テキスト".length }
    },
  },
  {
    icon: Heading2,
    label: "見出し",
    apply: (text, start, end) => {
      const selected = text.slice(start, end)
      const replacement = selected ? `## ${selected}` : "## 見出し"
      const newText = text.slice(0, start) + replacement + text.slice(end)
      if (selected) {
        return { newText, cursorStart: start + 3, cursorEnd: start + 3 + selected.length }
      }
      return { newText, cursorStart: start + 3, cursorEnd: start + 3 + "見出し".length }
    },
  },
  {
    icon: List,
    label: "箇条書き",
    apply: (text, start, end) => {
      const selected = text.slice(start, end)
      const replacement = selected ? `- ${selected}` : "- "
      const newText = text.slice(0, start) + replacement + text.slice(end)
      if (selected) {
        return { newText, cursorStart: start + 2, cursorEnd: start + 2 + selected.length }
      }
      return { newText, cursorStart: start + 2, cursorEnd: start + 2 }
    },
  },
  {
    icon: Code,
    label: "コード",
    apply: (text, start, end) => {
      const selected = text.slice(start, end)
      const replacement = selected ? `\`${selected}\`` : "`コード`"
      const newText = text.slice(0, start) + replacement + text.slice(end)
      if (selected) {
        return { newText, cursorStart: start + 1, cursorEnd: start + 1 + selected.length }
      }
      return { newText, cursorStart: start + 1, cursorEnd: start + 1 + "コード".length }
    },
  },
  {
    icon: FileCode,
    label: "コードブロック",
    apply: (text, start, end) => {
      const selected = text.slice(start, end)
      const replacement = selected ? `\`\`\`\n${selected}\n\`\`\`` : "```\n\n```"
      const newText = text.slice(0, start) + replacement + text.slice(end)
      if (selected) {
        return { newText, cursorStart: start + 4, cursorEnd: start + 4 + selected.length }
      }
      // カーソルを ``` と ``` の間に配置
      return { newText, cursorStart: start + 4, cursorEnd: start + 4 }
    },
  },
  {
    icon: Link,
    label: "リンク",
    apply: (text, start, end) => {
      const selected = text.slice(start, end)
      const replacement = selected ? `[${selected}](url)` : "[テキスト](url)"
      const newText = text.slice(0, start) + replacement + text.slice(end)
      if (selected) {
        // url 部分を選択
        const urlStart = start + selected.length + 3
        return { newText, cursorStart: urlStart, cursorEnd: urlStart + 3 }
      }
      return { newText, cursorStart: start + 1, cursorEnd: start + 1 + "テキスト".length }
    },
  },
]

/**
 * コードブロック（Shiki syntax highlight）
 */
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    import("shiki")
      .then(({ codeToHtml }) =>
        codeToHtml(code, {
          lang: language || "text",
          theme: "github-dark",
        }).catch(() =>
          codeToHtml(code, { lang: "text", theme: "github-dark" })
        )
      )
      .then((result) => {
        if (!cancelled) setHtml(result)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [code, language])

  if (!html) {
    return (
      <pre
        className="shiki"
        style={{ backgroundColor: "#24292e", color: "#e1e4e8" }}
      >
        <code>{code}</code>
      </pre>
    )
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  disabled,
  id,
  className,
  onUpload,
  defaultMode = "edit",
  onModeChange,
}: MarkdownEditorProps) {
  const [mode, setModeState] = useState<"edit" | "preview">(defaultMode)

  const setMode = useCallback(
    (newMode: "edit" | "preview") => {
      setModeState(newMode)
      onModeChange?.(newMode)
    },
    [onModeChange]
  )
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)

  const handleToolbarClick = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current
      if (!textarea || disabled) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const { newText, cursorStart, cursorEnd } = action.apply(value, start, end)

      onChange(newText)

      // カーソル位置を調整（次のイベントループで実行）
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(cursorStart, cursorEnd)
      })
    },
    [value, onChange, disabled]
  )

  const handleFileUpload = useCallback(
    async (file: File, type: "image" | "video") => {
      if (!onUpload || disabled) return

      setIsUploading(true)
      try {
        const url = await onUpload(file)
        if (url) {
          const textarea = textareaRef.current
          const cursorPos = textarea?.selectionStart ?? value.length
          const markdown =
            type === "image" ? `![画像](${url})` : `[動画](${url})`
          const newText =
            value.slice(0, cursorPos) + markdown + value.slice(cursorPos)
          onChange(newText)
        }
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload, disabled, value, onChange]
  )

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileUpload(file, "image")
      e.target.value = ""
    },
    [handleFileUpload]
  )

  const handleVideoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileUpload(file, "video")
      e.target.value = ""
    },
    [handleFileUpload]
  )

  return (
    <div className={cn("rounded-md border border-input", className)}>
      {/* タブ + ツールバー */}
      <div className="flex items-center gap-1 border-b border-input px-2 py-1">
        {/* タブ */}
        <button
          type="button"
          className={cn(
            "rounded px-2 py-1 font-mono text-xs transition-colors",
            mode === "edit"
              ? "bg-blue-100 font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setMode("edit")}
          disabled={disabled}
        >
          編集
        </button>
        <button
          type="button"
          className={cn(
            "rounded px-2 py-1 font-mono text-xs transition-colors",
            mode === "preview"
              ? "bg-blue-100 font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setMode("preview")}
          disabled={disabled}
        >
          プレビュー
        </button>

        {/* セパレーター */}
        <div className="mx-1 h-4 w-px bg-border" />

        {/* ツールバーボタン */}
        {mode === "edit" && (
          <>
            {TOOLBAR_ACTIONS.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => handleToolbarClick(action)}
                disabled={disabled}
                aria-label={action.label}
              >
                <action.icon className="size-3.5" />
              </Button>
            ))}

            {/* アップロードボタン（onUpload 指定時のみ表示） */}
            {onUpload && (
              <>
                <div className="mx-1 h-4 w-px bg-border" />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={disabled || isUploading}
                  aria-label="画像"
                >
                  {isUploading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="size-3.5" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={disabled || isUploading}
                  aria-label="動画"
                >
                  <Video className="size-3.5" />
                </Button>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  data-testid="image-file-input"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoChange}
                  data-testid="video-file-input"
                />
              </>
            )}
          </>
        )}
      </div>

      {/* エディタ / プレビュー */}
      {mode === "edit" ? (
        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-32 flex-1 resize-none rounded-none border-0 shadow-none focus-visible:ring-0"
        />
      ) : (
        <div className="min-h-32 flex-1 overflow-y-auto px-3 py-2" id={id}>
          {value.trim() ? (
            <div className="prose-contents prose-contents-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ node, children, ...props }: any) => {
                    const codeChild = node?.children?.[0]
                    if (
                      codeChild &&
                      codeChild.tagName === "code"
                    ) {
                      const classNames =
                        (codeChild.properties?.className as string[]) || []
                      const langClass = classNames.find((c: string) =>
                        c.startsWith("language-")
                      )
                      const lang = langClass?.replace("language-", "")

                      function getTextContent(n: any): string {
                        if (n.type === "text") return n.value || ""
                        return (n.children || [])
                          .map(getTextContent)
                          .join("")
                      }
                      const code = getTextContent(codeChild).replace(
                        /\n$/,
                        ""
                      )

                      return <CodeBlock code={code} language={lang} />
                    }
                    return <pre {...props}>{children}</pre>
                  },
                  a: ({ href, children, ...props }) => {
                    if (href && isVideoUrl(href)) {
                      return (
                        <video
                          src={href}
                          controls
                          className="my-2 max-w-[50%] rounded"
                        >
                          <track kind="captions" />
                        </video>
                      )
                    }
                    return (
                      <a href={href} {...props}>
                        {children}
                      </a>
                    )
                  },
                }}
              >
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="font-mono text-sm text-muted-foreground">
              プレビューするテキストがありません
            </p>
          )}
        </div>
      )}
    </div>
  )
}
