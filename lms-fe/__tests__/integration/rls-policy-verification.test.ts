import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * RLS ポリシーの統合検証テスト
 *
 * Task 7.3: RLS ポリシーの検証
 * Requirements: 9.1, 9.2, 9.3, 7.1, 7.2
 *
 * マイグレーション SQL のポリシー定義と、受講生向けコンテンツページの
 * version_id フィルタリング実装を構造的に検証する。
 *
 * - User ロールで active バージョンのコンテンツのみ参照可能であることを検証する
 * - User ロールで draft バージョンのコンテンツが参照できないことを検証する
 * - Super Admin ロールで全バージョンのコンテンツを参照可能であることを検証する
 * - Manager ロールでコンテンツにアクセスできないことを検証する
 */

const migrationsDir = path.resolve(
  __dirname,
  "../../supabase/migrations"
)
const contentsPageDir = path.resolve(
  __dirname,
  "../../app/(authenticated)/contents"
)

// --- ヘルパー関数 ---

/** RLS マイグレーションファイルを読み込む */
function readRLSMigrationSQL(): string {
  const filePath = path.join(
    migrationsDir,
    "20260301000002_content_versions_rls.sql"
  )
  if (!existsSync(filePath)) {
    throw new Error(
      `RLS マイグレーションファイルが見つかりません: ${filePath}`
    )
  }
  return readFileSync(filePath, "utf-8")
}

/** 初期コンテンツマイグレーション（元の RLS ポリシー定義）を読み込む */
function readInitialContentsMigrationSQL(): string {
  const filePath = path.join(
    migrationsDir,
    "20260228130000_contents_and_progress.sql"
  )
  if (!existsSync(filePath)) {
    throw new Error(
      `初期コンテンツマイグレーションファイルが見つかりません: ${filePath}`
    )
  }
  return readFileSync(filePath, "utf-8")
}

/** ページファイルを読み込む */
function readPageFile(relativePath: string): string {
  const filePath = path.join(contentsPageDir, relativePath)
  if (!existsSync(filePath)) {
    throw new Error(`ページファイルが見つかりません: ${filePath}`)
  }
  return readFileSync(filePath, "utf-8")
}

/** SQL からポリシーブロックを抽出する */
function extractPolicyBlocks(
  sql: string,
  tableName: string
): string[] {
  const regex = new RegExp(
    `CREATE\\s+POLICY\\s+[^;]*ON\\s+(?:public\\.)?${tableName}[^;]*;`,
    "gis"
  )
  return sql.match(regex) ?? []
}

/** SQL から SELECT ポリシーを抽出する */
function extractSelectPolicy(
  sql: string,
  tableName: string
): string | undefined {
  const blocks = extractPolicyBlocks(sql, tableName)
  return blocks.find((p) => /FOR\s+SELECT/i.test(p))
}

// --- テスト ---

