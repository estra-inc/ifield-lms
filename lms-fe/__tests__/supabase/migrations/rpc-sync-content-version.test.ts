import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * RPC 関数 sync_content_version のマイグレーション SQL 検証テスト
 *
 * Task 1.4: RPC 関数 sync_content_version の作成
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 6.4
 *
 * - SECURITY DEFINER で PostgreSQL 関数を作成し、同期処理をアトミックに実行する
 * - 既存 draft の存在確認を行い、存在する場合は commit_hash・synced_at を UPDATE し、紐づく contents を DELETE する
 * - draft が存在しない場合は新規 content_versions レコード（status='draft'）を INSERT する
 * - 引数で受け取ったコンテンツ配列を json_populate_recordset で効率的に INSERT し、version_id を紐付ける
 * - active バージョンとの比較で changes_summary（added, updated, deleted）と changed_paths を計算・更新する
 * - commit_hash の NOT NULL バリデーションを関数内で実施する
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** マイグレーションファイルの特定: rpc_sync_content_version を含むファイルを検索 */
function findRPCMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir).sort()
  const match = files.find(
    (f) => f.includes("rpc_sync_content_version")
  )
  return match ? path.join(migrationsDir, match) : null
}

/** Task 1.3 のマイグレーションファイルを検索 */
function findTask13MigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir).sort()
  const match = files.find(
    (f) => f.includes("content_versions_rls")
  )
  return match ? path.join(migrationsDir, match) : null
}

