import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * sync_mock_project_data RPC 関数のマイグレーション SQL 検証テスト
 *
 * Task 1.4: 模擬案件データの UPSERT + archive 処理
 * Requirements: 9.1, 9.3, 9.4, 9.7, 9.8
 *
 * RPC 関数の SQL 定義を静的に検証する。
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** sync_mock_project_data を含むマイグレーションファイルを検索 */
function findMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir)
  const match = files.find((f) => f.includes("rpc_sync_mock_project"))
  return match ? path.join(migrationsDir, match) : null
}

function readMigrationSQL(): string {
  const filePath = findMigrationFile()
  if (!filePath) {
    throw new Error(
      "rpc_sync_mock_project_data マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("sync_mock_project_data RPC 関数 (Task 1.4)", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationSQL()
  })

  describe("マイグレーションファイルの存在と形式", () => {
    it("rpc_sync_mock_project を含むマイグレーションファイルが存在する", () => {
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

  describe("関数定義", () => {
    it("CREATE OR REPLACE FUNCTION sync_mock_project_data 文が存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?sync_mock_project_data\s*\(/i
      )
    })

    it("p_version_id UUID パラメータを受け取る", () => {
      expect(sql).toMatch(/p_version_id\s+UUID/i)
    })

    it("p_mock_projects JSONB パラメータを受け取る", () => {
      expect(sql).toMatch(/p_mock_projects\s+JSONB/i)
    })

    it("RETURNS JSONB である", () => {
      expect(sql).toMatch(/RETURNS\s+JSONB/i)
    })

    it("LANGUAGE plpgsql である", () => {
      expect(sql).toMatch(/LANGUAGE\s+plpgsql/i)
    })

    it("SECURITY DEFINER で定義されている", () => {
      expect(sql).toMatch(/SECURITY\s+DEFINER/i)
    })
  })

  describe("バリデーション", () => {
    it("version_id の存在チェックを content_versions テーブルで行う", () => {
      expect(sql).toMatch(/content_versions/i)
      expect(sql).toMatch(/p_version_id/i)
    })
  })

  describe("UPSERT ロジック", () => {
    it("mock_projects テーブルへの INSERT 文が存在する", () => {
      expect(sql).toMatch(/INSERT\s+INTO\s+(?:public\.)?mock_projects/i)
    })

    it("slug をキーとして UPSERT する（slug による既存レコード検索 + INSERT/UPDATE）", () => {
      // slug をキーとした既存レコードの存在チェック
      expect(sql).toMatch(/WHERE\s+slug\s*=/i)
      expect(sql).toMatch(/slug/i)
    })

    it("genre フィールドを処理する", () => {
      expect(sql).toMatch(/genre/i)
    })

    it("title, description, requirements, evaluation_items を処理する", () => {
      expect(sql).toMatch(/title/i)
      expect(sql).toMatch(/description/i)
      expect(sql).toMatch(/requirements/i)
      expect(sql).toMatch(/evaluation_items/i)
    })
  })

  describe("archive ロジック", () => {
    it("同期元に存在しない案件を archived に UPDATE する処理が存在する", () => {
      expect(sql).toMatch(/archived/i)
      expect(sql).toMatch(/UPDATE\s+(?:public\.)?mock_projects/i)
    })
  })

  describe("戻り値", () => {
    it("mock_project_changes_summary を含む JSONB を返す", () => {
      expect(sql).toMatch(/mock_project_changes_summary/i)
    })

    it("added, updated, deleted のカウントを含む", () => {
      expect(sql).toMatch(/added/i)
      expect(sql).toMatch(/updated/i)
      expect(sql).toMatch(/deleted/i)
    })

    it("jsonb_build_object を使用して戻り値を構築する", () => {
      expect(sql).toMatch(/jsonb_build_object/i)
    })
  })
})
