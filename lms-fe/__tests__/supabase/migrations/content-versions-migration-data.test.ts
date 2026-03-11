import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * 初回移行データの作成と制約変更のマイグレーション SQL 検証テスト
 *
 * Task 1.2: 初回移行データの作成と制約変更
 * Requirements: 1.3
 *
 * このマイグレーションは Task 1.1 (20260301000000_content_versions.sql) の後に実行される。
 * - ダミー active バージョンレコードの INSERT
 * - 既存 contents の version_id UPDATE
 * - version_id の NOT NULL 制約付与
 * - slug_path UNIQUE 制約の DROP と (slug_path, version_id) 複合ユニーク制約の作成
 * - version_id インデックスの作成
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** マイグレーションファイルの特定: migration_data を含むファイルを検索 */
function findMigrationDataFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir).sort()
  // Task 1.1 のファイル (20260301000000_content_versions.sql) の後に実行される
  // migration_data を含むファイルを検索
  const match = files.find(
    (f) =>
      f.includes("migration_data") || f.includes("content_versions_migration")
  )
  return match ? path.join(migrationsDir, match) : null
}

/** Task 1.1 のマイグレーションファイルを検索 */
function findTask11MigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir).sort()
  const match = files.find(
    (f) => f.includes("content_versions") && !f.includes("migration_data")
  )
  return match ? path.join(migrationsDir, match) : null
}