function readRPCMigrationSQL(): string {
  const filePath = findRPCMigrationFile()
  if (!filePath) {
    throw new Error(
      "rpc_sync_content_version マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("RPC sync_content_version マイグレーション SQL (Task 1.4)", () => {
  let sql: string

  beforeAll(() => {
    sql = readRPCMigrationSQL()
  })

  describe("マイグレーションファイルの存在と順序", () => {
    it("rpc_sync_content_version を含むマイグレーションファイルが存在する", () => {
      const filePath = findRPCMigrationFile()
      expect(filePath).not.toBeNull()
    })

    it("マイグレーションファイル名が YYYYMMDDHHMMSS_description.sql 形式である", () => {
      const filePath = findRPCMigrationFile()
      expect(filePath).not.toBeNull()
      const fileName = path.basename(filePath!)
      expect(fileName).toMatch(/^\d{14}_.*\.sql$/)
    })

    it("Task 1.3 のマイグレーションファイルより後のタイムスタンプである", () => {
      const task13File = findTask13MigrationFile()
      const task14File = findRPCMigrationFile()
      expect(task13File).not.toBeNull()
      expect(task14File).not.toBeNull()

      const task13Timestamp = path.basename(task13File!).substring(0, 14)
      const task14Timestamp = path.basename(task14File!).substring(0, 14)

      expect(BigInt(task14Timestamp)).toBeGreaterThan(BigInt(task13Timestamp))
    })
  })

  describe("関数の定義", () => {
    it("CREATE OR REPLACE FUNCTION sync_content_version が存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?sync_content_version\s*\(/i
      )
    })

    it("p_commit_hash パラメータが TEXT 型で定義されている", () => {
      // 関数シグネチャ内のパラメータを確認
      const funcSig = sql.match(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?sync_content_version\s*\([^)]+\)/is
      )
      expect(funcSig).not.toBeNull()
      expect(funcSig![0]).toMatch(/p_commit_hash\s+TEXT/i)
    })

    it("p_contents パラメータが JSONB 型で定義されている", () => {
      const funcSig = sql.match(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?sync_content_version\s*\([^)]+\)/is
      )
      expect(funcSig).not.toBeNull()
      expect(funcSig![0]).toMatch(/p_contents\s+JSONB/i)
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
  })

  describe("commit_hash のバリデーション", () => {
    it("p_commit_hash の NULL または空文字チェックが実装されている", () => {
      // RAISE EXCEPTION で commit_hash のバリデーションエラーを発生させる
      expect(sql).toMatch(/p_commit_hash/i)
      expect(sql).toMatch(/RAISE\s+EXCEPTION/i)
    })

    it("commit_hash が空の場合にエラーが発生する実装がある", () => {
      // NULL チェック（IS NULL）または空文字チェック（= '' または trim）の存在確認
      const hasNullCheck = /p_commit_hash\s+IS\s+NULL/i.test(sql)
      const hasEmptyCheck = /p_commit_hash\s*=\s*''/i.test(sql) ||
        /trim\s*\(\s*p_commit_hash\s*\)\s*=\s*''/i.test(sql)
      expect(hasNullCheck || hasEmptyCheck).toBe(true)
    })
  })

  describe("既存 draft の存在確認と上書き処理 (REQ-2.1, 2.2, 2.3)", () => {
    it("content_versions テーブルから draft ステータスのレコードを検索している", () => {
      expect(sql).toMatch(/content_versions/i)
      expect(sql).toMatch(/status\s*=\s*'draft'/i)
    })

    it("draft が存在する場合に commit_hash を UPDATE する処理がある", () => {
      // UPDATE content_versions ... SET commit_hash の存在
      expect(sql).toMatch(/UPDATE\s+(?:public\.)?content_versions/i)
      expect(sql).toMatch(/commit_hash\s*=/i)
    })

    it("draft が存在する場合に synced_at を UPDATE する処理がある", () => {
      expect(sql).toMatch(/synced_at\s*=/i)
    })

    it("draft に紐づく既存 contents を DELETE する処理がある", () => {
      expect(sql).toMatch(/DELETE\s+FROM\s+(?:public\.)?contents/i)
    })
  })

  describe("新規 draft バージョンの作成 (REQ-1.1, 1.2)", () => {
    it("draft が存在しない場合に新規 content_versions レコードを INSERT する処理がある", () => {
      expect(sql).toMatch(/INSERT\s+INTO\s+(?:public\.)?content_versions/i)
    })

    it("新規作成時に status='draft' を設定する", () => {
      // INSERT 文の中で 'draft' ステータスが設定されている
      const insertBlock = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?content_versions[^;]*;/is
      )
      expect(insertBlock).not.toBeNull()
      expect(insertBlock![0]).toMatch(/'draft'/i)
    })
  })

  describe("コンテンツの INSERT (REQ-1.3, 6.4)", () => {
    it("contents テーブルへの INSERT 文が存在する", () => {
      expect(sql).toMatch(/INSERT\s+INTO\s+(?:public\.)?contents/i)
    })

    it("json_populate_recordset または jsonb_to_recordset を使用した効率的な INSERT が実装されている", () => {
      // json_populate_recordset または jsonb_to_recordset のいずれかを使用
      const hasJsonPopulate = /json_populate_recordset/i.test(sql)
      const hasJsonbToRecordset = /jsonb_to_recordset/i.test(sql)
      const hasJsonbPopulate = /jsonb_populate_recordset/i.test(sql)
      expect(hasJsonPopulate || hasJsonbToRecordset || hasJsonbPopulate).toBe(true)
    })

    it("version_id を紐付けてコンテンツを INSERT している", () => {
      // INSERT INTO contents で version_id を参照している
      const contentsInsert = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?contents[^;]*;/is
      )
      expect(contentsInsert).not.toBeNull()
      expect(contentsInsert![0]).toMatch(/version_id/i)
    })

    it("slug_path フィールドが INSERT に含まれている", () => {
      const contentsInsert = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?contents[^;]*;/is
      )
      expect(contentsInsert).not.toBeNull()
      expect(contentsInsert![0]).toMatch(/slug_path/i)
    })

    it("title フィールドが INSERT に含まれている", () => {
      const contentsInsert = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?contents[^;]*;/is
      )
      expect(contentsInsert).not.toBeNull()
      expect(contentsInsert![0]).toMatch(/title/i)
    })

    it("body フィールドが INSERT に含まれている", () => {
      const contentsInsert = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?contents[^;]*;/is
      )
      expect(contentsInsert).not.toBeNull()
      expect(contentsInsert![0]).toMatch(/body/i)
    })

    it("genre フィールドが INSERT に含まれている", () => {
      const contentsInsert = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?contents[^;]*;/is
      )
      expect(contentsInsert).not.toBeNull()
      expect(contentsInsert![0]).toMatch(/genre/i)
    })

    it("content_type フィールドが INSERT に含まれている", () => {
      const contentsInsert = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?contents[^;]*;/is
      )
      expect(contentsInsert).not.toBeNull()
      expect(contentsInsert![0]).toMatch(/content_type/i)
    })

    it("order フィールドが INSERT に含まれている", () => {
      const contentsInsert = sql.match(
        /INSERT\s+INTO\s+(?:public\.)?contents[^;]*;/is
      )
      expect(contentsInsert).not.toBeNull()
      // "order" は予約語のためダブルクォートで囲まれる可能性がある
      expect(contentsInsert![0]).toMatch(/"?order"?/i)
    })
  })

  describe("変更差分の計算 (changes_summary, changed_paths)", () => {
    it("active バージョンとの比較ロジックが存在する", () => {
      // active バージョンの参照がある
      expect(sql).toMatch(/status\s*=\s*'active'/i)
    })

    it("added（追加）の計算がある -- draft にあって active にない slug_path", () => {
      // added の計算: draft の slug_path のうち active に存在しないもの
      // NOT IN, NOT EXISTS, EXCEPT, LEFT JOIN ... IS NULL などのパターン
      expect(sql).toMatch(/added/i)
    })

    it("deleted（削除）の計算がある -- active にあって draft にない slug_path", () => {
      expect(sql).toMatch(/deleted/i)
    })

    it("updated（更新）の計算がある -- 両方に存在するが内容が異なる slug_path", () => {
      expect(sql).toMatch(/updated/i)
    })

    it("changes_summary を content_versions レコードに UPDATE する処理がある", () => {
      // UPDATE content_versions SET changes_summary =
      expect(sql).toMatch(/changes_summary/i)
    })

    it("changed_paths を content_versions レコードに UPDATE する処理がある", () => {
      expect(sql).toMatch(/changed_paths/i)
    })
  })

  describe("戻り値の形式", () => {
    it("version_id を含む JSONB を返している", () => {
      // RETURN 文で jsonb_build_object を使用し version_id を含めている
      expect(sql).toMatch(/version_id/i)
      expect(sql).toMatch(/jsonb_build_object|json_build_object/i)
    })

    it("changes_summary を含む JSONB を返している", () => {
      expect(sql).toMatch(/changes_summary/i)
    })

    it("changed_paths を含む JSONB を返している", () => {
      expect(sql).toMatch(/changed_paths/i)
    })
  })

  describe("IF/ELSE 分岐ロジック", () => {
    it("draft 存在有無による条件分岐（IF ... ELSE ... END IF）がある", () => {
      expect(sql).toMatch(/IF\b/i)
      expect(sql).toMatch(/ELSE\b/i)
      expect(sql).toMatch(/END\s+IF/i)
    })
  })

  describe("updated_at の自動更新", () => {
    it("content_versions の updated_at を更新する処理がある", () => {
      expect(sql).toMatch(/updated_at\s*=/i)
    })
  })

  describe("search_path のセキュリティ設定", () => {
    it("SET search_path が設定されている（SECURITY DEFINER のベストプラクティス）", () => {
      // SECURITY DEFINER 関数では search_path を明示的に設定することが推奨される
      expect(sql).toMatch(/search_path/i)
    })
  })
})
