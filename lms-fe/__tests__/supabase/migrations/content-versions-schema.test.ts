import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * content_versions テーブル作成と contents テーブル変更のマイグレーション SQL 検証テスト
 *
 * Task 1.1: content_versions テーブルの作成と contents テーブルへの version_id カラム追加
 * Requirements: 4.1, 1.3
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** マイグレーションファイルの特定: content_versions を含むファイルを検索 */
function findMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir)
  const match = files.find((f) => f.includes("content_versions"))
  return match ? path.join(migrationsDir, match) : null
}

function readMigrationSQL(): string {
  const filePath = findMigrationFile()
  if (!filePath) {
    throw new Error(
      "content_versions マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("content_versions マイグレーション SQL (Task 1.1)", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationSQL()
  })

  describe("マイグレーションファイルの存在", () => {
    it("content_versions を含むマイグレーションファイルが存在する", () => {
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

  describe("content_versions テーブルの CREATE TABLE", () => {
    it("content_versions テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+TABLE\s+(?:public\.)?content_versions\s*\(/i
      )
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      const cvBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_versions\s*\([^;]+\)/is
      )
      expect(cvBlock).not.toBeNull()
      expect(cvBlock![0]).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("commit_hash カラムが TEXT NOT NULL である", () => {
      const cvBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_versions\s*\([^;]+\)/is
      )
      expect(cvBlock).not.toBeNull()
      expect(cvBlock![0]).toMatch(/commit_hash\s+TEXT\s+NOT\s+NULL/i)
    })

    it("status カラムが TEXT NOT NULL DEFAULT 'draft' である", () => {
      const cvBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_versions\s*\([^;]+\)/is
      )
      expect(cvBlock).not.toBeNull()
      expect(cvBlock![0]).toMatch(
        /status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'draft'/i
      )
    })

    it("status カラムに CHECK 制約 ('draft', 'active', 'archived') が設定されている", () => {
      expect(sql).toMatch(
        /CHECK\s*\(\s*status\s+IN\s*\(\s*'draft'\s*,\s*'active'\s*,\s*'archived'\s*\)\s*\)/i
      )
    })

    it("synced_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      const cvBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_versions\s*\([^;]+\)/is
      )
      expect(cvBlock).not.toBeNull()
      expect(cvBlock![0]).toMatch(
        /synced_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })

    it("changes_summary カラムが JSONB でデフォルト値を持つ", () => {
      const cvBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_versions\s*\([^;]+\)/is
      )
      expect(cvBlock).not.toBeNull()
      expect(cvBlock![0]).toMatch(/changes_summary\s+JSONB/i)
      expect(cvBlock![0]).toMatch(/DEFAULT\s+'.*added.*updated.*deleted/i)
    })

    it("changed_paths カラムが TEXT[] でデフォルト値 '{}' を持つ", () => {
      const cvBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_versions\s*\([^;]+\)/is
      )
      expect(cvBlock).not.toBeNull()
      expect(cvBlock![0]).toMatch(/changed_paths\s+TEXT\s*\[\s*\]/i)
      expect(cvBlock![0]).toMatch(/DEFAULT\s+'{}'/i)
    })

    it("approved_by カラムが UUID で auth.users(id) への FK (ON DELETE SET NULL) である", () => {
      const cvBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_versions\s*\([^;]+\)/is
      )
      expect(cvBlock).not.toBeNull()
      expect(cvBlock![0]).toMatch(
        /approved_by\s+UUID\s+REFERENCES\s+auth\.users\s*\(\s*id\s*\)\s+ON\s+DELETE\s+SET\s+NULL/i
      )
    })

    it("approved_at カラムが TIMESTAMPTZ である（NULL 可）", () => {
      const cvBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_versions\s*\([^;]+\)/is
      )
      expect(cvBlock).not.toBeNull()
      expect(cvBlock![0]).toMatch(/approved_at\s+TIMESTAMPTZ/i)
    })

    it("created_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      const cvBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_versions\s*\([^;]+\)/is
      )
      expect(cvBlock).not.toBeNull()
      expect(cvBlock![0]).toMatch(
        /created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })

    it("updated_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      const cvBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_versions\s*\([^;]+\)/is
      )
      expect(cvBlock).not.toBeNull()
      expect(cvBlock![0]).toMatch(
        /updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })
  })

  describe("status カラムのインデックス", () => {
    it("status カラムにインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+\w+\s+ON\s+(?:public\.)?content_versions\s*\(\s*status\s*\)/i
      )
    })
  })

  describe("contents テーブルへの version_id カラム追加", () => {
    it("contents テーブルに version_id カラムが追加されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?contents\s+ADD\s+COLUMN\s+version_id\s+UUID/i
      )
    })

    it("version_id カラムが content_versions(id) への外部キーを持つ", () => {
      expect(sql).toMatch(
        /version_id\s+UUID\s+REFERENCES\s+(?:public\.)?content_versions\s*\(\s*id\s*\)/i
      )
    })

    it("version_id の外部キーに ON DELETE CASCADE が設定されている", () => {
      expect(sql).toMatch(
        /version_id\s+UUID\s+REFERENCES\s+(?:public\.)?content_versions\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE/i
      )
    })

    it("version_id カラムは初期時点で NULL 許可である（NOT NULL 制約なし）", () => {
      // ALTER TABLE ... ADD COLUMN version_id UUID REFERENCES ... の後に NOT NULL がないことを確認
      const alterStatement = sql.match(
        /ALTER\s+TABLE\s+(?:public\.)?contents\s+ADD\s+COLUMN\s+version_id\s+UUID\s+REFERENCES\s+(?:public\.)?content_versions\s*\(\s*id\s*\)\s+ON\s+DELETE\s+CASCADE(?:\s*;|\s*$)/im
      )
      expect(alterStatement).not.toBeNull()
      // NOT NULL がこの文に含まれていないことを確認
      expect(alterStatement![0]).not.toMatch(/NOT\s+NULL/i)
    })
  })
})
