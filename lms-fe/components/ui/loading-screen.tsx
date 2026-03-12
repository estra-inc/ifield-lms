import Image from "next/image"

/**
 * ロゴ + ドットアニメーションのローディングインジケーター。
 * size="sm" でタブ内やオーバーレイ向けコンパクト表示。
 * size="lg"（デフォルト）でページ全体向け表示。
 */
export function LoadingIndicator({ size = "lg" }: { size?: "sm" | "lg" }) {
  const logoSize = size === "sm" ? 36 : 56
  const gapClass = size === "sm" ? "gap-4" : "gap-6"
  const dotSize = size === "sm" ? "size-1" : "size-1.5"

  return (
    <div className={`flex flex-col items-center ${gapClass}`}>
      <div className="animate-loading-breathe">
        <Image
          src="/ifield-logo_min.svg"
          alt="i-field"
          width={logoSize}
          height={logoSize}
          priority
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`${dotSize} rounded-full bg-muted-foreground/40 animate-loading-dot [animation-delay:0ms]`} />
        <span className={`${dotSize} rounded-full bg-muted-foreground/40 animate-loading-dot [animation-delay:150ms]`} />
        <span className={`${dotSize} rounded-full bg-muted-foreground/40 animate-loading-dot [animation-delay:300ms]`} />
      </div>
    </div>
  )
}

export function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingIndicator />
    </div>
  )
}
