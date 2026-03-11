import { redirect } from "next/navigation"

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>
}

/**
 * /manager/reports/table → /manager/reports にリダイレクト
 * （既存リンクの互換性維持用）
 */
export default async function AdminReportTableRedirect({ searchParams }: PageProps) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value)
  }
  const query = qs.toString()
  redirect(`/manager/reports${query ? `?${query}` : ""}`)
}
