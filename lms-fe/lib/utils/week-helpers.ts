/**
 * Date をローカルタイムゾーンで "YYYY-MM-DD" にフォーマットする。
 * toISOString() は UTC 変換するため JST 環境で日付がずれる問題を回避する。
 */
export function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * 月の選択肢を生成するヘルパー（アカウント作成月〜今月+12ヶ月先）
 *
 * @param createdAt アカウント作成日（ISO 8601 文字列）
 */
export function generateAvailableMonths(
  createdAt: string
): Array<{ yearMonth: string; label: string }> {
  const months: Array<{ yearMonth: string; label: string }> = []
  const now = new Date()
  const start = new Date(createdAt)

  // 終了: 今月から12ヶ月先
  const futureEnd = new Date(now.getFullYear(), now.getMonth() + 12, 1)

  const startYear = start.getFullYear()
  const startMonth = start.getMonth()
  const endYear = futureEnd.getFullYear()
  const endMonth = futureEnd.getMonth()

  // 新しい月から古い月の順に生成
  for (let y = endYear; y >= startYear; y--) {
    const mStart = y === startYear ? startMonth : 0
    const mEnd = y === endYear ? endMonth : 11
    for (let m = mEnd; m >= mStart; m--) {
      const yearMonth = `${y}-${String(m + 1).padStart(2, "0")}`
      const label = `${y}年${m + 1}月`
      months.push({ yearMonth, label })
    }
  }

  return months
}

/**
 * 週の選択肢を生成するヘルパー（アカウント作成週〜今週+12週先）
 *
 * @param createdAt アカウント作成日（ISO 8601 文字列）
 */
export function generateAvailableWeeks(
  createdAt: string
): Array<{ startDate: string; endDate: string; label: string }> {
  const weeks: Array<{ startDate: string; endDate: string; label: string }> = []
  const now = new Date()

  // 今週の月曜日を取得
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const currentMonday = new Date(now)
  currentMonday.setDate(now.getDate() - diff)
  currentMonday.setHours(0, 0, 0, 0)

  // 終了: 今週から12週先
  const futureMonday = new Date(currentMonday)
  futureMonday.setDate(currentMonday.getDate() + 12 * 7)

  // 作成日が属する週の月曜日を取得
  const created = new Date(createdAt)
  const createdDow = created.getDay()
  const createdDiff = createdDow === 0 ? 6 : createdDow - 1
  const createdMonday = new Date(created)
  createdMonday.setDate(created.getDate() - createdDiff)
  createdMonday.setHours(0, 0, 0, 0)

  // 未来から作成週まで遡る
  const monday = new Date(futureMonday)
  while (monday >= createdMonday) {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const startDate = formatLocalDate(monday)
    const endDate = formatLocalDate(sunday)

    const label = `${monday.getMonth() + 1}/${monday.getDate()} - ${sunday.getMonth() + 1}/${sunday.getDate()}`

    weeks.push({ startDate, endDate, label })
    monday.setDate(monday.getDate() - 7)
  }

  return weeks
}
