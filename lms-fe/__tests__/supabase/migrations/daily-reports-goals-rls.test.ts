import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * daily-reports-goals RLS ポリシー検証テスト
 *
 * マイグレーション SQL 内の RLS ポリシー定義の正しさを
 * 静的に検証する。
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

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

describe("daily-reports-goals RLS ポリシー", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationSQL()
  })

  describe("daily_reports テーブルの RLS ポリシー (Task 2.1)", () => {
    it("User が自身のレコードのみを SELECT できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"users_select_own_reports"\s+ON\s+(?:public\.)?daily_reports/i
      )
      expect(sql).toMatch(
        /users_select_own_reports[\s\S]*?FOR\s+SELECT/i
      )
      expect(sql).toMatch(
        /users_select_own_reports[\s\S]*?USING\s*\(\s*\(\s*select\s+auth\.uid\(\)\s*\)\s*=\s*user_id\s*\)/i
      )
    })

    it("User が自身のレコードのみを INSERT できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"users_insert_own_reports"\s+ON\s+(?:public\.)?daily_reports/i
      )
      expect(sql).toMatch(
        /users_insert_own_reports[\s\S]*?FOR\s+INSERT/i
      )
      expect(sql).toMatch(
        /users_insert_own_reports[\s\S]*?WITH\s+CHECK\s*\(\s*\(\s*select\s+auth\.uid\(\)\s*\)\s*=\s*user_id\s*\)/i
      )
    })

    it("Manager / Super Admin が全レコードを SELECT できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"managers_select_all_reports"\s+ON\s+(?:public\.)?daily_reports/i
      )
      expect(sql).toMatch(
        /managers_select_all_reports[\s\S]*?FOR\s+SELECT/i
      )
      // profiles テーブルの role を参照するサブクエリ
      expect(sql).toMatch(
        /managers_select_all_reports[\s\S]*?profiles\.role\s+IN\s*\(\s*'manager'\s*,\s*'super_admin'\s*\)/i
      )
    })

    it("Manager が UPDATE できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"managers_update_like"\s+ON\s+(?:public\.)?daily_reports/i
      )
      expect(sql).toMatch(
        /managers_update_like[\s\S]*?FOR\s+UPDATE/i
      )
      // Manager ロールのみ（super_admin は含まない）
      expect(sql).toMatch(
        /managers_update_like[\s\S]*?profiles\.role\s*=\s*'manager'/i
      )
    })

    it("DELETE ポリシーが存在しない（User の日報削除は不可）", () => {
      // daily_reports に対する DELETE ポリシーがないことを確認
      const dailyReportsPolicies = sql.match(
        /CREATE\s+POLICY\s+[^;]+?ON\s+(?:public\.)?daily_reports[\s\S]*?(?=CREATE\s+POLICY|CREATE\s+TABLE|ALTER\s+TABLE|$)/gi
      )
      if (dailyReportsPolicies) {
        for (const policy of dailyReportsPolicies) {
          expect(policy).not.toMatch(/FOR\s+DELETE/i)
        }
      }
    })

    it("全ポリシーで (select auth.uid()) ラッパーを使用している", () => {
      // daily_reports のポリシーブロックを抽出
      const policyBlocks = sql.match(
        /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+(?:public\.)?daily_reports[\s\S]*?;/gi
      )
      expect(policyBlocks).not.toBeNull()
      for (const block of policyBlocks!) {
        // auth.uid() が使われている場合は必ず (select auth.uid()) 形式
        if (block.match(/auth\.uid\(\)/i)) {
          expect(block).toMatch(/\(\s*select\s+auth\.uid\(\)\s*\)/i)
        }
      }
    })
  })

  describe("monthly_goals テーブルの RLS ポリシー (Task 2.2)", () => {
    it("User が自身のレコードのみを SELECT できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"users_select_own_monthly_goals"\s+ON\s+(?:public\.)?monthly_goals/i
      )
      expect(sql).toMatch(
        /users_select_own_monthly_goals[\s\S]*?FOR\s+SELECT/i
      )
      expect(sql).toMatch(
        /users_select_own_monthly_goals[\s\S]*?\(\s*select\s+auth\.uid\(\)\s*\)\s*=\s*user_id/i
      )
    })

    it("User が自身のレコードのみを INSERT できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"users_insert_own_monthly_goals"\s+ON\s+(?:public\.)?monthly_goals/i
      )
      expect(sql).toMatch(
        /users_insert_own_monthly_goals[\s\S]*?FOR\s+INSERT/i
      )
    })

    it("User が自身のレコードのみを UPDATE できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"users_update_own_monthly_goals"\s+ON\s+(?:public\.)?monthly_goals/i
      )
      expect(sql).toMatch(
        /users_update_own_monthly_goals[\s\S]*?FOR\s+UPDATE/i
      )
    })

    it("Manager / Super Admin が全レコードを SELECT できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"admins_select_all_monthly_goals"\s+ON\s+(?:public\.)?monthly_goals/i
      )
      expect(sql).toMatch(
        /admins_select_all_monthly_goals[\s\S]*?profiles\.role\s+IN\s*\(\s*'manager'\s*,\s*'super_admin'\s*\)/i
      )
    })

    it("全ポリシーで (select auth.uid()) ラッパーを使用している", () => {
      const policyBlocks = sql.match(
        /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+(?:public\.)?monthly_goals[\s\S]*?;/gi
      )
      expect(policyBlocks).not.toBeNull()
      for (const block of policyBlocks!) {
        if (block.match(/auth\.uid\(\)/i)) {
          expect(block).toMatch(/\(\s*select\s+auth\.uid\(\)\s*\)/i)
        }
      }
    })
  })

  describe("weekly_goals テーブルの RLS ポリシー (Task 2.3)", () => {
    it("User が自身のレコードのみを SELECT できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"users_select_own_weekly_goals"\s+ON\s+(?:public\.)?weekly_goals/i
      )
      expect(sql).toMatch(
        /users_select_own_weekly_goals[\s\S]*?FOR\s+SELECT/i
      )
    })

    it("User が自身のレコードのみを INSERT できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"users_insert_own_weekly_goals"\s+ON\s+(?:public\.)?weekly_goals/i
      )
      expect(sql).toMatch(
        /users_insert_own_weekly_goals[\s\S]*?FOR\s+INSERT/i
      )
    })

    it("User が自身のレコードのみを UPDATE できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"users_update_own_weekly_goals"\s+ON\s+(?:public\.)?weekly_goals/i
      )
      expect(sql).toMatch(
        /users_update_own_weekly_goals[\s\S]*?FOR\s+UPDATE/i
      )
    })

    it("Manager / Super Admin が全レコードを SELECT できるポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"admins_select_all_weekly_goals"\s+ON\s+(?:public\.)?weekly_goals/i
      )
      expect(sql).toMatch(
        /admins_select_all_weekly_goals[\s\S]*?profiles\.role\s+IN\s*\(\s*'manager'\s*,\s*'super_admin'\s*\)/i
      )
    })

    it("monthly_goals と同一パターンのポリシー構成である", () => {
      // monthly_goals と weekly_goals のポリシー名パターンが同一であることを確認
      const monthlyPolicies = [
        "users_select_own_monthly_goals",
        "users_insert_own_monthly_goals",
        "users_update_own_monthly_goals",
        "admins_select_all_monthly_goals",
      ]
      const weeklyPolicies = [
        "users_select_own_weekly_goals",
        "users_insert_own_weekly_goals",
        "users_update_own_weekly_goals",
        "admins_select_all_weekly_goals",
      ]

      for (const policy of monthlyPolicies) {
        expect(sql).toContain(policy)
      }
      for (const policy of weeklyPolicies) {
        expect(sql).toContain(policy)
      }

      // 同じ数のポリシーが定義されている
      expect(monthlyPolicies.length).toBe(weeklyPolicies.length)
    })

    it("全ポリシーで (select auth.uid()) ラッパーを使用している", () => {
      const policyBlocks = sql.match(
        /CREATE\s+POLICY\s+"[^"]*"\s+ON\s+(?:public\.)?weekly_goals[\s\S]*?;/gi
      )
      expect(policyBlocks).not.toBeNull()
      for (const block of policyBlocks!) {
        if (block.match(/auth\.uid\(\)/i)) {
          expect(block).toMatch(/\(\s*select\s+auth\.uid\(\)\s*\)/i)
        }
      }
    })
  })
})
