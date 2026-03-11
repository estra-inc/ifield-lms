import { readFileSync } from "fs"
import path from "path"

/**
 * GitHub Actions sync-contents.yml ワークフローの検証テスト
 *
 * Task 3.1: GitHub Actions ワークフローの更新
 * - sync-contents.yml の同期 API リクエストペイロードに commit_hash を追加する
 * Requirements: 6.2
 */

const workflowPath = path.resolve(
  __dirname,
  "../../../../.github/workflows/sync-contents.yml"
)

function readWorkflowYAML(): string {
  return readFileSync(workflowPath, "utf-8")
}

describe("sync-contents.yml ワークフロー (Task 3.1)", () => {
  let yaml: string

  beforeAll(() => {
    yaml = readWorkflowYAML()
  })

  describe("ワークフローファイルの存在と基本構造", () => {
    it("sync-contents.yml が存在する", () => {
      expect(() => readWorkflowYAML()).not.toThrow()
    })

    it("main ブランチの push でトリガーされる", () => {
      expect(yaml).toMatch(/on:\s*\n\s+push:\s*\n\s+branches:\s*\[main\]/)
    })
  })

  describe("同期 API リクエストペイロードの commit_hash 対応", () => {
    it("JSON.stringify のペイロードに commit_hash フィールドが含まれている", () => {
      // ペイロードの JSON.stringify 内に commit_hash が存在することを確認
      expect(yaml).toMatch(/commit_hash/)
    })

    it("commit_hash の値として github.sha が使用されている", () => {
      // ${{ github.sha }} または process.env.GITHUB_SHA が使用されていることを確認
      // GitHub Actions ではコンテキスト変数 ${{ github.sha }} で取得するのが標準
      const usesGitHubSha =
        yaml.includes("github.sha") || yaml.includes("GITHUB_SHA")
      expect(usesGitHubSha).toBe(true)
    })

    it("commit_hash が fetch の body (JSON.stringify) ペイロード内に含まれている", () => {
      // JSON.stringify({ contents, commit_hash: ... }) のパターンを検出
      // fetch の body に渡される JSON オブジェクトに commit_hash が含まれることを確認
      const bodyMatch = yaml.match(
        /body:\s*JSON\.stringify\s*\(\s*\{[^}]*commit_hash[^}]*\}\s*\)/s
      )
      expect(bodyMatch).not.toBeNull()
    })

    it("commit_hash が contents と同じ JSON オブジェクト内に存在する", () => {
      // { contents, commit_hash: ... } または { contents: ..., commit_hash: ... } のパターン
      const bodyMatch = yaml.match(
        /body:\s*JSON\.stringify\s*\(\s*\{[^}]*contents[^}]*commit_hash[^}]*\}\s*\)/s
      )
      expect(bodyMatch).not.toBeNull()
    })
  })
})
