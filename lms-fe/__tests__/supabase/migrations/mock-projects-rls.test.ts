import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * mock_projects 関連テーブルの RLS ポリシー検証テスト
 *
 * Task 1.2: 全4テーブルへの RLS 有効化と適切なポリシー設定
 * Requirements: 8.2, 8.3, 8.5
 *
 * マイグレーションファイル内の RLS 関連 SQL 文を静的に検証する。
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** mock_projects を含むマイグレーションファイルを検索 */
function findMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir)
  const match = files.find((f) => f.includes("mock_projects"))
  return match ? path.join(migrationsDir, match) : null
}

function readMigrationSQL(): string {
  const filePath = findMigrationFile()
  if (!filePath) {
    throw new Error(
      "mock_projects マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("mock_projects 関連テーブル RLS ポリシー (Task 1.2)", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationSQL()
  })

  // ===========================================
  // RLS 有効化
  // ===========================================
  describe("RLS 有効化", () => {
    it("mock_projects テーブルの RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?mock_projects\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("project_assignments テーブルの RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?project_assignments\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("project_submissions テーブルの RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?project_submissions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("project_tasks テーブルの RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?project_tasks\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })
  })

  // ===========================================
  // mock_projects RLS ポリシー
  // ===========================================
  describe("mock_projects RLS ポリシー", () => {
    it("認証ユーザーが active 案件を閲覧可能なポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+[\s\S]*?ON\s+(?:public\.)?mock_projects[\s\S]*?FOR\s+SELECT/i
      )
      // active 案件の条件
      expect(sql).toMatch(/status\s*=\s*'active'/i)
    })

    it("archived 案件は着手済みの場合のみ閲覧可能な条件が含まれている", () => {
      // project_assignments との結合による着手済みチェック
      expect(sql).toMatch(
        /EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+(?:public\.)?project_assignments/i
      )
    })

    it("Manager ロールのアクセスをブロックするポリシーが存在する", () => {
      // Manager ブロックの条件（RESTRICTIVE または role チェック）
      expect(sql).toMatch(/manager/i)
      // profiles テーブルでのロール確認
      expect(sql).toMatch(
        /profiles[\s\S]*?role[\s\S]*?=[\s\S]*?'manager'/i
      )
    })
  })

  // ===========================================
  // project_assignments RLS ポリシー
  // ===========================================
  describe("project_assignments RLS ポリシー", () => {
    it("ユーザーが自身の assignment のみ SELECT 可能なポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+[\s\S]*?ON\s+(?:public\.)?project_assignments[\s\S]*?FOR\s+SELECT/i
      )
      expect(sql).toMatch(/user_id\s*=\s*auth\.uid\(\)/i)
    })

    it("ユーザーが自身の assignment のみ INSERT 可能なポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+[\s\S]*?ON\s+(?:public\.)?project_assignments[\s\S]*?FOR\s+INSERT/i
      )
    })
  })

  // ===========================================
  // project_submissions RLS ポリシー
  // ===========================================
  describe("project_submissions RLS ポリシー", () => {
    it("ユーザーが自身の assignment に紐づく submission のみ SELECT 可能なポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+[\s\S]*?ON\s+(?:public\.)?project_submissions[\s\S]*?FOR\s+SELECT/i
      )
    })

    it("ユーザーが自身の assignment に紐づく submission のみ INSERT 可能なポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+[\s\S]*?ON\s+(?:public\.)?project_submissions[\s\S]*?FOR\s+INSERT/i
      )
    })
  })

  // ===========================================
  // project_tasks RLS ポリシー
  // ===========================================
  describe("project_tasks RLS ポリシー", () => {
    it("ユーザーが自身の assignment に紐づくタスクの SELECT ポリシーが存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+[\s\S]*?ON\s+(?:public\.)?project_tasks[\s\S]*?FOR\s+SELECT/i
      )
    })

    it("ユーザーが自身の assignment に紐づくタスクの ALL または個別 CRUD ポリシーが存在する", () => {
      // FOR ALL または FOR INSERT/UPDATE/DELETE のいずれかのポリシー
      const hasAllPolicy = sql.match(
        /CREATE\s+POLICY\s+[\s\S]*?ON\s+(?:public\.)?project_tasks[\s\S]*?FOR\s+ALL/i
      )
      const hasInsertPolicy = sql.match(
        /CREATE\s+POLICY\s+[\s\S]*?ON\s+(?:public\.)?project_tasks[\s\S]*?FOR\s+INSERT/i
      )
      expect(hasAllPolicy || hasInsertPolicy).toBeTruthy()
    })
  })
})
