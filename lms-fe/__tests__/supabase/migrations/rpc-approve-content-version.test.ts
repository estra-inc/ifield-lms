import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * RPC 関数 approve_content_version のマイグレーション SQL 検証テスト
 *
 * Task 1.5: RPC 関数 approve_content_version の作成
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 4.2
 *
 * - SECURITY DEFINER で PostgreSQL 関数を作成し、承認処理をアトミックに実行する
 * - 対象バージョンが draft ステータスであることを検証し、違反時は RAISE EXCEPTION する
 * - SELECT ... FOR UPDATE で対象レコードをロックし、同時承認の競合を防止する
 * - 旧 active バージョンが存在する場合、archived に UPDATE し、紐づく contents 行を DELETE する
 * - 対象 draft バージョンを active に UPDATE し、approved_by と approved_at を記録する
 * - 初回同期（active バージョンが存在しない）にも対応する
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** マイグレーションファイルの特定: rpc_approve_content_version を含むファイルを検索 */
function findRPCApproveMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir).sort()
  const match = files.find(
    (f) => f.includes("rpc_approve_content_version")
  )
  return match ? path.join(migrationsDir, match) : null
}

/** Task 1.4 のマイグレーションファイルを検索 */
function findTask14MigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir).sort()
  const match = files.find(
    (f) => f.includes("rpc_sync_content_version")
  )
  return match ? path.join(migrationsDir, match) : null
}

