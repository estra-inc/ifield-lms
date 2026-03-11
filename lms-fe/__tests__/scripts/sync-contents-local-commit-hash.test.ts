import { readFileSync } from "fs"
import path from "path"

/**
 * sync-contents-local.mjs: commit_hash 対応テスト
 *
 * Task 3.2: ローカル同期スクリプトの更新
 * Requirements: 6.3
 *
 * - sync-contents-local.mjs で child_process.execSync('git rev-parse HEAD') を使用して
 *   HEAD のコミットハッシュを取得する
 * - 取得したコミットハッシュを同期 API リクエストのペイロードに含める
 * - git コマンド失敗時は 'unknown' をフォールバック値として使用する
 */

const scriptPath = path.resolve(
  __dirname,
  "../../../scripts/sync-contents-local.mjs"
)

function readScript(): string {
  return readFileSync(scriptPath, "utf-8")
}

describe("sync-contents-local.mjs commit_hash 対応 (Task 3.2)", () => {
  let scriptContent: string

  beforeAll(() => {
    scriptContent = readScript()
  })

  describe("child_process のインポート", () => {
    it("execSync を child_process からインポートしている", () => {
      // import { execSync } from "child_process" または
      // import { execSync } from 'child_process' のパターンを確認
      expect(scriptContent).toMatch(
        /import\s+\{[^}]*execSync[^}]*\}\s+from\s+["']child_process["']/
      )
    })
  })

  describe("コミットハッシュの取得", () => {
    it("git rev-parse HEAD コマンドを execSync で実行している", () => {
      expect(scriptContent).toMatch(/execSync\s*\(\s*["']git rev-parse HEAD["']/)
    })

    it("execSync の結果を trim() で整形している", () => {
      // execSync(...).trim() または encoding: 'utf-8' 指定後の .trim()
      expect(scriptContent).toMatch(/\.trim\(\)/)
    })

    it("encoding オプションに utf-8 を指定している", () => {
      // execSync('git rev-parse HEAD', { encoding: 'utf-8' }) のパターン
      expect(scriptContent).toMatch(
        /execSync\s*\(\s*["']git rev-parse HEAD["']\s*,\s*\{[^}]*encoding\s*:\s*["']utf-8["'][^}]*\}/
      )
    })
  })

  describe("git コマンド失敗時のフォールバック", () => {
    it("try-catch ブロックで git コマンドの失敗をハンドリングしている", () => {
      // try { ... execSync ... } catch のパターン
      expect(scriptContent).toMatch(/try\s*\{/)
      expect(scriptContent).toMatch(/catch\s*\(/)
    })

    it("git コマンド失敗時に 'unknown' をフォールバック値として設定している", () => {
      // catch ブロック内で 'unknown' を代入するパターン
      expect(scriptContent).toMatch(/["']unknown["']/)
    })
  })

  describe("ペイロードへの commit_hash 追加", () => {
    it("JSON.stringify のペイロードに commit_hash フィールドが含まれている", () => {
      // body: JSON.stringify({ contents, commit_hash: ... }) のパターン
      // JSON.stringify 呼び出し内に commit_hash が存在すること
      const jsonStringifyMatch = scriptContent.match(
        /JSON\.stringify\s*\(\s*\{([^}]*)\}\s*\)/s
      )
      expect(jsonStringifyMatch).not.toBeNull()
      expect(jsonStringifyMatch![1]).toMatch(/commit_hash/)
    })

    it("ペイロードに contents フィールドも維持されている", () => {
      const jsonStringifyMatch = scriptContent.match(
        /JSON\.stringify\s*\(\s*\{([^}]*)\}\s*\)/s
      )
      expect(jsonStringifyMatch).not.toBeNull()
      expect(jsonStringifyMatch![1]).toMatch(/contents/)
    })
  })

  describe("既存機能の維持", () => {
    it("fetch 呼び出しが維持されている", () => {
      expect(scriptContent).toMatch(/await\s+fetch\s*\(/)
    })

    it("POST メソッドが維持されている", () => {
      expect(scriptContent).toMatch(/method\s*:\s*["']POST["']/)
    })

    it("Content-Type ヘッダーが維持されている", () => {
      expect(scriptContent).toMatch(
        /["']Content-Type["']\s*:\s*["']application\/json["']/
      )
    })

    it("x-api-key ヘッダーが維持されている", () => {
      expect(scriptContent).toMatch(/["']x-api-key["']/)
    })

    it("collectContents 関数が維持されている", () => {
      expect(scriptContent).toMatch(/function\s+collectContents\s*\(/)
    })

    it("loadEnvLocal 関数が維持されている", () => {
      expect(scriptContent).toMatch(/function\s+loadEnvLocal\s*\(/)
    })
  })
})
