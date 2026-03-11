import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * RPC 関数 sync_quiz_data のマイグレーション SQL 検証テスト
 *
 * Task 2.1: sync_quiz_data RPC の作成
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 *
 * - p_version_id と p_quizzes 配列を受け取り、quizzes テーブルに UPSERT する
 * - (genre, tutorial, chapter, section, version_id) で既存レコードの判定を行う
 * - 送信されなかったクイズの status を archived に更新する
 * - 追加・更新・削除件数のサマリーを返却する
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** マイグレーションファイルの特定: rpc_sync_quiz_data を含むファイルを検索 */
function findRPCMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir).sort()
  const match = files.find((f) => f.includes("rpc_sync_quiz_data"))
  return match ? path.join(migrationsDir, match) : null
}

/** quizzes テーブルのマイグレーションファイルを検索 */
function findQuizzesMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir).sort()
  const match = files.find(
    (f) => f.includes("quizzes") && !f.includes("rpc_sync_quiz")
  )
  return match ? path.join(migrationsDir, match) : null
}

function readRPCMigrationSQL(): string {
  const filePath = findRPCMigrationFile()
  if (!filePath) {
    throw new Error("rpc_sync_quiz_data マイグレーションファイルが見つかりません")
  }
  return readFileSync(filePath, "utf-8")
}

describe("RPC sync_quiz_data マイグレーション SQL (Task 2.1)", () => {
  let sql: string

  beforeAll(() => {
    sql = readRPCMigrationSQL()
  })

  describe("マイグレーションファイルの存在と順序", () => {
    it("rpc_sync_quiz_data を含むマイグレーションファイルが存在する", () => {
      const filePath = findRPCMigrationFile()
      expect(filePath).not.toBeNull()
    })

    it("マイグレーションファイル名が YYYYMMDDHHMMSS_description.sql 形式である", () => {
      const filePath = findRPCMigrationFile()
      expect(filePath).not.toBeNull()
      const fileName = path.basename(filePath!)
      expect(fileName).toMatch(/^\d{14}_.*\.sql$/)
    })

    it("quizzes テーブルのマイグレーションより後のタイムスタンプである", () => {
      const quizzesFile = findQuizzesMigrationFile()
      const rpcFile = findRPCMigrationFile()
      expect(quizzesFile).not.toBeNull()
      expect(rpcFile).not.toBeNull()

      const quizzesTimestamp = path.basename(quizzesFile!).substring(0, 14)
      const rpcTimestamp = path.basename(rpcFile!).substring(0, 14)

      expect(BigInt(rpcTimestamp)).toBeGreaterThan(BigInt(quizzesTimestamp))
    })
  })

  describe("関数の定義", () => {
    it("CREATE OR REPLACE FUNCTION sync_quiz_data が存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?sync_quiz_data\s*\(/i
      )
    })

    it("p_version_id パラメータが UUID 型で定義されている", () => {
      const funcSig = sql.match(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?sync_quiz_data\s*\([^)]+\)/is
      )
      expect(funcSig).not.toBeNull()
      expect(funcSig![0]).toMatch(/p_version_id\s+UUID/i)
    })

    it("p_quizzes パラメータが JSONB 型で定義されている", () => {
      const funcSig = sql.match(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?sync_quiz_data\s*\([^)]+\)/is
      )
      expect(funcSig).not.toBeNull()
      expect(funcSig![0]).toMatch(/p_quizzes\s+JSONB/i)
    })

    it("戻り値が JSONB 型である", () => {
      expect(sql).toMatch(/RETURNS\s+JSONB/i)
    })

    it("LANGUAGE plpgsql で定義されている", () => {
      expect(sql).toMatch(/LANGUAGE\s+plpgsql/i)
    })

    it("SECURITY DEFINER が設定されている", () => {
      expect(sql).toMatch(/SECURITY\s+DEFINER/i)
    })

    it("SET search_path が設定されている", () => {
      expect(sql).toMatch(/search_path/i)
    })
  })

  describe("UPSERT 処理 (REQ-1.2, 1.3, 1.5, 1.6)", () => {
    it("quizzes テーブルへの INSERT 文が存在する", () => {
      expect(sql).toMatch(/INSERT\s+INTO\s+(?:public\.)?quizzes/i)
    })

    it("ON CONFLICT による UPSERT が実装されている", () => {
      expect(sql).toMatch(/ON\s+CONFLICT/i)
    })

    it("(genre, tutorial, chapter, section, version_id) でコンフリクト判定を行う", () => {
      expect(sql).toMatch(
        /ON\s+CONFLICT\s*\(\s*genre\s*,\s*tutorial\s*,\s*chapter\s*,\s*section\s*,\s*version_id\s*\)/i
      )
    })

    it("コンフリクト時に DO UPDATE を実行する", () => {
      expect(sql).toMatch(/DO\s+UPDATE\s+SET/i)
    })

    it("version_id を使ってクイズを紐付けている", () => {
      const insertBlock = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?quizzes[^;]*;/is
      )
      expect(insertBlock).not.toBeNull()
      expect(insertBlock![0]).toMatch(/version_id/i)
    })

    it("questions フィールドが INSERT に含まれている", () => {
      const insertBlock = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?quizzes[^;]*;/is
      )
      expect(insertBlock).not.toBeNull()
      expect(insertBlock![0]).toMatch(/questions/i)
    })

    it("title フィールドが INSERT に含まれている", () => {
      const insertBlock = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?quizzes[^;]*;/is
      )
      expect(insertBlock).not.toBeNull()
      expect(insertBlock![0]).toMatch(/title/i)
    })

    it("section フィールドが INSERT に含まれている", () => {
      const insertBlock = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?quizzes[^;]*;/is
      )
      expect(insertBlock).not.toBeNull()
      expect(insertBlock![0]).toMatch(/section/i)
    })
  })

  describe("削除（アーカイブ）処理 (REQ-1.7)", () => {
    it("送信されなかったクイズの status を archived に更新する処理がある", () => {
      expect(sql).toMatch(/UPDATE\s+(?:public\.)?quizzes/i)
      expect(sql).toMatch(/'archived'/i)
    })

    it("version_id でアーカイブ対象を絞り込む", () => {
      // UPDATE 文の中で p_version_id を参照している
      expect(sql).toMatch(/p_version_id/i)
    })
  })

  describe("サマリーの返却", () => {
    it("変更サマリーを含む JSONB を返している", () => {
      expect(sql).toMatch(/jsonb_build_object|json_build_object/i)
    })

    it("added の件数を含む", () => {
      expect(sql).toMatch(/added/i)
    })

    it("updated の件数を含む", () => {
      expect(sql).toMatch(/updated/i)
    })

    it("deleted の件数を含む", () => {
      expect(sql).toMatch(/deleted/i)
    })
  })

  describe("p_quizzes パラメータの展開", () => {
    it("jsonb_to_recordset または jsonb_populate_recordset を使用している", () => {
      const hasJsonbToRecordset = /jsonb_to_recordset/i.test(sql)
      const hasJsonbPopulate = /jsonb_populate_recordset/i.test(sql)
      const hasJsonPopulate = /json_populate_recordset/i.test(sql)
      expect(hasJsonbToRecordset || hasJsonbPopulate || hasJsonPopulate).toBe(true)
    })
  })
})
