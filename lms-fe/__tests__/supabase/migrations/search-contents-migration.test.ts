import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * search_contents マイグレーションの SQL 検証テスト
 *
 * Task 1: pg_trgm 拡張・GIN インデックス・search_contents RPC 関数
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.2, 3.3, 3.4, 4.3, 6.2, 6.3, 7.2, 7.4, 8.1, 8.2, 8.3
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** マイグレーションファイルの特定: search_contents を含むファイルを検索 */
function findMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir)
  const match = files.find((f) => f.includes("search_contents"))
  return match ? path.join(migrationsDir, match) : null
}

function readMigrationSQL(): string {
  const filePath = findMigrationFile()
  if (!filePath) {
    throw new Error(
      "search_contents マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("search_contents マイグレーション SQL (Task 1)", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationSQL()
  })

  // ==============================
  // マイグレーションファイルの存在と命名規約
  // ==============================
  describe("マイグレーションファイルの存在", () => {
    it("search_contents を含むマイグレーションファイルが存在する", () => {
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

  // ==============================
  // Req 1.1: pg_trgm 拡張の有効化
  // ==============================
  describe("pg_trgm 拡張の有効化 (Req 1.1)", () => {
    it("CREATE EXTENSION IF NOT EXISTS pg_trgm が含まれる", () => {
      expect(sql).toMatch(
        /CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+pg_trgm/i
      )
    })
  })

  // ==============================
  // Req 1.2: title カラムの GIN インデックス
  // ==============================
  describe("title カラムの GIN インデックス (Req 1.2, 8.1)", () => {
    it("contents.title に GIN (gin_trgm_ops) インデックスが作成される", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+\w+\s+ON\s+(?:public\.)?contents\s+USING\s+GIN\s*\(\s*title\s+gin_trgm_ops\s*\)/i
      )
    })
  })

  // ==============================
  // Req 1.3: body カラムの GIN インデックス
  // ==============================
  describe("body カラムの GIN インデックス (Req 1.3, 8.1)", () => {
    it("contents.body に GIN (gin_trgm_ops) インデックスが作成される", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+\w+\s+ON\s+(?:public\.)?contents\s+USING\s+GIN\s*\(\s*body\s+gin_trgm_ops\s*\)/i
      )
    })
  })

  // ==============================
  // search_contents RPC 関数の作成
  // ==============================
  describe("search_contents RPC 関数", () => {
    it("search_contents 関数の CREATE FUNCTION 文が存在する", () => {
      expect(sql).toMatch(
        /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?search_contents\s*\(/i
      )
    })

    // パラメータ定義
    describe("パラメータ定義", () => {
      it("search_query TEXT パラメータが定義されている", () => {
        const funcBlock = sql.match(
          /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?search_contents\s*\([^)]+\)/is
        )
        expect(funcBlock).not.toBeNull()
        expect(funcBlock![0]).toMatch(/search_query\s+TEXT/i)
      })

      it("result_limit INTEGER DEFAULT 5 パラメータが定義されている", () => {
        const funcBlock = sql.match(
          /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?search_contents\s*\([^)]+\)/is
        )
        expect(funcBlock).not.toBeNull()
        expect(funcBlock![0]).toMatch(
          /result_limit\s+INTEGER\s+DEFAULT\s+5/i
        )
      })

      it("score_threshold REAL DEFAULT 0.1 パラメータが定義されている", () => {
        const funcBlock = sql.match(
          /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?search_contents\s*\([^)]+\)/is
        )
        expect(funcBlock).not.toBeNull()
        expect(funcBlock![0]).toMatch(
          /score_threshold\s+REAL\s+DEFAULT\s+0\.1/i
        )
      })
    })

    // 戻り値定義
    describe("戻り値定義 (Req 6.3)", () => {
      it("RETURNS TABLE が定義されている", () => {
        expect(sql).toMatch(/RETURNS\s+TABLE\s*\(/i)
      })

      it("戻り値に id UUID が含まれる", () => {
        const returnsBlock = sql.match(
          /RETURNS\s+TABLE\s*\([^)]+\)/is
        )
        expect(returnsBlock).not.toBeNull()
        expect(returnsBlock![0]).toMatch(/id\s+UUID/i)
      })

      it("戻り値に title TEXT が含まれる", () => {
        const returnsBlock = sql.match(
          /RETURNS\s+TABLE\s*\([^)]+\)/is
        )
        expect(returnsBlock).not.toBeNull()
        expect(returnsBlock![0]).toMatch(/title\s+TEXT/i)
      })

      it("戻り値に snippet TEXT が含まれる", () => {
        const returnsBlock = sql.match(
          /RETURNS\s+TABLE\s*\([^)]+\)/is
        )
        expect(returnsBlock).not.toBeNull()
        expect(returnsBlock![0]).toMatch(/snippet\s+TEXT/i)
      })

      it("戻り値に genre TEXT が含まれる", () => {
        const returnsBlock = sql.match(
          /RETURNS\s+TABLE\s*\([^)]+\)/is
        )
        expect(returnsBlock).not.toBeNull()
        expect(returnsBlock![0]).toMatch(/genre\s+TEXT/i)
      })

      it("戻り値に tutorial TEXT が含まれる", () => {
        const returnsBlock = sql.match(
          /RETURNS\s+TABLE\s*\([^)]+\)/is
        )
        expect(returnsBlock).not.toBeNull()
        expect(returnsBlock![0]).toMatch(/tutorial\s+TEXT/i)
      })

      it("戻り値に chapter TEXT が含まれる", () => {
        const returnsBlock = sql.match(
          /RETURNS\s+TABLE\s*\([^)]+\)/is
        )
        expect(returnsBlock).not.toBeNull()
        expect(returnsBlock![0]).toMatch(/chapter\s+TEXT/i)
      })

      it("戻り値に section TEXT が含まれる", () => {
        const returnsBlock = sql.match(
          /RETURNS\s+TABLE\s*\([^)]+\)/is
        )
        expect(returnsBlock).not.toBeNull()
        expect(returnsBlock![0]).toMatch(/section\s+TEXT/i)
      })

      it("戻り値に genre_title TEXT が含まれる", () => {
        const returnsBlock = sql.match(
          /RETURNS\s+TABLE\s*\([^)]+\)/is
        )
        expect(returnsBlock).not.toBeNull()
        expect(returnsBlock![0]).toMatch(/genre_title\s+TEXT/i)
      })

      it("戻り値に tutorial_title TEXT が含まれる", () => {
        const returnsBlock = sql.match(
          /RETURNS\s+TABLE\s*\([^)]+\)/is
        )
        expect(returnsBlock).not.toBeNull()
        expect(returnsBlock![0]).toMatch(/tutorial_title\s+TEXT/i)
      })

      it("戻り値に chapter_title TEXT が含まれる", () => {
        const returnsBlock = sql.match(
          /RETURNS\s+TABLE\s*\([^)]+\)/is
        )
        expect(returnsBlock).not.toBeNull()
        expect(returnsBlock![0]).toMatch(/chapter_title\s+TEXT/i)
      })

      it("戻り値に score REAL が含まれる", () => {
        const returnsBlock = sql.match(
          /RETURNS\s+TABLE\s*\([^)]+\)/is
        )
        expect(returnsBlock).not.toBeNull()
        expect(returnsBlock![0]).toMatch(/score\s+REAL/i)
      })
    })

    // 検索ロジック
    describe("検索ロジック", () => {
      it("content_type = 'section' でフィルタリングしている (Req 1.4, 3.4)", () => {
        expect(sql).toMatch(/content_type\s*=\s*'section'/i)
      })

      it("active バージョンの content_versions を参照している (Req 7.2)", () => {
        expect(sql).toMatch(/content_versions/i)
        expect(sql).toMatch(/status\s*=\s*'active'/i)
      })

      it("similarity 関数を使用している (Req 3.2, 6.2)", () => {
        expect(sql).toMatch(/similarity\s*\(/i)
      })

      it("title の重み付け係数が 3 である (Req 3.2)", () => {
        // similarity(title, ...) * 3 のパターンを検出
        expect(sql).toMatch(/similarity\s*\(\s*(?:c\.)?title\s*,\s*search_query\s*\)\s*\*\s*3/i)
      })

      it("body の重み付け係数が 1 である (Req 3.2)", () => {
        // similarity(body, ...) * 1 または similarity(body, ...) のパターンを検出
        expect(sql).toMatch(/similarity\s*\(\s*(?:c\.)?body\s*,\s*search_query\s*\)\s*\*\s*1/i)
      })

      it("スコア閾値によるフィルタリングが実装されている (Req 8.3)", () => {
        expect(sql).toMatch(/score_threshold/i)
      })

      it("最低1件保証のための UNION ALL フォールバックが実装されている (Req 8.3)", () => {
        expect(sql).toMatch(/UNION\s+ALL/i)
      })

      it("スニペットとして body の冒頭100文字を切り出している (Req 4.3)", () => {
        expect(sql).toMatch(/LEFT\s*\(\s*(?:c\.)?body\s*,\s*100\s*\)/i)
      })

      it("結果をスコア降順でソートしている", () => {
        expect(sql).toMatch(/ORDER\s+BY\s+score\s+DESC/i)
      })

      it("result_limit で結果件数を制限している (Req 3.3)", () => {
        expect(sql).toMatch(/LIMIT\s+result_limit/i)
      })
    })

    // 階層タイトルの取得
    describe("階層タイトルの取得", () => {
      it("genre タイトルをサブクエリで取得している", () => {
        // genre_title を取得するサブクエリの存在を確認
        expect(sql).toMatch(/genre_title/i)
        expect(sql).toMatch(/content_type\s*=\s*'genre'/i)
      })

      it("tutorial タイトルをサブクエリで取得している", () => {
        expect(sql).toMatch(/tutorial_title/i)
        expect(sql).toMatch(/content_type\s*=\s*'tutorial'/i)
      })

      it("chapter タイトルをサブクエリで取得している", () => {
        expect(sql).toMatch(/chapter_title/i)
        expect(sql).toMatch(/content_type\s*=\s*'chapter'/i)
      })
    })

    // セキュリティ
    describe("セキュリティ (Req 7.4)", () => {
      it("SECURITY INVOKER で作成されている", () => {
        expect(sql).toMatch(/SECURITY\s+INVOKER/i)
      })

      it("パラメータ化クエリを使用している（動的 SQL なし）", () => {
        // EXECUTE や format() による動的 SQL がないことを確認
        expect(sql).not.toMatch(/\bEXECUTE\b/i)
        expect(sql).not.toMatch(/\bformat\s*\(/i)
      })
    })

    // 言語設定
    describe("関数設定", () => {
      it("LANGUAGE plpgsql または sql で定義されている", () => {
        expect(sql).toMatch(/LANGUAGE\s+(?:plpgsql|sql)/i)
      })
    })
  })
})
