import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * daily-reports-goals マイグレーション SQL のスキーマ検証テスト
 *
 * マイグレーションファイルの存在と、CREATE TABLE / RLS / INDEX 文の
 * 正しさを静的に検証する。
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** マイグレーションファイルの特定: daily_reports_goals を含むファイルを検索 */
function findMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir)
  const match = files.find((f) => f.includes("daily_reports_goals"))
  return match ? path.join(migrationsDir, match) : null
}

function readMigrationSQL(): string {
  const filePath = findMigrationFile()
  if (!filePath) {
    throw new Error(
      "daily_reports_goals マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("daily-reports-goals マイグレーション SQL", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationSQL()
  })

  describe("daily_reports テーブル (Task 1.1)", () => {
    it("daily_reports テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(/CREATE\s+TABLE\s+(?:public\.)?daily_reports\s*\(/i)
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      expect(sql).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("user_id カラムが NOT NULL で profiles テーブルを参照する外部キーを持つ", () => {
      expect(sql).toMatch(
        /user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+profiles\s*\(\s*id\s*\)/i
      )
    })

    it("user_id の外部キーに ON DELETE CASCADE が設定されている", () => {
      expect(sql).toMatch(
        /user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+profiles\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
      )
    })

    it("report_date カラムが DATE NOT NULL である", () => {
      expect(sql).toMatch(/report_date\s+DATE\s+NOT\s+NULL/i)
    })

    it("actual_hours カラムが NUMERIC(5,2) NOT NULL で CHECK (actual_hours > 0) を持つ", () => {
      expect(sql).toMatch(
        /actual_hours\s+NUMERIC\s*\(\s*5\s*,\s*2\s*\)\s+NOT\s+NULL/i
      )
      expect(sql).toMatch(/CHECK\s*\(\s*actual_hours\s*>\s*0\s*\)/i)
    })

    it("content カラムが TEXT NOT NULL で CHECK (content <> '') を持つ", () => {
      expect(sql).toMatch(/content\s+TEXT\s+NOT\s+NULL/i)
      expect(sql).toMatch(/CHECK\s*\(\s*content\s*<>\s*''\s*\)/i)
    })

    it("liked_by_manager カラムが BOOLEAN NOT NULL DEFAULT FALSE である", () => {
      expect(sql).toMatch(
        /liked_by_manager\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+FALSE/i
      )
    })

    it("created_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      expect(sql).toMatch(
        /created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })

    it("updated_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      expect(sql).toMatch(
        /updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })

    it("user_id のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_daily_reports_user_id\s+ON\s+(?:public\.)?daily_reports\s*\(\s*user_id\s*\)/i
      )
    })

    it("(user_id, report_date DESC) の複合インデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_daily_reports_user_date\s+ON\s+(?:public\.)?daily_reports\s*\(\s*user_id\s*,\s*report_date\s+DESC\s*\)/i
      )
    })

    it("RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?daily_reports\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })
  })

  describe("monthly_goals テーブル (Task 1.2)", () => {
    it("monthly_goals テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(/CREATE\s+TABLE\s+(?:public\.)?monthly_goals\s*\(/i)
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      // monthly_goals 内の id カラムを検証
      // CREATE TABLE monthly_goals 以降のブロックを抽出して確認
      const monthlyBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?monthly_goals\s*\([^;]+\)/is
      )
      expect(monthlyBlock).not.toBeNull()
      expect(monthlyBlock![0]).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("user_id カラムが NOT NULL で profiles を参照し ON DELETE CASCADE を持つ", () => {
      const monthlyBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?monthly_goals\s*\([^;]+\)/is
      )
      expect(monthlyBlock).not.toBeNull()
      expect(monthlyBlock![0]).toMatch(
        /user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+profiles\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
      )
    })

    it("year_month カラムが TEXT NOT NULL で正規表現チェックを持つ", () => {
      expect(sql).toMatch(/year_month\s+TEXT\s+NOT\s+NULL/i)
      expect(sql).toMatch(
        /CHECK\s*\(\s*year_month\s*~\s*'\^\\d\{4\}-\\d\{2\}\$'\s*\)/i
      )
    })

    it("target_hours カラムが NUMERIC(5,2) NOT NULL で CHECK (target_hours > 0) を持つ", () => {
      const monthlyBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?monthly_goals\s*\([^;]+\)/is
      )
      expect(monthlyBlock).not.toBeNull()
      expect(monthlyBlock![0]).toMatch(
        /target_hours\s+NUMERIC\s*\(\s*5\s*,\s*2\s*\)\s+NOT\s+NULL/i
      )
      expect(sql).toMatch(/CHECK\s*\(\s*target_hours\s*>\s*0\s*\)/i)
    })

    it("(user_id, year_month) の複合 UNIQUE 制約が設定されている", () => {
      expect(sql).toMatch(/UNIQUE\s*\(\s*user_id\s*,\s*year_month\s*\)/i)
    })

    it("user_id のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_monthly_goals_user_id\s+ON\s+(?:public\.)?monthly_goals\s*\(\s*user_id\s*\)/i
      )
    })

    it("RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?monthly_goals\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })
  })

  describe("weekly_goals テーブル (Task 1.3)", () => {
    it("weekly_goals テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(/CREATE\s+TABLE\s+(?:public\.)?weekly_goals\s*\(/i)
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      const weeklyBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?weekly_goals\s*\([^;]+\)/is
      )
      expect(weeklyBlock).not.toBeNull()
      expect(weeklyBlock![0]).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("user_id カラムが NOT NULL で profiles を参照し ON DELETE CASCADE を持つ", () => {
      const weeklyBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?weekly_goals\s*\([^;]+\)/is
      )
      expect(weeklyBlock).not.toBeNull()
      expect(weeklyBlock![0]).toMatch(
        /user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+profiles\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
      )
    })

    it("start_date カラムが DATE NOT NULL である", () => {
      const weeklyBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?weekly_goals\s*\([^;]+\)/is
      )
      expect(weeklyBlock).not.toBeNull()
      expect(weeklyBlock![0]).toMatch(/start_date\s+DATE\s+NOT\s+NULL/i)
    })

    it("end_date カラムが DATE NOT NULL である", () => {
      const weeklyBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?weekly_goals\s*\([^;]+\)/is
      )
      expect(weeklyBlock).not.toBeNull()
      expect(weeklyBlock![0]).toMatch(/end_date\s+DATE\s+NOT\s+NULL/i)
    })

    it("target_hours カラムが NUMERIC(5,2) NOT NULL で CHECK (target_hours > 0) を持つ", () => {
      const weeklyBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?weekly_goals\s*\([^;]+\)/is
      )
      expect(weeklyBlock).not.toBeNull()
      expect(weeklyBlock![0]).toMatch(
        /target_hours\s+NUMERIC\s*\(\s*5\s*,\s*2\s*\)\s+NOT\s+NULL/i
      )
    })

    it("(user_id, start_date) の複合 UNIQUE 制約が設定されている", () => {
      expect(sql).toMatch(/UNIQUE\s*\(\s*user_id\s*,\s*start_date\s*\)/i)
    })

    it("CHECK (end_date > start_date) の制約が設定されている", () => {
      expect(sql).toMatch(/CHECK\s*\(\s*end_date\s*>\s*start_date\s*\)/i)
    })

    it("user_id のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_weekly_goals_user_id\s+ON\s+(?:public\.)?weekly_goals\s*\(\s*user_id\s*\)/i
      )
    })

    it("RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?weekly_goals\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })
  })
})
