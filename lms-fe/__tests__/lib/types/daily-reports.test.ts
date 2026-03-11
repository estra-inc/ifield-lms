import type {
  DailyReportEntry,
  DateGroup,
  ReportFeedItem,
  AdminReportRow,
  LearningMetrics,
} from "@/lib/types/daily-reports"

/**
 * フロントエンド用ドメイン型の検証テスト (Task 3.2)
 *
 * camelCase 命名のフロントエンド型が正しく定義されていることを検証する。
 */
describe("日報・学習目標フロントエンドドメイン型", () => {
  describe("DailyReportEntry", () => {
    it("必要なプロパティを持つオブジェクトを受け入れる", () => {
      const entry: DailyReportEntry = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        reportDate: "2026-02-27",
        actualHours: 2.5,
        content: "TypeScript の型システムについて学習した",
        likedByManager: false,
        createdAt: "2026-02-27T10:00:00Z",
      }

      expect(entry.id).toBe("550e8400-e29b-41d4-a716-446655440000")
      expect(entry.reportDate).toBe("2026-02-27")
      expect(entry.actualHours).toBe(2.5)
      expect(entry.content).toBe("TypeScript の型システムについて学習した")
      expect(entry.likedByManager).toBe(false)
      expect(entry.createdAt).toBe("2026-02-27T10:00:00Z")
    })

    it("likedByManager が true のエントリを表現できる", () => {
      const entry: DailyReportEntry = {
        id: "test-uuid",
        reportDate: "2026-02-26",
        actualHours: 1.0,
        content: "学習内容",
        likedByManager: true,
        createdAt: "2026-02-26T08:00:00Z",
      }

      expect(entry.likedByManager).toBe(true)
    })

    it("actualHours が 0.5 刻みの値を受け入れる", () => {
      const entry: DailyReportEntry = {
        id: "test-uuid",
        reportDate: "2026-02-27",
        actualHours: 3.5,
        content: "学習内容",
        likedByManager: false,
        createdAt: "2026-02-27T10:00:00Z",
      }

      expect(entry.actualHours).toBe(3.5)
    })
  })

  describe("DateGroup", () => {
    it("日付グループに必要なプロパティが含まれている", () => {
      const group: DateGroup = {
        date: "2026-02-27",
        dayOfWeek: "金",
        totalHours: 5.0,
        entries: [
          {
            id: "uuid-1",
            reportDate: "2026-02-27",
            actualHours: 2.5,
            content: "午前の学習",
            likedByManager: true,
            createdAt: "2026-02-27T10:00:00Z",
          },
          {
            id: "uuid-2",
            reportDate: "2026-02-27",
            actualHours: 2.5,
            content: "午後の学習",
            likedByManager: false,
            createdAt: "2026-02-27T15:00:00Z",
          },
        ],
      }

      expect(group.date).toBe("2026-02-27")
      expect(group.dayOfWeek).toBe("金")
      expect(group.totalHours).toBe(5.0)
      expect(group.entries).toHaveLength(2)
    })

    it("エントリが空のグループを受け入れる", () => {
      const group: DateGroup = {
        date: "2026-02-28",
        dayOfWeek: "土",
        totalHours: 0,
        entries: [],
      }

      expect(group.entries).toHaveLength(0)
      expect(group.totalHours).toBe(0)
    })
  })

  describe("ReportFeedItem", () => {
    it("Manager/Admin 向けフィードアイテムのプロパティが含まれている", () => {
      const item: ReportFeedItem = {
        id: "report-uuid",
        userId: "user-uuid",
        userName: "山田 太郎",
        avatarUrl: "https://example.com/avatar.png",
        reportDate: "2026-02-27",
        actualHours: 3.0,
        content: "React の Server Components を学習した",
        likedByManager: false,
      }

      expect(item.id).toBe("report-uuid")
      expect(item.userId).toBe("user-uuid")
      expect(item.userName).toBe("山田 太郎")
      expect(item.avatarUrl).toBe("https://example.com/avatar.png")
      expect(item.reportDate).toBe("2026-02-27")
      expect(item.actualHours).toBe(3.0)
      expect(item.content).toBe("React の Server Components を学習した")
      expect(item.likedByManager).toBe(false)
    })

    it("avatarUrl が null を許容する", () => {
      const item: ReportFeedItem = {
        id: "report-uuid",
        userId: "user-uuid",
        userName: "佐藤 花子",
        avatarUrl: null,
        reportDate: "2026-02-27",
        actualHours: 1.5,
        content: "学習内容",
        likedByManager: true,
      }

      expect(item.avatarUrl).toBeNull()
    })
  })

  describe("AdminReportRow", () => {
    it("管理テーブル行に必要なプロパティが含まれている", () => {
      const row: AdminReportRow = {
        id: "report-uuid",
        userName: "山田 太郎",
        avatarUrl: null,
        reportDate: "2026-02-27",
        actualHours: 2.0,
        content: "学習内容",
        likedByManager: true,
        monthlyProgress: {
          percentage: 75,
          color: "primary",
        },
      }

      expect(row.id).toBe("report-uuid")
      expect(row.userName).toBe("山田 太郎")
      expect(row.monthlyProgress).not.toBeNull()
      expect(row.monthlyProgress!.percentage).toBe(75)
      expect(row.monthlyProgress!.color).toBe("primary")
    })

    it("monthlyProgress が null のケースを受け入れる（目標未設定）", () => {
      const row: AdminReportRow = {
        id: "report-uuid",
        userName: "佐藤 花子",
        avatarUrl: null,
        reportDate: "2026-02-27",
        actualHours: 1.0,
        content: "学習内容",
        likedByManager: false,
        monthlyProgress: null,
      }

      expect(row.monthlyProgress).toBeNull()
    })

    it("月次進捗の色分けが 4 種類を受け入れる", () => {
      const colors = ["green", "primary", "yellow", "red"] as const
      for (const color of colors) {
        const row: AdminReportRow = {
          id: "report-uuid",
          userName: "テスト",
          avatarUrl: null,
          reportDate: "2026-02-27",
          actualHours: 1.0,
          content: "学習内容",
          likedByManager: false,
          monthlyProgress: { percentage: 50, color },
        }
        expect(row.monthlyProgress!.color).toBe(color)
      }
    })
  })

  describe("LearningMetrics", () => {
    it("学習進捗メトリクスの全プロパティが含まれている", () => {
      const metrics: LearningMetrics = {
        monthly: {
          actual: 25.5,
          target: 40,
          percentage: 63.75,
        },
        weekly: {
          actual: 8.0,
          target: 15,
          percentage: 53.33,
        },
        daily: {
          actual: 3.0,
        },
      }

      expect(metrics.monthly.actual).toBe(25.5)
      expect(metrics.monthly.target).toBe(40)
      expect(metrics.monthly.percentage).toBe(63.75)
      expect(metrics.weekly.actual).toBe(8.0)
      expect(metrics.weekly.target).toBe(15)
      expect(metrics.weekly.percentage).toBe(53.33)
      expect(metrics.daily.actual).toBe(3.0)
    })

    it("目標未設定時に target と percentage が null を受け入れる", () => {
      const metrics: LearningMetrics = {
        monthly: {
          actual: 10.0,
          target: null,
          percentage: null,
        },
        weekly: {
          actual: 3.0,
          target: null,
          percentage: null,
        },
        daily: {
          actual: 1.5,
        },
      }

      expect(metrics.monthly.target).toBeNull()
      expect(metrics.monthly.percentage).toBeNull()
      expect(metrics.weekly.target).toBeNull()
      expect(metrics.weekly.percentage).toBeNull()
    })

    it("月次目標のみ設定され週次目標が未設定のケースを表現できる", () => {
      const metrics: LearningMetrics = {
        monthly: {
          actual: 20.0,
          target: 40,
          percentage: 50,
        },
        weekly: {
          actual: 5.0,
          target: null,
          percentage: null,
        },
        daily: {
          actual: 2.0,
        },
      }

      expect(metrics.monthly.target).toBe(40)
      expect(metrics.weekly.target).toBeNull()
    })
  })
})
