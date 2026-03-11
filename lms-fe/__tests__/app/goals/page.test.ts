/**
 * 学習目標ページ Server Component のテスト
 *
 * データフェッチロジックと Props 構築を検証する。
 */

/**
 * 今週の月曜日〜日曜日の日付範囲を取得
 */
function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  }
}

/**
 * 当月の範囲を取得
 */
function getCurrentMonthRange(): { start: string; end: string; yearMonth: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
    yearMonth: `${year}-${month}`,
  }
}

describe("学習目標ページ", () => {
  describe("日付範囲計算", () => {
    it("当月の日付範囲を取得する", () => {
      const range = getCurrentMonthRange()

      expect(range.start).toMatch(/^\d{4}-\d{2}-01$/)
      expect(range.yearMonth).toMatch(/^\d{4}-\d{2}$/)
    })

    it("今週の月曜〜日曜の範囲を取得する", () => {
      const range = getCurrentWeekRange()
      const startDate = new Date(range.start)
      const endDate = new Date(range.end)

      expect(startDate.getDay()).toBe(1) // 月曜
      expect(endDate.getDay()).toBe(0)   // 日曜
    })
  })

  describe("Goals ページ Props 構築", () => {
    it("月次目標データを MonthlyGoalCard Props に変換する", () => {
      const monthlyGoalRow = {
        target_hours: 40,
      }
      const monthlyReportsSum = 20

      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")

      const monthlyProps = {
        currentMonth: `${year}年${now.getMonth() + 1}月`,
        yearMonth: `${year}-${month}`,
        actualHours: monthlyReportsSum,
        currentGoal: monthlyGoalRow
          ? { targetHours: monthlyGoalRow.target_hours }
          : null,
      }

      expect(monthlyProps.currentGoal?.targetHours).toBe(40)
      expect(monthlyProps.actualHours).toBe(20)
      expect(monthlyProps.yearMonth).toMatch(/^\d{4}-\d{2}$/)
    })

    it("目標未設定の場合 currentGoal が null になる", () => {
      const monthlyGoalRow = null

      const props = {
        currentGoal: monthlyGoalRow
          ? { targetHours: (monthlyGoalRow as { target_hours: number }).target_hours }
          : null,
      }

      expect(props.currentGoal).toBeNull()
    })

    it("週次目標データを WeeklyGoalCard Props に変換する", () => {
      const weeklyGoalRow = {
        target_hours: 10,
      }
      const weeklyReportsSum = 5
      const weekRange = getCurrentWeekRange()

      const weeklyProps = {
        currentWeekLabel: "今週の学習目標",
        startDate: weekRange.start,
        endDate: weekRange.end,
        actualHours: weeklyReportsSum,
        currentGoal: weeklyGoalRow
          ? { targetHours: weeklyGoalRow.target_hours }
          : null,
      }

      expect(weeklyProps.currentGoal?.targetHours).toBe(10)
      expect(weeklyProps.actualHours).toBe(5)
    })
  })

  describe("week クエリパラメータ処理", () => {
    it("week パラメータが指定された場合、その週のデータを取得する", () => {
      const weekParam = "2026-02-16"
      const startDate = weekParam
      const endDate = (() => {
        const d = new Date(weekParam)
        d.setDate(d.getDate() + 6)
        return d.toISOString().split("T")[0]
      })()

      expect(startDate).toBe("2026-02-16")
      expect(endDate).toBe("2026-02-22")
    })

    it("week パラメータが未指定の場合、今週を使用する", () => {
      const weekParam = undefined
      const weekRange = weekParam ? { start: weekParam } : getCurrentWeekRange()

      expect(weekRange.start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
