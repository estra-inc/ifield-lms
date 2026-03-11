import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * mock_projects 関連テーブルのマイグレーション SQL スキーマ検証テスト
 *
 * Task 1.1: mock_projects, project_assignments, project_submissions, project_tasks テーブルの作成
 * Requirements: 1.1, 1.2, 1.3, 7.2, 9.1, 9.2, 11.1, 11.3
 *
 * マイグレーションファイルの存在と、CREATE TABLE / INDEX / CONSTRAINT 文の
 * 正しさを静的に検証する。
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** マイグレーションファイルの特定: mock_projects を含むファイルを検索 */
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

describe("mock_projects 関連テーブル マイグレーション SQL (Task 1.1)", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationSQL()
  })

  describe("マイグレーションファイルの存在と形式", () => {
    it("mock_projects を含むマイグレーションファイルが存在する", () => {
      const filePath = findMigrationFile()
      expect(filePath).not.toBeNull()
    })

    it("マイグレーションファイル名が YYYYMMDDHHMMSS_description.sql 形式である", () => {
      const filePath = findMigrationFile()
      expect(filePath).not.toBeNull()
      const fileName = path.basename(filePath!)
      expect(fileName).toMatch(/^\d{14}_.*\.sql$/)
    })
  })

  // ===========================================
  // mock_projects テーブル
  // ===========================================
  describe("mock_projects テーブル", () => {
    it("mock_projects テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(/CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\(/i)
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("slug カラムが TEXT NOT NULL UNIQUE である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/slug\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i)
    })

    it("title カラムが TEXT NOT NULL である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/title\s+TEXT\s+NOT\s+NULL/i)
    })

    it("description カラムが TEXT である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/description\s+TEXT/i)
    })

    it("requirements カラムが TEXT である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/\brequirements\s+TEXT/i)
    })

    it("evaluation_items カラムが JSONB で DEFAULT '[]'::JSONB である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/evaluation_items\s+JSONB/i)
      expect(block![0]).toMatch(/DEFAULT\s+'\[\]'::JSONB/i)
    })

    it("genre カラムが TEXT NOT NULL で engineering/design の CHECK 制約を持つ", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/genre\s+TEXT\s+NOT\s+NULL/i)
      expect(block![0]).toMatch(/CHECK\s*\(\s*genre\s+IN\s*\(\s*'engineering'\s*,\s*'design'\s*\)\s*\)/i)
    })

    it("order カラムが INTEGER NOT NULL DEFAULT 0 である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/"order"\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i)
    })

    it("status カラムが TEXT NOT NULL DEFAULT 'active' で active/archived の CHECK 制約を持つ", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'active'/i)
      expect(block![0]).toMatch(/CHECK\s*\(\s*status\s+IN\s*\(\s*'active'\s*,\s*'archived'\s*\)\s*\)/i)
    })

    it("version_id カラムが UUID NOT NULL で content_versions(id) への外部キーを持つ", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /version_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+(?:public\.)?content_versions\s*\(\s*id\s*\)/i
      )
    })

    it("created_at と updated_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?mock_projects\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
      expect(block![0]).toMatch(
        /updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })
  })

  // ===========================================
  // mock_projects インデックス
  // ===========================================
  describe("mock_projects インデックス", () => {
    it("genre のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_mock_projects_genre\s+ON\s+(?:public\.)?mock_projects\s*\(\s*genre\s*\)/i
      )
    })

    it("(status, order) のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_mock_projects_status_order\s+ON\s+(?:public\.)?mock_projects\s*\(\s*status\s*,\s*"order"\s*\)/i
      )
    })

    it("version_id のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_mock_projects_version_id\s+ON\s+(?:public\.)?mock_projects\s*\(\s*version_id\s*\)/i
      )
    })
  })

  // ===========================================
  // project_assignments テーブル
  // ===========================================
  describe("project_assignments テーブル", () => {
    it("project_assignments テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(/CREATE\s+TABLE\s+(?:public\.)?project_assignments\s*\(/i)
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_assignments\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("user_id カラムが UUID NOT NULL で profiles(id) への外部キー (ON DELETE CASCADE) を持つ", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_assignments\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+(?:public\.)?profiles\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
      )
    })

    it("project_id カラムが UUID NOT NULL で mock_projects(id) への外部キー (ON DELETE CASCADE) を持つ", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_assignments\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /project_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+(?:public\.)?mock_projects\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
      )
    })

    it("status カラムが TEXT NOT NULL DEFAULT 'started' で started のみの CHECK 制約を持つ", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_assignments\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'started'/i
      )
      expect(block![0]).toMatch(
        /CHECK\s*\(\s*status\s+IN\s*\(\s*'started'\s*\)\s*\)/i
      )
    })

    it("(user_id, project_id) のユニーク制約が存在する", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_assignments\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /UNIQUE\s*\(\s*user_id\s*,\s*project_id\s*\)/i
      )
    })

    it("created_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_assignments\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })
  })

  // ===========================================
  // project_assignments インデックス
  // ===========================================
  describe("project_assignments インデックス", () => {
    it("user_id のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_project_assignments_user_id\s+ON\s+(?:public\.)?project_assignments\s*\(\s*user_id\s*\)/i
      )
    })

    it("project_id のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_project_assignments_project_id\s+ON\s+(?:public\.)?project_assignments\s*\(\s*project_id\s*\)/i
      )
    })
  })

  // ===========================================
  // project_submissions テーブル
  // ===========================================
  describe("project_submissions テーブル", () => {
    it("project_submissions テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(/CREATE\s+TABLE\s+(?:public\.)?project_submissions\s*\(/i)
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_submissions\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("assignment_id カラムが UUID NOT NULL で project_assignments(id) への外部キー (ON DELETE CASCADE) を持つ", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_submissions\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /assignment_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+(?:public\.)?project_assignments\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
      )
    })

    it("github_url カラムが TEXT NOT NULL である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_submissions\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/github_url\s+TEXT\s+NOT\s+NULL/i)
    })

    it("status カラムが TEXT NOT NULL DEFAULT 'submitted' で 4状態の CHECK 制約を持つ", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_submissions\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'submitted'/i
      )
      expect(block![0]).toMatch(
        /CHECK\s*\(\s*status\s+IN\s*\(\s*'submitted'\s*,\s*'grading'\s*,\s*'graded'\s*,\s*'rejected'\s*\)\s*\)/i
      )
    })

    it("score カラムが INTEGER (nullable) である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_submissions\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/score\s+INTEGER/i)
    })

    it("result_data カラムが JSONB (nullable) である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_submissions\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/result_data\s+JSONB/i)
    })

    it("created_at と updated_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_submissions\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
      expect(block![0]).toMatch(
        /updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })
  })

  // ===========================================
  // project_submissions インデックス
  // ===========================================
  describe("project_submissions インデックス", () => {
    it("assignment_id のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_project_submissions_assignment_id\s+ON\s+(?:public\.)?project_submissions\s*\(\s*assignment_id\s*\)/i
      )
    })

    it("status のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_project_submissions_status\s+ON\s+(?:public\.)?project_submissions\s*\(\s*status\s*\)/i
      )
    })

    it("(assignment_id, created_at DESC) のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_project_submissions_created_at\s+ON\s+(?:public\.)?project_submissions\s*\(\s*assignment_id\s*,\s*created_at\s+DESC\s*\)/i
      )
    })
  })

  // ===========================================
  // project_tasks テーブル
  // ===========================================
  describe("project_tasks テーブル", () => {
    it("project_tasks テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(/CREATE\s+TABLE\s+(?:public\.)?project_tasks\s*\(/i)
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_tasks\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("assignment_id カラムが UUID NOT NULL で project_assignments(id) への外部キー (ON DELETE CASCADE) を持つ", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_tasks\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /assignment_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+(?:public\.)?project_assignments\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
      )
    })

    it("title カラムが TEXT NOT NULL である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_tasks\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/title\s+TEXT\s+NOT\s+NULL/i)
    })

    it("description カラムが TEXT (nullable) である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_tasks\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/description\s+TEXT/i)
    })

    it("status カラムが TEXT NOT NULL DEFAULT 'backlog' で 4状態の CHECK 制約を持つ", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_tasks\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'backlog'/i
      )
      expect(block![0]).toMatch(
        /CHECK\s*\(\s*status\s+IN\s*\(\s*'backlog'\s*,\s*'todo'\s*,\s*'in_progress'\s*,\s*'done'\s*\)\s*\)/i
      )
    })

    it("order カラムが INTEGER NOT NULL DEFAULT 0 である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_tasks\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(/"order"\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i)
    })

    it("created_by カラムが UUID NOT NULL で profiles(id) への外部キーを持つ", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_tasks\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /created_by\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+(?:public\.)?profiles\s*\(\s*id\s*\)/i
      )
    })

    it("created_at と updated_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      const block = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?project_tasks\s*\([^;]+\)/is
      )
      expect(block).not.toBeNull()
      expect(block![0]).toMatch(
        /created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
      expect(block![0]).toMatch(
        /updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })
  })

  // ===========================================
  // project_tasks インデックス
  // ===========================================
  describe("project_tasks インデックス", () => {
    it("assignment_id のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_project_tasks_assignment_id\s+ON\s+(?:public\.)?project_tasks\s*\(\s*assignment_id\s*\)/i
      )
    })

    it("(assignment_id, status, order) のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_project_tasks_status_order\s+ON\s+(?:public\.)?project_tasks\s*\(\s*assignment_id\s*,\s*status\s*,\s*"order"\s*\)/i
      )
    })
  })
})