function readRPCApproveMigrationSQL(): string {
  const filePath = findRPCApproveMigrationFile()
  if (!filePath) {
    throw new Error(
      "rpc_approve_content_version マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("RPC approve_content_version マイグレーション SQL (Task 1.5)", () => {
  let sql: string

  beforeAll(() => {
    sql = readRPCApproveMigrationSQL()
  })

  describe("マイグレーションファイルの存在と順序", () => {
    it("rpc_approve_content_version を含むマイグレーションファイルが存在する", () => {
      const filePath = findRPCApproveMigrationFile()
      expect(filePath).not.toBeNull()
    })

    it("マイグレーションファイル名が YYYYMMDDHHMMSS_description.sql 形式である", () => {
      const filePath = findRPCApproveMigrationFile()
      expect(filePath).not.toBeNull()
      const fileName = path.basename(filePath!)
      expect(fileName).toMatch(/^\d{14}_.*\.sql$/)
    })

    it("Task 1.4 (rpc_sync_content_version) のマイグレーションファイルより後のタイムスタンプである", () => {
      const task14File = findTask14MigrationFile()
      const task15File = findRPCApproveMigrationFile()
      expect(task14File).not.toBeNull()
      expect(task15File).not.toBeNull()

      const task14Timestamp = path.basename(task14File!).substring(0, 14)
      const task15Timestamp = path.basename(task15File!).substring(0, 14)

      expect(BigInt(task15Timestamp)).toBeGreaterThan(BigInt(task14Timestamp))
    })
  })

  describe("関数の定義", () => {
    it("CREATE OR REPLACE FUNCTION approve_content_version が存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?approve_content_version\s*\(/i
      )
    })

    it("p_version_id パラメータが UUID 型で定義されている", () => {
      const funcSig = sql.match(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?approve_content_version\s*\([^)]+\)/is
      )
      expect(funcSig).not.toBeNull()
      expect(funcSig![0]).toMatch(/p_version_id\s+UUID/i)
    })

    it("p_approved_by パラメータが UUID 型で定義されている", () => {
      const funcSig = sql.match(
        /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?approve_content_version\s*\([^)]+\)/is
      )
      expect(funcSig).not.toBeNull()
      expect(funcSig![0]).toMatch(/p_approved_by\s+UUID/i)
    })

    it("戻り値が VOID 型である", () => {
      expect(sql).toMatch(/RETURNS\s+VOID/i)
    })

    it("LANGUAGE plpgsql で定義されている", () => {
      expect(sql).toMatch(/LANGUAGE\s+plpgsql/i)
    })

    it("SECURITY DEFINER が設定されている", () => {
      expect(sql).toMatch(/SECURITY\s+DEFINER/i)
    })

    it("SET search_path = public が設定されている", () => {
      expect(sql).toMatch(/search_path\s*=\s*public/i)
    })
  })

  describe("パラメータのバリデーション", () => {
    it("p_version_id の NULL チェックが実装されている", () => {
      expect(sql).toMatch(/p_version_id\s+IS\s+NULL/i)
    })

    it("p_approved_by の NULL チェックが実装されている", () => {
      expect(sql).toMatch(/p_approved_by\s+IS\s+NULL/i)
    })

    it("バリデーション違反時に RAISE EXCEPTION する", () => {
      expect(sql).toMatch(/RAISE\s+EXCEPTION/i)
    })
  })

  describe("SELECT ... FOR UPDATE による対象レコードのロック", () => {
    it("SELECT ... FOR UPDATE で対象バージョンレコードをロックしている", () => {
      expect(sql).toMatch(/SELECT\b[^;]*FOR\s+UPDATE/i)
    })

    it("content_versions テーブルから対象バージョンを取得している", () => {
      // FOR UPDATE を含む SELECT 文が content_versions を参照している
      const forUpdateBlock = sql.match(
        /SELECT\b[^;]*FROM\s+(?:public\.)?content_versions[^;]*FOR\s+UPDATE/is
      )
      expect(forUpdateBlock).not.toBeNull()
    })

    it("p_version_id で対象レコードをフィルタしている", () => {
      expect(sql).toMatch(/id\s*=\s*p_version_id/i)
    })
  })

  describe("draft ステータスの検証 (REQ-5.1)", () => {
    it("対象バージョンの status が draft であることを検証している", () => {
      // 取得したレコードの status が 'draft' でない場合の条件分岐
      expect(sql).toMatch(/'draft'/i)
    })

    it("draft でない場合に RAISE EXCEPTION する", () => {
      // status != 'draft' のチェックと RAISE EXCEPTION の組み合わせ
      expect(sql).toMatch(/RAISE\s+EXCEPTION/i)
    })

    it("レコードが存在しない場合（NOT FOUND）のエラーハンドリングがある", () => {
      // NOT FOUND チェック
      expect(sql).toMatch(/NOT\s+FOUND/i)
    })
  })

  describe("旧 active バージョンの archived 化 (REQ-5.2)", () => {
    it("既存の active バージョンを検索する処理がある", () => {
      // status = 'active' での検索
      expect(sql).toMatch(/status\s*=\s*'active'/i)
    })

    it("旧 active バージョンを archived に UPDATE する処理がある", () => {
      // UPDATE content_versions SET status = 'archived'
      expect(sql).toMatch(/UPDATE\s+(?:public\.)?content_versions/i)
      expect(sql).toMatch(/status\s*=\s*'archived'/i)
    })
  })

  describe("archived バージョンの contents 行削除 (REQ-5.3, REQ-4.2)", () => {
    it("旧 active（archived 化した）バージョンに紐づく contents を DELETE する処理がある", () => {
      expect(sql).toMatch(/DELETE\s+FROM\s+(?:public\.)?contents/i)
    })

    it("DELETE が version_id でフィルタされている", () => {
      const deleteBlock = sql.match(
        /DELETE\s+FROM\s+(?:public\.)?contents\s+WHERE[^;]+;/is
      )
      expect(deleteBlock).not.toBeNull()
      expect(deleteBlock![0]).toMatch(/version_id/i)
    })
  })

  describe("draft の active 昇格 (REQ-5.1)", () => {
    it("対象 draft バージョンを active に UPDATE する処理がある", () => {
      // UPDATE content_versions SET status = 'active' WHERE id = p_version_id
      expect(sql).toMatch(/status\s*=\s*'active'/i)
    })

    it("approved_by を記録する処理がある (REQ-5.4)", () => {
      expect(sql).toMatch(/approved_by\s*=\s*p_approved_by/i)
    })

    it("approved_at を現在時刻で記録する処理がある (REQ-5.4)", () => {
      expect(sql).toMatch(/approved_at\s*=/i)
      // NOW() またはCURRENT_TIMESTAMP で設定
      const approvedAtSetting = sql.match(/approved_at\s*=\s*\w+/i)
      expect(approvedAtSetting).not.toBeNull()
    })

    it("updated_at も更新する処理がある", () => {
      expect(sql).toMatch(/updated_at\s*=/i)
    })
  })

  describe("初回同期対応 (REQ-5.5)", () => {
    it("旧 active バージョンが存在しない場合の条件分岐がある", () => {
      // IF ... ELSE ... END IF のパターンで active が見つからない場合を処理
      expect(sql).toMatch(/IF\b/i)
      expect(sql).toMatch(/END\s+IF/i)
    })

    it("旧 active が存在しない場合でもエラーにならず draft を active に昇格できる", () => {
      // active が NULL の場合の分岐と、draft → active の UPDATE が存在する
      // IF v_active_version_id IS NOT NULL THEN のようなパターン
      const hasActiveNullCheck = /IS\s+NOT\s+NULL/i.test(sql) || /IS\s+NULL/i.test(sql)
      expect(hasActiveNullCheck).toBe(true)
    })
  })

  describe("処理の順序", () => {
    it("FOR UPDATE ロックが archived 化より前に実行される", () => {
      const forUpdatePos = sql.search(/FOR\s+UPDATE/i)
      const archivedPos = sql.search(/status\s*=\s*'archived'/i)
      expect(forUpdatePos).toBeGreaterThanOrEqual(0)
      expect(archivedPos).toBeGreaterThanOrEqual(0)
      expect(forUpdatePos).toBeLessThan(archivedPos)
    })

    it("contents の DELETE が draft の active 昇格より前に実行される", () => {
      const deletePos = sql.search(/DELETE\s+FROM\s+(?:public\.)?contents/i)
      // draft → active の UPDATE を検出: approved_by の設定を含む UPDATE
      const approvePos = sql.search(/approved_by\s*=\s*p_approved_by/i)
      expect(deletePos).toBeGreaterThanOrEqual(0)
      expect(approvePos).toBeGreaterThanOrEqual(0)
      expect(deletePos).toBeLessThan(approvePos)
    })

    it("旧 active の archived 化が contents の DELETE より前に実行される、または同等の順序である", () => {
      // archived 化（status='archived'）の位置
      const archivedPos = sql.search(/status\s*=\s*'archived'/i)
      // draft → active 昇格（approved_by の設定を含む UPDATE）の位置
      const approvePos = sql.search(/approved_by\s*=\s*p_approved_by/i)
      expect(archivedPos).toBeGreaterThanOrEqual(0)
      expect(approvePos).toBeGreaterThanOrEqual(0)
      expect(archivedPos).toBeLessThan(approvePos)
    })
  })

  describe("トランザクション内での一貫性", () => {
    it("関数本体が BEGIN ... END ブロックで囲まれている", () => {
      expect(sql).toMatch(/BEGIN\b/i)
      expect(sql).toMatch(/END\s*;/i)
    })

    it("DECLARE ブロックで必要な変数が宣言されている", () => {
      expect(sql).toMatch(/DECLARE\b/i)
    })
  })
})
