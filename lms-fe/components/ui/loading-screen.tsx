import Image from "next/image"

export function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-loading-breathe">
          <Image
            src="/ifield-logo_min.svg"
            alt="i-field"
            width={56}
            height={56}
            priority
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-loading-dot [animation-delay:0ms]" />
          <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-loading-dot [animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-muted-foreground/40 animate-loading-dot [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
