import type { Database } from "@/lib/types/database"

/**
 * daily_reports / monthly_goals / weekly_goals テーブルの
 * Database 型定義検証テスト (Task 3.1)
 */
describe("Database 型定義: 日報・学習目標テーブル", () => {
  describe("daily_reports テーブルの型定義", () => {
    it("daily_reports テーブルの Row 型に必要なカラムが含まれている", () => {
      const row: Database["public"]["Tables"]["daily_reports"]["Row"] = {
        id: "test-uuid",
        user_id: "user-uuid",
        report_date: "2026-02-27",
        actual_hours: 2.5,
        content: "TypeScript の型システムについて学習した",
        liked_by_manager: false,
        created_at: "2026-02-27T10:00:00Z",
        updated_at: "2026-02-27T10:00:00Z",
      }

      expect(row.id).toBe("test-uuid")
      expect(row.user_id).toBe("user-uuid")
      expect(row.report_date).toBe("2026-02-27")
      expect(row.actual_hours).toBe(2.5)
      expect(row.content).toBe("TypeScript の型システムについて学習した")
      expect(row.liked_by_manager).toBe(false)
      expect(row.created_at).toBe("2026-02-27T10:00:00Z")
      expect(row.updated_at).toBe("2026-02-27T10:00:00Z")
    })

    it("daily_reports テーブルの Insert 型で id, liked_by_manager, created_at, updated_at が任意である", () => {
      const insert: Database["public"]["Tables"]["daily_reports"]["Insert"] = {
        user_id: "user-uuid",
        report_date: "2026-02-27",
        actual_hours: 1.5,
        content: "学習内容",
      }

      expect(insert.user_id).toBe("user-uuid")
      expect(insert.id).toBeUndefined()
      expect(insert.liked_by_manager).toBeUndefined()
      expect(insert.created_at).toBeUndefined()
      expect(insert.updated_at).toBeUndefined()
    })

    it("daily_reports テーブルの Insert 型で liked_by_manager を明示的に指定できる", () => {
      const insert: Database["public"]["Tables"]["daily_reports"]["Insert"] = {
        user_id: "user-uuid",
        report_date: "2026-02-27",
        actual_hours: 1.0,
        content: "学習内容",
        liked_by_manager: true,
      }

      expect(insert.liked_by_manager).toBe(true)
    })

    it("daily_reports テーブルの Update 型で全フィールドが任意である", () => {
      const update: Database["public"]["Tables"]["daily_reports"]["Update"] = {
        liked_by_manager: true,
      }

      expect(update.liked_by_manager).toBe(true)
      expect(update.actual_hours).toBeUndefined()
    })

    it("daily_reports テーブルの Update 型で actual_hours のみを更新できる", () => {
      const update: Database["public"]["Tables"]["daily_reports"]["Update"] = {
        actual_hours: 3.0,
      }

      expect(update.actual_hours).toBe(3.0)
    })

    it("daily_reports テーブルの Relationships に profiles テーブルへの外部キーが含まれている", () => {
      // 型レベルのテスト: Relationships 配列の構造を検証
      type DailyReportsRelationships =
        Database["public"]["Tables"]["daily_reports"]["Relationships"]
      type FirstRelationship = DailyReportsRelationships[0]

      // foreignKeyName が正しいことを型で検証
      const relationship: FirstRelationship = {
        foreignKeyName: "daily_reports_user_id_fkey",
        columns: ["user_id"],
        referencedRelation: "profiles",
        referencedColumns: ["id"],
      }

      expect(relationship.foreignKeyName).toBe("daily_reports_user_id_fkey")
      expect(relationship.columns).toEqual(["user_id"])
      expect(relationship.referencedRelation).toBe("profiles")
      expect(relationship.referencedColumns).toEqual(["id"])
    })
  })

  describe("monthly_goals テーブルの型定義", () => {
    it("monthly_goals テーブルの Row 型に必要なカラムが含まれている", () => {
      const row: Database["public"]["Tables"]["monthly_goals"]["Row"] = {
        id: "test-uuid",
        user_id: "user-uuid",
        year_month: "2026-02",
        target_hours: 40,
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      }

      expect(row.id).toBe("test-uuid")
      expect(row.user_id).toBe("user-uuid")
      expect(row.year_month).toBe("2026-02")
      expect(row.target_hours).toBe(40)
    })

    it("monthly_goals テーブルの Insert 型で id, created_at, updated_at が任意である", () => {
      const insert: Database["public"]["Tables"]["monthly_goals"]["Insert"] = {
        user_id: "user-uuid",
        year_month: "2026-03",
        target_hours: 50,
      }

      expect(insert.user_id).toBe("user-uuid")
      expect(insert.id).toBeUndefined()
      expect(insert.created_at).toBeUndefined()
    })

    it("monthly_goals テーブルの Update 型で全フィールドが任意である", () => {
      const update: Database["public"]["Tables"]["monthly_goals"]["Update"] = {
        target_hours: 60,
      }

      expect(update.target_hours).toBe(60)
      expect(update.user_id).toBeUndefined()
    })

    it("monthly_goals テーブルの Relationships に profiles テーブルへの外部キーが含まれている", () => {
      type MonthlyGoalsRelationships =
        Database["public"]["Tables"]["monthly_goals"]["Relationships"]
      type FirstRelationship = MonthlyGoalsRelationships[0]

      const relationship: FirstRelationship = {
        foreignKeyName: "monthly_goals_user_id_fkey",
        columns: ["user_id"],
        referencedRelation: "profiles",
        referencedColumns: ["id"],
      }

      expect(relationship.foreignKeyName).toBe("monthly_goals_user_id_fkey")
      expect(relationship.referencedRelation).toBe("profiles")
    })
  })

  describe("weekly_goals テーブルの型定義", () => {
    it("weekly_goals テーブルの Row 型に必要なカラムが含まれている", () => {
      const row: Database["public"]["Tables"]["weekly_goals"]["Row"] = {
        id: "test-uuid",
        user_id: "user-uuid",
        start_date: "2026-02-24",
        end_date: "2026-03-02",
        target_hours: 20,
        created_at: "2026-02-24T00:00:00Z",
        updated_at: "2026-02-24T00:00:00Z",
      }

      expect(row.id).toBe("test-uuid")
      expect(row.user_id).toBe("user-uuid")
      expect(row.start_date).toBe("2026-02-24")
      expect(row.end_date).toBe("2026-03-02")
      expect(row.target_hours).toBe(20)
    })

    it("weekly_goals テーブルの Insert 型で id, created_at, updated_at が任意である", () => {
      const insert: Database["public"]["Tables"]["weekly_goals"]["Insert"] = {
        user_id: "user-uuid",
        start_date: "2026-02-24",
        end_date: "2026-03-02",
        target_hours: 15,
      }

      expect(insert.user_id).toBe("user-uuid")
      expect(insert.id).toBeUndefined()
      expect(insert.created_at).toBeUndefined()
    })

    it("weekly_goals テーブルの Update 型で全フィールドが任意である", () => {
      const update: Database["public"]["Tables"]["weekly_goals"]["Update"] = {
        target_hours: 25,
      }

      expect(update.target_hours).toBe(25)
      expect(update.start_date).toBeUndefined()
    })

    it("weekly_goals テーブルの Relationships に profiles テーブルへの外部キーが含まれている", () => {
      type WeeklyGoalsRelationships =
        Database["public"]["Tables"]["weekly_goals"]["Relationships"]
      type FirstRelationship = WeeklyGoalsRelationships[0]

      const relationship: FirstRelationship = {
        foreignKeyName: "weekly_goals_user_id_fkey",
        columns: ["user_id"],
        referencedRelation: "profiles",
        referencedColumns: ["id"],
      }

      expect(relationship.foreignKeyName).toBe("weekly_goals_user_id_fkey")
      expect(relationship.referencedRelation).toBe("profiles")
    })
  })
})