describe("RLS ポリシーの統合検証 (Task 7.3)", () => {
  let rlsSQL: string
  let initialSQL: string

  beforeAll(() => {
    rlsSQL = readRLSMigrationSQL()
    initialSQL = readInitialContentsMigrationSQL()
  })

  // ===========================================
  // 1. content_versions テーブル: RLS 有効化
  // ===========================================
  describe("1. content_versions テーブルの RLS が有効化されている", () => {
    it("ALTER TABLE ... ENABLE ROW LEVEL SECURITY が宣言されている", () => {
      expect(rlsSQL).toMatch(
        /ALTER\s+TABLE\s+(?:public\.)?content_versions\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      )
    })
  })

  // ===========================================
  // 2. content_versions: Super Admin SELECT ポリシー
  // ===========================================
  describe("2. content_versions: Super Admin SELECT ポリシーが正しいロールチェックで存在する", () => {
    it("content_versions に対する SELECT ポリシーが存在する", () => {
      const selectPolicy = extractSelectPolicy(rlsSQL, "content_versions")
      expect(selectPolicy).toBeDefined()
    })

    it("SELECT ポリシーが super_admin ロールのみをチェックしている", () => {
      const selectPolicy = extractSelectPolicy(rlsSQL, "content_versions")
      expect(selectPolicy).toBeDefined()
      expect(selectPolicy!).toMatch(/profiles\.role\s*=\s*'super_admin'/i)
      // user や manager ロールが含まれていないこと
      expect(selectPolicy!).not.toMatch(/'user'/i)
      expect(selectPolicy!).not.toMatch(/'manager'/i)
    })
  })

  // ===========================================
  // 3. content_versions: Super Admin manage (FOR ALL) ポリシー
  // ===========================================
  describe("3. content_versions: Super Admin manage (FOR ALL) ポリシーが存在する", () => {
    it("content_versions に FOR ALL ポリシーが存在する", () => {
      const allPolicies = extractPolicyBlocks(rlsSQL, "content_versions")
      const forAllPolicy = allPolicies.find((p) => /FOR\s+ALL/i.test(p))
      expect(forAllPolicy).toBeDefined()
    })

    it("FOR ALL ポリシーが super_admin ロールに限定されている", () => {
      const allPolicies = extractPolicyBlocks(rlsSQL, "content_versions")
      const forAllPolicy = allPolicies.find((p) => /FOR\s+ALL/i.test(p))
      expect(forAllPolicy).toBeDefined()
      expect(forAllPolicy!).toMatch(/profiles\.role\s*=\s*'super_admin'/i)
    })

    it("FOR ALL ポリシーに USING 句と WITH CHECK 句の両方が存在する", () => {
      const allPolicies = extractPolicyBlocks(rlsSQL, "content_versions")
      const forAllPolicy = allPolicies.find((p) => /FOR\s+ALL/i.test(p))
      expect(forAllPolicy).toBeDefined()
      expect(forAllPolicy!).toMatch(/USING\s*\(/i)
      expect(forAllPolicy!).toMatch(/WITH\s+CHECK\s*\(/i)
    })
  })

  // ===========================================
  // 4. contents テーブル: 旧 users_select_active_contents ポリシーの DROP
  // ===========================================
  describe("4. contents テーブル: 旧 users_select_active_contents ポリシーが DROP されている", () => {
    it("元のマイグレーションに users_select_active_contents ポリシーが存在した", () => {
      // 元のマイグレーションファイルに該当ポリシーが存在したことを確認
      expect(initialSQL).toMatch(/users_select_active_contents/i)
    })

    it("RLS マイグレーションで DROP POLICY が実行されている", () => {
      expect(rlsSQL).toMatch(
        /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?users_select_active_contents"?\s+ON\s+(?:public\.)?contents/i
      )
    })
  })

  // ===========================================
  // 5. contents テーブル: 新 users_select_active_version_contents ポリシー
  // ===========================================
  describe("5. contents テーブル: 新 users_select_active_version_contents ポリシーが存在する", () => {
    it("ポリシー名に 'users_select_active_version_contents' を含む SELECT ポリシーが作成されている", () => {
      expect(rlsSQL).toMatch(/users_select_active_version_contents/i)
      expect(rlsSQL).toMatch(
        /CREATE\s+POLICY\s+.*users_select_active_version_contents.*ON\s+(?:public\.)?contents/is
      )
    })
  })

  // ===========================================
  // 6. 新ポリシーが version_id を active content_version と照合している
  // ===========================================
  describe("6. 新ポリシーが version_id を active content_version と照合している", () => {
    it("ポリシーの USING 句が version_id カラムを参照している", () => {
      const contentsSelectPolicy = extractSelectPolicy(rlsSQL, "contents")
      expect(contentsSelectPolicy).toBeDefined()
      expect(contentsSelectPolicy!).toMatch(/version_id\s*=/i)
    })

    it("サブクエリが content_versions テーブルから active ステータスを検索している", () => {
      const contentsSelectPolicy = extractSelectPolicy(rlsSQL, "contents")
      expect(contentsSelectPolicy).toBeDefined()
      expect(contentsSelectPolicy!).toMatch(
        /SELECT\s+id\s+FROM\s+(?:public\.)?content_versions\s+WHERE\s+status\s*=\s*'active'/i
      )
    })

    it("サブクエリに LIMIT 1 が指定されている（active は最大 1 つの不変条件）", () => {
      const contentsSelectPolicy = extractSelectPolicy(rlsSQL, "contents")
      expect(contentsSelectPolicy).toBeDefined()
      expect(contentsSelectPolicy!).toMatch(/LIMIT\s+1/i)
    })
  })

  // ===========================================
  // 7. User ロール: active バージョンのコンテンツのみ参照可能
  // ===========================================
  describe("7. User ロール: active バージョンのコンテンツのみ参照可能", () => {
    it("contents の新ポリシーが User ロール ('user') を含んでいる", () => {
      const contentsSelectPolicy = extractSelectPolicy(rlsSQL, "contents")
      expect(contentsSelectPolicy).toBeDefined()
      expect(contentsSelectPolicy!).toMatch(/profiles\.role\s*=\s*'user'/i)
    })

    it("User ロールのアクセスが version_id 条件と AND で結合されている", () => {
      const contentsSelectPolicy = extractSelectPolicy(rlsSQL, "contents")
      expect(contentsSelectPolicy).toBeDefined()
      // USING 句内に role チェックと version_id チェックの両方が AND で結合されている
      // (EXISTS(...role = 'user'...) AND version_id = (...))
      expect(contentsSelectPolicy!).toMatch(/AND\s+version_id\s*=/i)
    })

    it("User は active 以外（draft/archived）のバージョンのコンテンツにはアクセスできない構造である", () => {
      // version_id = (SELECT id FROM content_versions WHERE status = 'active' LIMIT 1)
      // このサブクエリは active のみを返すため、draft や archived の version_id に一致するレコードは返されない
      const contentsSelectPolicy = extractSelectPolicy(rlsSQL, "contents")
      expect(contentsSelectPolicy).toBeDefined()

      // 'draft' や 'archived' が条件に含まれていないことを確認
      // （active のみをサブクエリで取得するため、暗黙的に draft/archived は除外される）
      expect(contentsSelectPolicy!).not.toMatch(/status\s*=\s*'draft'/i)
      expect(contentsSelectPolicy!).not.toMatch(/status\s*=\s*'archived'/i)
    })
  })

  // ===========================================
  // 8. Manager ロール: コンテンツにアクセスできない
  // ===========================================
  describe("8. Manager ロール: コンテンツにアクセスできない", () => {
    it("contents テーブルのどのポリシーにも Manager ロールが含まれていない", () => {
      const contentsPolicies = extractPolicyBlocks(rlsSQL, "contents")
      for (const policy of contentsPolicies) {
        expect(policy).not.toMatch(/profiles\.role\s*=\s*'manager'/i)
        // IN リスト内にも manager が含まれないこと
        const roleInList = policy.match(
          /profiles\.role\s+IN\s*\([^)]+\)/i
        )
        if (roleInList) {
          expect(roleInList[0]).not.toMatch(/'manager'/i)
        }
      }
    })

    it("content_versions テーブルのどのポリシーにも Manager ロールが含まれていない", () => {
      const cvPolicies = extractPolicyBlocks(rlsSQL, "content_versions")
      for (const policy of cvPolicies) {
        expect(policy).not.toMatch(/profiles\.role\s*=\s*'manager'/i)
        const roleInList = policy.match(
          /profiles\.role\s+IN\s*\([^)]+\)/i
        )
        if (roleInList) {
          expect(roleInList[0]).not.toMatch(/'manager'/i)
        }
      }
    })

    it("元のマイグレーションでも Manager 向けポリシーは意図的に作成されていなかった（コメントで明記）", () => {
      // 初期マイグレーションで Manager ロールへのアクセスを意図的に拒否していたことを確認
      expect(initialSQL).toMatch(
        /Manager.*ポリシー.*作成しない|Manager.*デフォルト拒否/i
      )
    })
  })

  // ===========================================
  // 9. Super Admin: 既存の全アクセスポリシーが維持されている
  // ===========================================
  describe("9. Super Admin: 既存の全アクセスポリシーが維持されている", () => {
    it("元のマイグレーションに super_admin_select_all_contents ポリシーが存在する", () => {
      expect(initialSQL).toMatch(/super_admin_select_all_contents/i)
    })

    it("RLS マイグレーションで super_admin_select_all_contents が DROP されていない", () => {
      expect(rlsSQL).not.toMatch(
        /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?super_admin_select_all_contents"?/i
      )
    })

    it("Super Admin の全操作ポリシー（contents テーブル）が影響を受けていない", () => {
      // super_admin を含む manage 系ポリシーの DROP がないことを確認
      expect(rlsSQL).not.toMatch(
        /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?"?super_admin.*manage.*contents"?/i
      )
    })
  })

  // ===========================================
  // 10-12. コンテンツページの version_id フィルタリング検証
  // ===========================================
  describe("コンテンツページが version_id ベースのフィルタリングを使用している", () => {
    describe("10. contents/page.tsx が .eq('version_id', ...) を使用している", () => {
      let pageSource: string

      beforeAll(() => {
        pageSource = readPageFile("page.tsx")
      })

      it("version_id でフィルタリングしている", () => {
        expect(pageSource).toMatch(/\.eq\(\s*["']version_id["']/i)
      })

      it("旧来の .eq('status', 'active') フィルタを使用していない", () => {
        // .eq("status", "active") のパターンがないことを確認
        expect(pageSource).not.toMatch(
          /\.eq\(\s*["']status["']\s*,\s*["']active["']\s*\)/i
        )
      })

      it("resolveVersionId ユーティリティを使用している", () => {
        expect(pageSource).toMatch(/resolveVersionId/i)
      })

      it("activeVersionId を使用して全コンテンツクエリをフィルタリングしている", () => {
        // activeVersionId 変数が使用されていること
        expect(pageSource).toMatch(/activeVersionId/)
      })
    })

    describe("11. contents/[tutorial]/page.tsx が version_id でフィルタリングしている", () => {
      let pageSource: string

      beforeAll(() => {
        pageSource = readPageFile("[tutorial]/page.tsx")
      })

      it("version_id でフィルタリングしている", () => {
        expect(pageSource).toMatch(/\.eq\(\s*["']version_id["']/i)
      })

      it("旧来の .eq('status', 'active') フィルタを使用していない", () => {
        expect(pageSource).not.toMatch(
          /\.eq\(\s*["']status["']\s*,\s*["']active["']\s*\)/i
        )
      })

      it("resolveVersionId ユーティリティを使用している", () => {
        expect(pageSource).toMatch(/resolveVersionId/i)
      })
    })

    describe("12. contents/[tutorial]/[chapter]/[section]/page.tsx が version_id でフィルタリングしている", () => {
      let pageSource: string

      beforeAll(() => {
        pageSource = readPageFile(
          "[tutorial]/[chapter]/[section]/page.tsx"
        )
      })

      it("version_id でフィルタリングしている", () => {
        expect(pageSource).toMatch(/\.eq\(\s*["']version_id["']/i)
      })

      it("旧来の .eq('status', 'active') フィルタを使用していない", () => {
        expect(pageSource).not.toMatch(
          /\.eq\(\s*["']status["']\s*,\s*["']active["']\s*\)/i
        )
      })

      it("resolveVersionId ユーティリティを使用している", () => {
        expect(pageSource).toMatch(/resolveVersionId/i)
      })

      it("複数のクエリ全てに version_id フィルタが適用されている", () => {
        // セクションコンテンツ、チュートリアルデータ、チャプターデータ、兄弟セクション
        // 少なくとも 4 つの .eq("version_id", ...) が存在すること
        const versionIdMatches = pageSource.match(
          /\.eq\(\s*["']version_id["']/gi
        )
        expect(versionIdMatches).not.toBeNull()
        expect(versionIdMatches!.length).toBeGreaterThanOrEqual(4)
      })
    })
  })

  // ===========================================
  // RLS ポリシー定義の一貫性検証
  // ===========================================
  describe("RLS ポリシー定義の一貫性", () => {
    it("新ポリシーの User ロール条件と version_id 条件が AND で結合されている（OR ではない）", () => {
      const contentsSelectPolicy = extractSelectPolicy(rlsSQL, "contents")
      expect(contentsSelectPolicy).toBeDefined()

      // USING 句全体に version_id と role チェックが存在し、AND で結合されていること
      // OR で結合されていないことを検証（OR だと Manager や未認証ユーザーもアクセスできてしまう可能性）
      const usingClause = contentsSelectPolicy!.match(
        /USING\s*\(([\s\S]*)\)\s*;/i
      )
      expect(usingClause).not.toBeNull()
      // role チェック EXISTS ブロックと version_id チェックが AND で接続
      expect(usingClause![1]).toMatch(/EXISTS[\s\S]*AND\s+version_id/i)
    })

    it("content_versions の全ポリシーが authenticated ロールを対象としている", () => {
      const cvPolicies = extractPolicyBlocks(rlsSQL, "content_versions")
      expect(cvPolicies.length).toBeGreaterThan(0)
      for (const policy of cvPolicies) {
        expect(policy).toMatch(/TO\s+authenticated/i)
      }
    })

    it("contents の新ポリシーが authenticated ロールを対象としている", () => {
      const contentsSelectPolicy = extractSelectPolicy(rlsSQL, "contents")
      expect(contentsSelectPolicy).toBeDefined()
      expect(contentsSelectPolicy!).toMatch(/TO\s+authenticated/i)
    })
  })
})
