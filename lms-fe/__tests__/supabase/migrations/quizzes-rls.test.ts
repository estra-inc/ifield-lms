import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * quizzes / quiz_logs テーブルの RLS ポリシー検証テスト
 *
 * Task 1.2: RLS ポリシーの設定
 * Requirements: 2.5, 2.6, 6.1, 6.2, 6.3, 6.4
 *
 * - quizzes テーブルに RLS を有効化し、User/Super Admin ロールのみ active の SELECT を許可
 * - Manager ロールにはポリシーを作成しない（デフォルト拒否）
 * - quiz_logs テーブルに RLS を有効化し、User は自身のレコードのみ SELECT/INSERT 可能
 * - Super Admin は quiz_logs の全レコード SELECT 可能
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** quizzes を含むマイグレーションファイルを検索 */
function findQuizzesMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir)
  const match = files.find((f) => f.includes("quizzes"))
  return match ? path.join(migrationsDir, match) : null
}

function readMigrationSQL(): string {
  const filePath = findQuizzesMigrationFile()
  if (!filePath) {
    throw new Error("quizzes マイグレーションファイルが見つかりません")
  }
  return readFileSync(filePath, "utf-8")
}

describe("quizzes / quiz_logs RLS ポリシー (Task 1.2)", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationSQL()
  })

  // ===========================================
  // quizzes テーブルの RLS (REQ-2.5, 6.1, 6.2)
  // ===========================================
  describe("quizzes テーブルの RLS 有効化 (REQ-2.5, 6.1)", () => {
    it("quizzes テーブルの RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?quizzes\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("quizzes テーブルに SELECT ポリシーが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+.*ON\s+(?:public\.)?quizzes\s+FOR\s+SELECT/i
      )
    })

    it("quizzes の SELECT ポリシーが authenticated ロールを対象としている", () => {
      const quizzesPolicies = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?quizzes[^;]*;/gis
      )
      expect(quizzesPolicies).not.toBeNull()
      const selectPolicy = quizzesPolicies!.find((p) => /FOR\s+SELECT/i.test(p))
      expect(selectPolicy).toBeDefined()
      expect(selectPolicy!).toMatch(/TO\s+authenticated/i)
    })

    it("quizzes の SELECT ポリシーが User ロールと Super Admin ロールを許可している", () => {
      const quizzesPolicies = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?quizzes[^;]*;/gis
      )
      expect(quizzesPolicies).not.toBeNull()
      // User/Super Admin を含むポリシーを確認
      const selectPolicies = quizzesPolicies!.filter((p) => /FOR\s+SELECT/i.test(p))
      expect(selectPolicies.length).toBeGreaterThan(0)
      // 少なくとも1つのポリシーが 'user' と 'super_admin' を IN リストに含む
      const hasUserSuperAdmin = selectPolicies.some(
        (p) => /profiles\.role\s+IN\s*\(\s*'user'\s*,\s*'super_admin'\s*\)/i.test(p)
      )
      expect(hasUserSuperAdmin).toBe(true)
    })

    it("quizzes の SELECT ポリシーが status = 'active' をフィルタしている", () => {
      const quizzesPolicies = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?quizzes[^;]*;/gis
      )
      expect(quizzesPolicies).not.toBeNull()
      const selectPolicies = quizzesPolicies!.filter((p) => /FOR\s+SELECT/i.test(p))
      // User/Super Admin のポリシーで active フィルタがある
      const hasActiveFilter = selectPolicies.some(
        (p) => /status\s*=\s*'active'/i.test(p)
      )
      expect(hasActiveFilter).toBe(true)
    })
  })

  describe("quizzes テーブルの Manager アクセス拒否 (REQ-6.2)", () => {
    it("quizzes テーブルに Manager ロール向けの SELECT ポリシーが作成されていない", () => {
      const quizzesPolicies = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?quizzes[^;]*;/gis
      )
      if (quizzesPolicies) {
        for (const block of quizzesPolicies) {
          // Manager ロールを明示的に含むポリシーがないこと
          expect(block).not.toMatch(/profiles\.role\s*=\s*'manager'/i)
          // IN リスト内に 'manager' が含まれないこと
          const roleInList = block.match(/profiles\.role\s+IN\s*\([^)]+\)/i)
          if (roleInList) {
            expect(roleInList[0]).not.toMatch(/'manager'/i)
          }
        }
      }
    })
  })

  // ===========================================
  // quiz_logs テーブルの RLS (REQ-2.6, 6.3, 6.4)
  // ===========================================
  describe("quiz_logs テーブルの RLS 有効化 (REQ-2.6)", () => {
    it("quiz_logs テーブルの RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?quiz_logs\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })
  })

  describe("quiz_logs の User SELECT ポリシー (REQ-6.3)", () => {
    it("quiz_logs テーブルに SELECT ポリシーが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+.*ON\s+(?:public\.)?quiz_logs\s+FOR\s+SELECT/i
      )
    })

    it("quiz_logs の SELECT ポリシーに user_id = auth.uid() の制限がある", () => {
      const logsPolicies = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?quiz_logs[^;]*;/gis
      )
      expect(logsPolicies).not.toBeNull()
      const selectPolicies = logsPolicies!.filter((p) => /FOR\s+SELECT/i.test(p))
      expect(selectPolicies.length).toBeGreaterThan(0)
      // 少なくとも1つに user_id = auth.uid() がある
      const hasUidCheck = selectPolicies.some(
        (p) => /user_id\s*=\s*auth\.uid\(\)/i.test(p)
      )
      expect(hasUidCheck).toBe(true)
    })
  })

  describe("quiz_logs の User INSERT ポリシー (REQ-6.3)", () => {
    it("quiz_logs テーブルに INSERT ポリシーが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+.*ON\s+(?:public\.)?quiz_logs\s+FOR\s+INSERT/i
      )
    })

    it("quiz_logs の INSERT ポリシーに user_id = auth.uid() のチェックがある", () => {
      const logsPolicies = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?quiz_logs[^;]*;/gis
      )
      expect(logsPolicies).not.toBeNull()
      const insertPolicies = logsPolicies!.filter((p) => /FOR\s+INSERT/i.test(p))
      expect(insertPolicies.length).toBeGreaterThan(0)
      const hasUidCheck = insertPolicies.some(
        (p) => /user_id\s*=\s*auth\.uid\(\)/i.test(p)
      )
      expect(hasUidCheck).toBe(true)
    })
  })

  describe("quiz_logs の Super Admin SELECT ポリシー (REQ-6.4)", () => {
    it("Super Admin が quiz_logs の全レコードを SELECT できるポリシーが作成されている", () => {
      const logsPolicies = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?quiz_logs[^;]*;/gis
      )
      expect(logsPolicies).not.toBeNull()
      const selectPolicies = logsPolicies!.filter((p) => /FOR\s+SELECT/i.test(p))
      // Super Admin 用のポリシーが存在する
      const hasSuperAdmin = selectPolicies.some(
        (p) => /profiles\.role\s*=\s*'super_admin'/i.test(p)
      )
      expect(hasSuperAdmin).toBe(true)
    })
  })

  // ===========================================
  // 操作の順序の整合性
  // ===========================================
  describe("操作の順序", () => {
    it("quizzes テーブルの RLS 有効化がポリシー作成より前に記述されている", () => {
      const rlsEnablePos = sql.search(
        /ALTER\s+TABLE\s+(?:public\.)?quizzes\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
      const firstPolicyPos = sql.search(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?quizzes/i
      )
      if (rlsEnablePos >= 0 && firstPolicyPos >= 0) {
        expect(rlsEnablePos).toBeLessThan(firstPolicyPos)
      }
    })

    it("quiz_logs テーブルの RLS 有効化がポリシー作成より前に記述されている", () => {
      const rlsEnablePos = sql.search(
        /ALTER\s+TABLE\s+(?:public\.)?quiz_logs\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
      const firstPolicyPos = sql.search(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?quiz_logs/i
      )
      if (rlsEnablePos >= 0 && firstPolicyPos >= 0) {
        expect(rlsEnablePos).toBeLessThan(firstPolicyPos)
      }
    })
  })
})
