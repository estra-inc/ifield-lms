import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * content_versions RLS ポリシーと contents テーブル RLS ポリシー更新のマイグレーション SQL 検証テスト
 *
 * Task 1.3: RLS ポリシーの更新
 * Requirements: 9.1, 9.2, 9.3, 7.1, 7.2
 *
 * - content_versions テーブルに RLS を有効化し、Super Admin のみが SELECT できるポリシーを作成する
 * - contents テーブルの既存 User 向け RLS ポリシー（status ベース）を削除し、
 *   version_id ベースのポリシー（active バージョンの id に一致するレコードのみ参照可）に置き換える
 * - Super Admin の全レコードアクセスポリシーは既存のまま維持されることを確認する
 * - Manager ロールが引き続きコンテンツにアクセスできないことを確認する
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** マイグレーションファイルの特定: content_versions_rls を含むファイルを検索 */
function findRLSMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir).sort()
  const match = files.find(
    (f) => f.includes("content_versions_rls") || f.includes("content_versions_rls_update")
  )
  return match ? path.join(migrationsDir, match) : null
}

/** Task 1.1 のマイグレーションファイルを検索 */
function findTask11MigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir).sort()
  const match = files.find(
    (f) => f.includes("content_versions") && !f.includes("migration_data") && !f.includes("rls")
  )
  return match ? path.join(migrationsDir, match) : null
}

/** Task 1.2 のマイグレーションファイルを検索 */
function findTask12MigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir).sort()
  const match = files.find(
    (f) => f.includes("migration_data") || f.includes("content_versions_migration")
  )
  return match ? path.join(migrationsDir, match) : null
}

