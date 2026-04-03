import Link from "next/link"

interface BreadcrumbItem {
  label: string
  href: string
}

interface ContentBreadcrumbProps {
  items: BreadcrumbItem[]
  currentLabel: string
}

/**
 * パンくずリスト（Server Component）
 *
 * 教材 / チュートリアル名 / チャプター名 / セクション名
 * 各階層がリンクとして機能する。
 */
export function ContentBreadcrumb({
  items,
  currentLabel,
}: ContentBreadcrumbProps) {
  return (
    <nav
      aria-label="パンくずリスト"
      className="px-4 py-4 sm:px-6 md:px-8 md:py-5"
    >
      <ol className="flex items-center font-mono text-[13px]">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center">
            <Link
              href={item.href}
              className="text-primary hover:underline"
            >
              {item.label}
            </Link>
            <span className="mx-1 text-muted-foreground">/</span>
          </li>
        ))}
        <li className="font-semibold text-foreground">{currentLabel}</li>
      </ol>
    </nav>
  )
}