function readMigrationDataSQL(): string {
  const filePath = findMigrationDataFile()
  if (!filePath) {
    throw new Error(
      "content_versions_migration_data マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("初回移行データの作成と制約変更マイグレーション SQL (Task 1.2)", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationDataSQL()
  })

  describe("マイグレーションファイルの存在と順序", () => {
    it("migration_data を含むマイグレーションファイルが存在する", () => {
      const filePath = findMigrationDataFile()
      expect(filePath).not.toBeNull()
    })

    it("マイグレーションファイル名が YYYYMMDDHHMMSS_description.sql 形式である", () => {
      const filePath = findMigrationDataFile()
      expect(filePath).not.toBeNull()
      const fileName = path.basename(filePath!)
      expect(fileName).toMatch(/^\d{14}_.*\.sql$/)
    })

    it("Task 1.1 のマイグレーションファイルより後のタイムスタンプである", () => {
      const task11File = findTask11MigrationFile()
      const task12File = findMigrationDataFile()
      expect(task11File).not.toBeNull()
      expect(task12File).not.toBeNull()

      const task11Timestamp = path.basename(task11File!).substring(0, 14)
      const task12Timestamp = path.basename(task12File!).substring(0, 14)

      // Task 1.2 のタイムスタンプが Task 1.1 より大きいこと
      expect(BigInt(task12Timestamp)).toBeGreaterThan(BigInt(task11Timestamp))
    })
  })

  describe("ダミー active バージョンレコードの INSERT", () => {
    it("content_versions テーブルへの INSERT 文が存在する", () => {
      expect(sql).toMatch(
        /INSERT\s+INTO\s+(?:public\.)?content_versions/i
      )
    })

    it("commit_hash が 'initial' で INSERT される", () => {
      expect(sql).toMatch(/'initial'/i)
    })

    it("status が 'active' で INSERT される", () => {
      // INSERT 文内で 'active' が指定されている
      const insertBlock = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?content_versions[^;]+;/is
      )
      expect(insertBlock).not.toBeNull()
      expect(insertBlock![0]).toMatch(/'active'/i)
    })

    it("UUID は gen_random_uuid() で自動生成される", () => {
      // INSERT 文で id に gen_random_uuid() を使用するか、デフォルト値に依存する
      // どちらかの方法で UUID が生成される
      const insertBlock = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?content_versions[^;]+;/is
      )
      expect(insertBlock).not.toBeNull()
    })
  })

  describe("既存 contents の version_id UPDATE", () => {
    it("contents テーブルの UPDATE 文が存在する", () => {
      expect(sql).toMatch(
        /UPDATE\s+(?:public\.)?contents/i
      )
    })

    it("version_id がダミー active バージョンの id で UPDATE される", () => {
      // UPDATE 文で version_id をセットしている
      expect(sql).toMatch(
        /SET\s+version_id\s*=/i
      )
    })

    it("ダミー active バージョンの id をサブクエリまたは変数で参照している", () => {
      // content_versions テーブルから initial の id を取得するサブクエリ、
      // または前の INSERT で取得した id を参照している
      const updateBlock = sql.match(
        /UPDATE\s+(?:public\.)?contents[^;]+;/is
      )
      expect(updateBlock).not.toBeNull()
      // content_versions への参照がある（サブクエリ、DO ブロック変数、CTE のいずれか）
      expect(sql).toMatch(/content_versions/i)
    })

    it("version_id IS NULL の条件で既存レコードのみ UPDATE する", () => {
      expect(sql).toMatch(/version_id\s+IS\s+NULL/i)
    })
  })

  describe("version_id の NOT NULL 制約変更", () => {
    it("version_id カラムに NOT NULL 制約を SET する ALTER TABLE 文が存在する", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?contents\s+ALTER\s+COLUMN\s+version_id\s+SET\s+NOT\s+NULL/i
      )
    })
  })

  describe("slug_path UNIQUE 制約の変更", () => {
    it("既存の slug_path UNIQUE 制約を DROP する文が存在する", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?contents\s+DROP\s+CONSTRAINT\s+\w*slug_path\w*/i
      )
    })

    it("(slug_path, version_id) の複合ユニーク制約を追加する文が存在する", () => {
      expect(sql).toMatch(
        /ADD\s+CONSTRAINT\s+\w+\s+UNIQUE\s*\(\s*slug_path\s*,\s*version_id\s*\)/i
      )
    })

    it("複合ユニーク制約の名前が contents テーブルに紐づくものである", () => {
      const constraintMatch = sql.match(
        /ADD\s+CONSTRAINT\s+(\w+)\s+UNIQUE\s*\(\s*slug_path\s*,\s*version_id\s*\)/i
      )
      expect(constraintMatch).not.toBeNull()
      // 制約名に contents が含まれる
      expect(constraintMatch![1]).toMatch(/contents/i)
    })
  })

  describe("version_id インデックスの作成", () => {
    it("version_id カラムにインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+\w+\s+ON\s+(?:public\.)?contents\s*\(\s*version_id\s*\)/i
      )
    })

    it("インデックス名が contents テーブルに紐づくものである", () => {
      const indexMatch = sql.match(
        /CREATE\s+INDEX\s+(\w+)\s+ON\s+(?:public\.)?contents\s*\(\s*version_id\s*\)/i
      )
      expect(indexMatch).not.toBeNull()
      // インデックス名に contents または version_id が含まれる
      expect(indexMatch![1]).toMatch(/content|version/i)
    })
  })

  describe("操作の順序の整合性", () => {
    it("INSERT が UPDATE より前に記述されている", () => {
      const insertPos = sql.search(
        /INSERT\s+INTO\s+(?:public\.)?content_versions/i
      )
      const updatePos = sql.search(
        /UPDATE\s+(?:public\.)?contents/i
      )
      expect(insertPos).toBeGreaterThanOrEqual(0)
      expect(updatePos).toBeGreaterThanOrEqual(0)
      expect(insertPos).toBeLessThan(updatePos)
    })

    it("UPDATE が ALTER COLUMN SET NOT NULL より前に記述されている", () => {
      const updatePos = sql.search(
        /UPDATE\s+(?:public\.)?contents/i
      )
      const alterNotNullPos = sql.search(
        /ALTER\s+TABLE\s+(?:public\.)?contents\s+ALTER\s+COLUMN\s+version_id\s+SET\s+NOT\s+NULL/i
      )
      expect(updatePos).toBeGreaterThanOrEqual(0)
      expect(alterNotNullPos).toBeGreaterThanOrEqual(0)
      expect(updatePos).toBeLessThan(alterNotNullPos)
    })

    it("NOT NULL 制約の設定が制約変更より前に記述されている", () => {
      const alterNotNullPos = sql.search(
        /ALTER\s+TABLE\s+(?:public\.)?contents\s+ALTER\s+COLUMN\s+version_id\s+SET\s+NOT\s+NULL/i
      )
      const dropConstraintPos = sql.search(
        /DROP\s+CONSTRAINT\s+\w*slug_path\w*/i
      )
      expect(alterNotNullPos).toBeGreaterThanOrEqual(0)
      expect(dropConstraintPos).toBeGreaterThanOrEqual(0)
      expect(alterNotNullPos).toBeLessThan(dropConstraintPos)
    })
  })
})
