import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * contents / content_progress マイグレーション SQL のスキーマ検証テスト
 *
 * マイグレーションファイルの存在と、CREATE TABLE / RLS / INDEX 文の
 * 正しさを静的に検証する。
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** マイグレーションファイルの特定: contents_and_progress を含むファイルを検索 */
function findMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir)
  const match = files.find((f) => f.includes("contents_and_progress"))
  return match ? path.join(migrationsDir, match) : null
}

function readMigrationSQL(): string {
  const filePath = findMigrationFile()
  if (!filePath) {
    throw new Error(
      "contents_and_progress マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("contents_and_progress マイグレーション SQL", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationSQL()
  })

  describe("contents テーブル (Task 1.1)", () => {
    it("contents テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(/CREATE\s+TABLE\s+(?:public\.)?contents\s*\(/i)
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      const contentsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?contents\s*\([^;]+\)/is
      )
      expect(contentsBlock).not.toBeNull()
      expect(contentsBlock![0]).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("slug_path カラムが TEXT UNIQUE NOT NULL である", () => {
      expect(sql).toMatch(/slug_path\s+TEXT\s+(?:UNIQUE\s+)?NOT\s+NULL/i)
    })

    it("title カラムが TEXT NOT NULL である", () => {
      const contentsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?contents\s*\([^;]+\)/is
      )
      expect(contentsBlock).not.toBeNull()
      expect(contentsBlock![0]).toMatch(/title\s+TEXT\s+NOT\s+NULL/i)
    })

    it("body カラムが TEXT である（NULL 可）", () => {
      const contentsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?contents\s*\([^;]+\)/is
      )
      expect(contentsBlock).not.toBeNull()
      expect(contentsBlock![0]).toMatch(/body\s+TEXT/i)
    })

    it("genre カラムが TEXT NOT NULL である", () => {
      const contentsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?contents\s*\([^;]+\)/is
      )
      expect(contentsBlock).not.toBeNull()
      expect(contentsBlock![0]).toMatch(/genre\s+TEXT\s+NOT\s+NULL/i)
    })

    it("tutorial カラムが TEXT NOT NULL である", () => {
      const contentsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?contents\s*\([^;]+\)/is
      )
      expect(contentsBlock).not.toBeNull()
      expect(contentsBlock![0]).toMatch(/tutorial\s+TEXT\s+NOT\s+NULL/i)
    })

    it("chapter カラムが TEXT である（NULL 可）", () => {
      const contentsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?contents\s*\([^;]+\)/is
      )
      expect(contentsBlock).not.toBeNull()
      expect(contentsBlock![0]).toMatch(/\bchapter\s+TEXT\b/i)
    })

    it("section カラムが TEXT である（NULL 可）", () => {
      const contentsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?contents\s*\([^;]+\)/is
      )
      expect(contentsBlock).not.toBeNull()
      expect(contentsBlock![0]).toMatch(/\bsection\s+TEXT\b/i)
    })

    it("content_type カラムが TEXT NOT NULL で CHECK 制約を持つ", () => {
      expect(sql).toMatch(/content_type\s+TEXT\s+NOT\s+NULL/i)
      expect(sql).toMatch(
        /CHECK\s*\(\s*content_type\s+IN\s*\(\s*'genre'\s*,\s*'tutorial'\s*,\s*'chapter'\s*,\s*'section'\s*\)\s*\)/i
      )
    })

    it("order カラムが INTEGER NOT NULL DEFAULT 0 である", () => {
      const contentsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?contents\s*\([^;]+\)/is
      )
      expect(contentsBlock).not.toBeNull()
      expect(contentsBlock![0]).toMatch(
        /\"?order\"?\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0/i
      )
    })

    it("status カラムが TEXT NOT NULL DEFAULT 'active' で CHECK 制約を持つ", () => {
      expect(sql).toMatch(
        /status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'active'/i
      )
      expect(sql).toMatch(
        /CHECK\s*\(\s*status\s+IN\s*\(\s*'active'\s*,\s*'archived'\s*\)\s*\)/i
      )
    })

    it("metadata カラムが JSONB である", () => {
      const contentsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?contents\s*\([^;]+\)/is
      )
      expect(contentsBlock).not.toBeNull()
      expect(contentsBlock![0]).toMatch(/metadata\s+JSONB/i)
    })

    it("created_at カラムが TIMESTAMPTZ DEFAULT NOW() である", () => {
      const contentsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?contents\s*\([^;]+\)/is
      )
      expect(contentsBlock).not.toBeNull()
      expect(contentsBlock![0]).toMatch(
        /created_at\s+TIMESTAMPTZ.*DEFAULT\s+NOW\(\)/i
      )
    })

    it("updated_at カラムが TIMESTAMPTZ DEFAULT NOW() である", () => {
      const contentsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?contents\s*\([^;]+\)/is
      )
      expect(contentsBlock).not.toBeNull()
      expect(contentsBlock![0]).toMatch(
        /updated_at\s+TIMESTAMPTZ.*DEFAULT\s+NOW\(\)/i
      )
    })

    it("(content_type, status, order) の複合インデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+\w+\s+ON\s+(?:public\.)?contents\s*\(\s*content_type\s*,\s*status\s*,\s*"?order"?\s*\)/i
      )
    })

    it("(genre, content_type, status, order) の複合インデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+\w+\s+ON\s+(?:public\.)?contents\s*\(\s*genre\s*,\s*content_type\s*,\s*status\s*,\s*"?order"?\s*\)/i
      )
    })

    it("(tutorial, content_type, order) の複合インデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+\w+\s+ON\s+(?:public\.)?contents\s*\(\s*tutorial\s*,\s*content_type\s*,\s*"?order"?\s*\)/i
      )
    })

    it("(tutorial, chapter, content_type, order) の複合インデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+\w+\s+ON\s+(?:public\.)?contents\s*\(\s*tutorial\s*,\s*chapter\s*,\s*content_type\s*,\s*"?order"?\s*\)/i
      )
    })
  })

  describe("content_progress テーブル (Task 1.1)", () => {
    it("content_progress テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+TABLE\s+(?:public\.)?content_progress\s*\(/i
      )
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      const progressBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_progress\s*\([^;]+\)/is
      )
      expect(progressBlock).not.toBeNull()
      expect(progressBlock![0]).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("user_id カラムが UUID NOT NULL で auth.users を参照する外部キーを持つ", () => {
      const progressBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_progress\s*\([^;]+\)/is
      )
      expect(progressBlock).not.toBeNull()
      expect(progressBlock![0]).toMatch(
        /user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+auth\.users\s*\(\s*id\s*\)/i
      )
    })

    it("content_id カラムが UUID NOT NULL で contents を参照する外部キーを持つ", () => {
      const progressBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_progress\s*\([^;]+\)/is
      )
      expect(progressBlock).not.toBeNull()
      expect(progressBlock![0]).toMatch(
        /content_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+contents\s*\(\s*id\s*\)/i
      )
    })

    it("completed_at カラムが TIMESTAMPTZ DEFAULT NOW() である", () => {
      const progressBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?content_progress\s*\([^;]+\)/is
      )
      expect(progressBlock).not.toBeNull()
      expect(progressBlock![0]).toMatch(
        /completed_at\s+TIMESTAMPTZ.*DEFAULT\s+NOW\(\)/i
      )
    })

    it("(user_id, content_id) の UNIQUE 制約が設定されている", () => {
      expect(sql).toMatch(/UNIQUE\s*\(\s*user_id\s*,\s*content_id\s*\)/i)
    })

    it("user_id のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+\w+\s+ON\s+(?:public\.)?content_progress\s*\(\s*user_id\s*\)/i
      )
    })
  })

  describe("profiles テーブルへのカラム追加 (Task 1.2)", () => {
    it("graduation_date カラムが profiles テーブルに追加されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?profiles\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?graduation_date\s+DATE/i
      )
    })

    it("default_genre カラムが profiles テーブルに追加されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?profiles\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?default_genre\s+TEXT/i
      )
    })
  })

  describe("RLS ポリシー (Task 1.3)", () => {
    it("contents テーブルの RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?contents\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("content_progress テーブルの RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?content_progress\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("User/Super Admin が active コンテンツを SELECT できる RLS ポリシーが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+.*ON\s+contents\s+FOR\s+SELECT/i
      )
      // ポリシー内で role のチェックがある
      expect(sql).toMatch(/profiles\.role\s+IN\s*\(\s*'user'\s*,\s*'super_admin'\s*\)/i)
    })

    it("Super Admin が全ステータスのコンテンツを SELECT できるポリシーが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+.*super_admin.*ON\s+contents\s+FOR\s+SELECT/i
      )
      expect(sql).toMatch(/profiles\.role\s*=\s*'super_admin'/i)
    })

    it("content_progress の SELECT ポリシーが user_id = auth.uid() で作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+.*ON\s+content_progress\s+FOR\s+SELECT/i
      )
      expect(sql).toMatch(/user_id\s*=\s*auth\.uid\(\)/i)
    })

    it("content_progress の INSERT ポリシーが user_id = auth.uid() で作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+.*ON\s+content_progress\s+FOR\s+INSERT/i
      )
    })
  })
})
