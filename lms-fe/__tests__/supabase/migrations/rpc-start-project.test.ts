import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * start_project RPC 関数のマイグレーション SQL 検証テスト
 *
 * Task 1.3: 排他制御 + 着手 + ターム移行のトランザクション処理
 * Requirements: 3.1, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4
 *
 * RPC 関数の SQL 定義を静的に検証する。
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** start_project を含むマイグレーションファイルを検索 */
function findMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir)
  const match = files.find((f) => f.includes("rpc_start_project"))
  return match ? path.join(migrationsDir, match) : null
}

function readMigrationSQL(): string {
  const filePath = findMigrationFile()
  if (!filePath) {
    throw new Error(
      "rpc_start_project マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("start_project RPC 関数 (Task 1.3)", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationSQL()
  })

  describe("マイグレーションファイルの存在と形式", () => {
    it("rpc_start_project を含むマイグレーションファイルが存在する", () => {
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
    it("CREATE OR REPLACE FUNCTION start_project 文が存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?start_project\s*\(/i
      )
    })

    it("p_user_id UUID パラメータを受け取る", () => {
      expect(sql).toMatch(/p_user_id\s+UUID/i)
    })

    it("p_project_id UUID パラメータを受け取る", () => {
      expect(sql).toMatch(/p_project_id\s+UUID/i)
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

  describe("排他制御ロジック", () => {
    it("着手中案件の存在チェックに SELECT ... FOR UPDATE を使用している", () => {
      expect(sql).toMatch(/SELECT.*FOR\s+UPDATE/is)
    })

    it("着手中案件が存在する場合に EXCEPTION を raise する", () => {
      expect(sql).toMatch(/RAISE\s+EXCEPTION/i)
    })

    it("排他制御違反時のエラーメッセージに USER_HAS_ACTIVE_PROJECT を含む", () => {
      expect(sql).toMatch(/USER_HAS_ACTIVE_PROJECT/i)
    })
  })

  describe("着手記録の作成", () => {
    it("project_assignments テーブルへの INSERT 文が存在する", () => {
      expect(sql).toMatch(/INSERT\s+INTO\s+(?:public\.)?project_assignments/i)
    })

    it("status = 'started' でレコードを作成する", () => {
      expect(sql).toMatch(/'started'/i)
    })
  })

  describe("ターム移行処理", () => {
    it("profiles テーブルの current_term を更新する UPDATE 文が存在する", () => {
      expect(sql).toMatch(/UPDATE\s+(?:public\.)?profiles/i)
      expect(sql).toMatch(/current_term/i)
    })

    it("基礎から実践への移行条件が含まれている", () => {
      // current_term が '基礎' の場合のチェック
      expect(sql).toMatch(/基礎/i)
      expect(sql).toMatch(/実践/i)
    })
  })

  describe("戻り値", () => {
    it("assignment_id を含む JSONB を返す", () => {
      expect(sql).toMatch(/assignment_id/i)
    })

    it("term_changed を含む JSONB を返す", () => {
      expect(sql).toMatch(/term_changed/i)
    })

    it("jsonb_build_object を使用して戻り値を構築する", () => {
      expect(sql).toMatch(/jsonb_build_object/i)
    })
  })
})