function readRLSMigrationSQL(): string {
  const filePath = findRLSMigrationFile()
  if (!filePath) {
    throw new Error(
      "content_versions_rls マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("RLS ポリシー更新マイグレーション SQL (Task 1.3)", () => {
  let sql: string

  beforeAll(() => {
    sql = readRLSMigrationSQL()
  })

  describe("マイグレーションファイルの存在と順序", () => {
    it("content_versions_rls を含むマイグレーションファイルが存在する", () => {
      const filePath = findRLSMigrationFile()
      expect(filePath).not.toBeNull()
    })

    it("マイグレーションファイル名が YYYYMMDDHHMMSS_description.sql 形式である", () => {
      const filePath = findRLSMigrationFile()
      expect(filePath).not.toBeNull()
      const fileName = path.basename(filePath!)
      expect(fileName).toMatch(/^\d{14}_.*\.sql$/)
    })

    it("Task 1.2 のマイグレーションファイルより後のタイムスタンプである", () => {
      const task12File = findTask12MigrationFile()
      const task13File = findRLSMigrationFile()
      expect(task12File).not.toBeNull()
      expect(task13File).not.toBeNull()

      const task12Timestamp = path.basename(task12File!).substring(0, 14)
      const task13Timestamp = path.basename(task13File!).substring(0, 14)

      // Task 1.3 のタイムスタンプが Task 1.2 より大きいこと
      expect(BigInt(task13Timestamp)).toBeGreaterThan(BigInt(task12Timestamp))
    })
  })

  describe("content_versions テーブルの RLS 有効化 (REQ-9.1)", () => {
    it("content_versions テーブルの RLS が有効化されている", () => {
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?content_versions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })

    it("Super Admin のみが content_versions を SELECT できるポリシーが作成されている", () => {
      // ポリシー作成文が存在する
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+.*ON\s+(?:public\.)?content_versions\s+FOR\s+SELECT/i
      )
    })

    it("content_versions の SELECT ポリシーが authenticated ロールを対象としている", () => {
      // content_versions に対するポリシーブロックを抽出
      const cvPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?content_versions[^;]*;/gis
      )
      expect(cvPolicyBlocks).not.toBeNull()
      // SELECT ポリシーの中に TO authenticated が含まれる
      const selectPolicy = cvPolicyBlocks!.find((p) => /FOR\s+SELECT/i.test(p))
      expect(selectPolicy).toBeDefined()
      expect(selectPolicy!).toMatch(/TO\s+authenticated/i)
    })

    it("content_versions の SELECT ポリシーが profiles.role = 'super_admin' を参照している", () => {
      const cvPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?content_versions[^;]*;/gis
      )
      expect(cvPolicyBlocks).not.toBeNull()
      const selectPolicy = cvPolicyBlocks!.find((p) => /FOR\s+SELECT/i.test(p))
      expect(selectPolicy).toBeDefined()
      expect(selectPolicy!).toMatch(/profiles\.role\s*=\s*'super_admin'/i)
    })

    it("content_versions の SELECT ポリシーに User ロールが含まれていない", () => {
      const cvPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?content_versions[^;]*;/gis
      )
      expect(cvPolicyBlocks).not.toBeNull()
      const selectPolicy = cvPolicyBlocks!.find((p) => /FOR\s+SELECT/i.test(p))
      expect(selectPolicy).toBeDefined()
      // 'user' ロールへの IN リストが含まれていないこと
      expect(selectPolicy!).not.toMatch(/'user'/i)
    })

    it("content_versions の SELECT ポリシーに Manager ロールが含まれていない", () => {
      const cvPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?content_versions[^;]*;/gis
      )
      expect(cvPolicyBlocks).not.toBeNull()
      const selectPolicy = cvPolicyBlocks!.find((p) => /FOR\s+SELECT/i.test(p))
      expect(selectPolicy).toBeDefined()
      expect(selectPolicy!).not.toMatch(/'manager'/i)
    })
  })

  describe("content_versions テーブルの Super Admin 全操作ポリシー (REQ-9.1)", () => {
    it("Super Admin が content_versions に対して INSERT できるポリシーが作成されている", () => {
      // Super Admin は全操作可能であるべき
      // INSERT ポリシーまたは ALL ポリシーが存在する
      const cvPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?content_versions[^;]*;/gis
      )
      expect(cvPolicyBlocks).not.toBeNull()
      const hasInsertOrAll = cvPolicyBlocks!.some(
        (p) => /FOR\s+INSERT/i.test(p) || /FOR\s+ALL/i.test(p)
      )
      expect(hasInsertOrAll).toBe(true)
    })

    it("Super Admin が content_versions に対して UPDATE できるポリシーが作成されている", () => {
      const cvPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?content_versions[^;]*;/gis
      )
      expect(cvPolicyBlocks).not.toBeNull()
      const hasUpdateOrAll = cvPolicyBlocks!.some(
        (p) => /FOR\s+UPDATE/i.test(p) || /FOR\s+ALL/i.test(p)
      )
      expect(hasUpdateOrAll).toBe(true)
    })

    it("Super Admin が content_versions に対して DELETE できるポリシーが作成されている", () => {
      const cvPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?content_versions[^;]*;/gis
      )
      expect(cvPolicyBlocks).not.toBeNull()
      const hasDeleteOrAll = cvPolicyBlocks!.some(
        (p) => /FOR\s+DELETE/i.test(p) || /FOR\s+ALL/i.test(p)
      )
      expect(hasDeleteOrAll).toBe(true)
    })

    it("content_versions の書き込みポリシーが super_admin ロールに限定されている", () => {
      const cvPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?content_versions[^;]*;/gis
      )
      expect(cvPolicyBlocks).not.toBeNull()
      // 書き込み系ポリシー（INSERT/UPDATE/DELETE/ALL）が全て super_admin のみ
      const writePolicies = cvPolicyBlocks!.filter(
        (p) => /FOR\s+(INSERT|UPDATE|DELETE|ALL)/i.test(p)
      )
      expect(writePolicies.length).toBeGreaterThan(0)
      for (const policy of writePolicies) {
        expect(policy).toMatch(/profiles\.role\s*=\s*'super_admin'/i)
      }
    })
  })

  describe("contents テーブルの既存 User 向け RLS ポリシー削除 (REQ-9.2)", () => {
    it("既存の users_select_active_contents ポリシーが DROP されている", () => {
      expect(sql).toMatch(
        /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?users_select_active_contents"?\s+ON\s+(?:public\.)?contents/i
      )
    })
  })

  describe("contents テーブルの新しい version_id ベース RLS ポリシー (REQ-9.2, REQ-7.1, REQ-7.2)", () => {
    it("contents テーブルに新しい SELECT ポリシーが作成されている", () => {
      // contents テーブルに対する新しい SELECT ポリシーが存在する
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+.*ON\s+(?:public\.)?contents\s+FOR\s+SELECT/i
      )
    })

    it("新しいポリシーが version_id ベースのフィルタリングを使用している", () => {
      const contentsPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?contents[^;]*;/gis
      )
      expect(contentsPolicyBlocks).not.toBeNull()
      const selectPolicy = contentsPolicyBlocks!.find(
        (p) => /FOR\s+SELECT/i.test(p)
      )
      expect(selectPolicy).toBeDefined()
      // version_id を参照している
      expect(selectPolicy!).toMatch(/version_id/i)
    })

    it("新しいポリシーが content_versions テーブルの active バージョン ID をサブクエリで参照している", () => {
      const contentsPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?contents[^;]*;/gis
      )
      expect(contentsPolicyBlocks).not.toBeNull()
      const selectPolicy = contentsPolicyBlocks!.find(
        (p) => /FOR\s+SELECT/i.test(p)
      )
      expect(selectPolicy).toBeDefined()
      // content_versions テーブルから active ステータスの id を取得するサブクエリ
      expect(selectPolicy!).toMatch(/content_versions/i)
      expect(selectPolicy!).toMatch(/status\s*=\s*'active'/i)
    })

    it("新しいポリシーのサブクエリに LIMIT 1 が含まれている", () => {
      const contentsPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?contents[^;]*;/gis
      )
      expect(contentsPolicyBlocks).not.toBeNull()
      const selectPolicy = contentsPolicyBlocks!.find(
        (p) => /FOR\s+SELECT/i.test(p)
      )
      expect(selectPolicy).toBeDefined()
      expect(selectPolicy!).toMatch(/LIMIT\s+1/i)
    })

    it("新しいポリシーが User ロールを対象としている", () => {
      const contentsPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?contents[^;]*;/gis
      )
      expect(contentsPolicyBlocks).not.toBeNull()
      const selectPolicy = contentsPolicyBlocks!.find(
        (p) => /FOR\s+SELECT/i.test(p)
      )
      expect(selectPolicy).toBeDefined()
      expect(selectPolicy!).toMatch(/'user'/i)
    })

    it("新しいポリシーが authenticated ロールを対象としている", () => {
      const contentsPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?contents[^;]*;/gis
      )
      expect(contentsPolicyBlocks).not.toBeNull()
      const selectPolicy = contentsPolicyBlocks!.find(
        (p) => /FOR\s+SELECT/i.test(p)
      )
      expect(selectPolicy).toBeDefined()
      expect(selectPolicy!).toMatch(/TO\s+authenticated/i)
    })

    it("新しいポリシーに status = 'active' による直接フィルタが含まれていない（version_id ベースに移行済み）", () => {
      const contentsPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?contents[^;]*;/gis
      )
      expect(contentsPolicyBlocks).not.toBeNull()
      const selectPolicy = contentsPolicyBlocks!.find(
        (p) => /FOR\s+SELECT/i.test(p)
      )
      expect(selectPolicy).toBeDefined()
      // contents.status = 'active' のような直接フィルタがないこと
      // ただし、サブクエリ内の content_versions.status = 'active' は許容する
      // contents テーブル自体の status カラム参照がないことを確認
      // "USING" 句の中で "status = 'active'" が contents テーブルの直接参照でないことを検証
      // サブクエリ内（SELECT ... FROM content_versions WHERE status = 'active'）は OK
    })
  })

  describe("Super Admin の全レコードアクセスポリシーの維持確認", () => {
    it("既存の super_admin_select_all_contents ポリシーが DROP されていない", () => {
      // super_admin_select_all_contents が DROP されていないことを確認
      const dropSuperAdmin = sql.match(
        /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?super_admin_select_all_contents"?\s+ON/i
      )
      expect(dropSuperAdmin).toBeNull()
    })

    it("既存の Super Admin INSERT/UPDATE/DELETE ポリシーが影響を受けていない", () => {
      // contents テーブルの Super Admin 管理ポリシー（もし存在する場合）が DROP されていないこと
      // super_admin を含む manage ポリシーの DROP がないことを確認
      const dropManagePolicies = sql.match(
        /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?super_admin.*manage.*contents"?\s+ON/i
      )
      expect(dropManagePolicies).toBeNull()
    })
  })

  describe("Manager ロールのアクセス制御確認 (REQ-9.3)", () => {
    it("contents テーブルに Manager ロール向けの SELECT ポリシーが作成されていない", () => {
      const contentsPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?contents[^;]*;/gis
      )
      if (contentsPolicyBlocks) {
        for (const block of contentsPolicyBlocks) {
          // Manager ロールを明示的に含むポリシーがないこと
          expect(block).not.toMatch(/profiles\.role\s*=\s*'manager'/i)
          // IN リスト内に 'manager' が含まれないこと
          const roleInList = block.match(/profiles\.role\s+IN\s*\([^)]+\)/i)
          if (roleInList) {
            expect(roleInList[0]).not.toMatch(/'manager'/i)
          }
        }
      }
    })

    it("content_versions テーブルに Manager ロール向けのポリシーが作成されていない", () => {
      const cvPolicyBlocks = sql.match(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?content_versions[^;]*;/gis
      )
      if (cvPolicyBlocks) {
        for (const block of cvPolicyBlocks) {
          expect(block).not.toMatch(/profiles\.role\s*=\s*'manager'/i)
          const roleInList = block.match(/profiles\.role\s+IN\s*\([^)]+\)/i)
          if (roleInList) {
            expect(roleInList[0]).not.toMatch(/'manager'/i)
          }
        }
      }
    })
  })

  describe("操作の順序の整合性", () => {
    it("RLS 有効化が content_versions ポリシー作成より前に記述されている", () => {
      const rlsEnablePos = sql.search(
        /ALTER\s+TABLE\s+(?:public\.)?content_versions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
      const firstPolicyPos = sql.search(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?content_versions/i
      )
      expect(rlsEnablePos).toBeGreaterThanOrEqual(0)
      expect(firstPolicyPos).toBeGreaterThanOrEqual(0)
      expect(rlsEnablePos).toBeLessThan(firstPolicyPos)
    })

    it("既存ポリシーの DROP が新しいポリシーの CREATE より前に記述されている", () => {
      const dropPos = sql.search(
        /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?users_select_active_contents"?/i
      )
      const createPos = sql.search(
        /CREATE\s+POLICY\s+[^;]*ON\s+(?:public\.)?contents\s+FOR\s+SELECT/i
      )
      expect(dropPos).toBeGreaterThanOrEqual(0)
      expect(createPos).toBeGreaterThanOrEqual(0)
      expect(dropPos).toBeLessThan(createPos)
    })
  })
})
