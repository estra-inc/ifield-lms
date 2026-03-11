import { readFileSync, existsSync, readdirSync } from "fs"
import path from "path"

/**
 * quizzes / quiz_logs マイグレーション SQL のスキーマ検証テスト
 *
 * Task 1.1: quizzes テーブルと quiz_logs テーブルの作成
 * Requirements: 2.1, 2.2, 2.3, 2.4
 *
 * マイグレーションファイルの存在と、CREATE TABLE / INDEX / CONSTRAINT 文の
 * 正しさを静的に検証する。
 */

const migrationsDir = path.resolve(__dirname, "../../../supabase/migrations")

/** マイグレーションファイルの特定: quizzes を含むファイルを検索 */
function findMigrationFile(): string | null {
  if (!existsSync(migrationsDir)) return null
  const files = readdirSync(migrationsDir)
  const match = files.find((f) => f.includes("quizzes"))
  return match ? path.join(migrationsDir, match) : null
}

function readMigrationSQL(): string {
  const filePath = findMigrationFile()
  if (!filePath) {
    throw new Error(
      "quizzes マイグレーションファイルが見つかりません"
    )
  }
  return readFileSync(filePath, "utf-8")
}

describe("quizzes / quiz_logs マイグレーション SQL (Task 1.1)", () => {
  let sql: string

  beforeAll(() => {
    sql = readMigrationSQL()
  })

  describe("マイグレーションファイルの存在と形式", () => {
    it("quizzes を含むマイグレーションファイルが存在する", () => {
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

  // ===========================================
  // quizzes テーブル
  // ===========================================
  describe("quizzes テーブル (REQ-2.1)", () => {
    it("quizzes テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(/CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\(/i)
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      const quizzesBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\([^;]+\)/is
      )
      expect(quizzesBlock).not.toBeNull()
      expect(quizzesBlock![0]).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("genre カラムが TEXT NOT NULL である", () => {
      const quizzesBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\([^;]+\)/is
      )
      expect(quizzesBlock).not.toBeNull()
      expect(quizzesBlock![0]).toMatch(/genre\s+TEXT\s+NOT\s+NULL/i)
    })

    it("tutorial カラムが TEXT NOT NULL である", () => {
      const quizzesBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\([^;]+\)/is
      )
      expect(quizzesBlock).not.toBeNull()
      expect(quizzesBlock![0]).toMatch(/tutorial\s+TEXT\s+NOT\s+NULL/i)
    })

    it("chapter カラムが TEXT NOT NULL である", () => {
      const quizzesBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\([^;]+\)/is
      )
      expect(quizzesBlock).not.toBeNull()
      expect(quizzesBlock![0]).toMatch(/chapter\s+TEXT\s+NOT\s+NULL/i)
    })

    it("section カラムが TEXT NOT NULL である", () => {
      const quizzesBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\([^;]+\)/is
      )
      expect(quizzesBlock).not.toBeNull()
      expect(quizzesBlock![0]).toMatch(/\bsection\s+TEXT\s+NOT\s+NULL/i)
    })

    it("title カラムが TEXT NOT NULL である", () => {
      const quizzesBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\([^;]+\)/is
      )
      expect(quizzesBlock).not.toBeNull()
      expect(quizzesBlock![0]).toMatch(/title\s+TEXT\s+NOT\s+NULL/i)
    })

    it("questions カラムが JSONB NOT NULL である", () => {
      const quizzesBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\([^;]+\)/is
      )
      expect(quizzesBlock).not.toBeNull()
      expect(quizzesBlock![0]).toMatch(/questions\s+JSONB\s+NOT\s+NULL/i)
    })

    it("status カラムが TEXT NOT NULL DEFAULT 'active' である", () => {
      const quizzesBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\([^;]+\)/is
      )
      expect(quizzesBlock).not.toBeNull()
      expect(quizzesBlock![0]).toMatch(
        /status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'active'/i
      )
    })

    it("version_id カラムが UUID NOT NULL で content_versions(id) への外部キーを持つ", () => {
      const quizzesBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\([^;]+\)/is
      )
      expect(quizzesBlock).not.toBeNull()
      expect(quizzesBlock![0]).toMatch(
        /version_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+(?:public\.)?content_versions\s*\(\s*id\s*\)/i
      )
    })

    it("created_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      const quizzesBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\([^;]+\)/is
      )
      expect(quizzesBlock).not.toBeNull()
      expect(quizzesBlock![0]).toMatch(
        /created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })

    it("updated_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      const quizzesBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quizzes\s*\([^;]+\)/is
      )
      expect(quizzesBlock).not.toBeNull()
      expect(quizzesBlock![0]).toMatch(
        /updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })
  })

  // ===========================================
  // quizzes ユニーク制約 (REQ-2.3)
  // ===========================================
  describe("quizzes ユニーク制約 (REQ-2.3)", () => {
    it("(genre, tutorial, chapter, section, version_id) のユニーク制約が存在する", () => {
      expect(sql).toMatch(
        /UNIQUE\s*\(\s*genre\s*,\s*tutorial\s*,\s*chapter\s*,\s*section\s*,\s*version_id\s*\)/i
      )
    })
  })

  // ===========================================
  // quizzes インデックス
  // ===========================================
  describe("quizzes インデックス", () => {
    it("(version_id, status) のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_quizzes_version_status\s+ON\s+(?:public\.)?quizzes\s*\(\s*version_id\s*,\s*status\s*\)/i
      )
    })
  })

  // ===========================================
  // quiz_logs テーブル (REQ-2.2)
  // ===========================================
  describe("quiz_logs テーブル (REQ-2.2)", () => {
    it("quiz_logs テーブルの CREATE TABLE 文が存在する", () => {
      expect(sql).toMatch(/CREATE\s+TABLE\s+(?:public\.)?quiz_logs\s*\(/i)
    })

    it("id カラムが UUID PRIMARY KEY DEFAULT gen_random_uuid() である", () => {
      const logsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quiz_logs\s*\([^;]+\)/is
      )
      expect(logsBlock).not.toBeNull()
      expect(logsBlock![0]).toMatch(
        /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i
      )
    })

    it("user_id カラムが UUID NOT NULL で auth.users(id) への外部キーを持つ", () => {
      const logsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quiz_logs\s*\([^;]+\)/is
      )
      expect(logsBlock).not.toBeNull()
      expect(logsBlock![0]).toMatch(
        /user_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+auth\.users\s*\(\s*id\s*\)/i
      )
    })

    it("quiz_id カラムが UUID NOT NULL で quizzes(id) への外部キーを持つ", () => {
      const logsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quiz_logs\s*\([^;]+\)/is
      )
      expect(logsBlock).not.toBeNull()
      expect(logsBlock![0]).toMatch(
        /quiz_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+(?:public\.)?quizzes\s*\(\s*id\s*\)/i
      )
    })

    it("score カラムが INTEGER NOT NULL である", () => {
      const logsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quiz_logs\s*\([^;]+\)/is
      )
      expect(logsBlock).not.toBeNull()
      expect(logsBlock![0]).toMatch(/score\s+INTEGER\s+NOT\s+NULL/i)
    })

    it("total_questions カラムが INTEGER NOT NULL である", () => {
      const logsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quiz_logs\s*\([^;]+\)/is
      )
      expect(logsBlock).not.toBeNull()
      expect(logsBlock![0]).toMatch(/total_questions\s+INTEGER\s+NOT\s+NULL/i)
    })

    it("answers カラムが JSONB NOT NULL である", () => {
      const logsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quiz_logs\s*\([^;]+\)/is
      )
      expect(logsBlock).not.toBeNull()
      expect(logsBlock![0]).toMatch(/answers\s+JSONB\s+NOT\s+NULL/i)
    })

    it("created_at カラムが TIMESTAMPTZ NOT NULL DEFAULT NOW() である", () => {
      const logsBlock = sql.match(
        /CREATE\s+TABLE\s+(?:public\.)?quiz_logs\s*\([^;]+\)/is
      )
      expect(logsBlock).not.toBeNull()
      expect(logsBlock![0]).toMatch(
        /created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      )
    })
  })

  // ===========================================
  // quiz_logs 制約 (REQ-2.4)
  // ===========================================
  describe("quiz_logs 制約 (REQ-2.4)", () => {
    it("score >= 0 AND score <= total_questions の CHECK 制約が存在する", () => {
      expect(sql).toMatch(
        /CHECK\s*\(\s*score\s*>=\s*0\s+AND\s+score\s*<=\s*total_questions\s*\)/i
      )
    })
  })

  // ===========================================
  // quiz_logs インデックス
  // ===========================================
  describe("quiz_logs インデックス", () => {
    it("(user_id, quiz_id, created_at DESC) のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_quiz_logs_user_quiz\s+ON\s+(?:public\.)?quiz_logs\s*\(\s*user_id\s*,\s*quiz_id\s*,\s*created_at\s+DESC\s*\)/i
      )
    })

    it("(quiz_id) のインデックスが作成されている", () => {
      expect(sql).toMatch(
        /CREATE\s+INDEX\s+idx_quiz_logs_quiz_id\s+ON\s+(?:public\.)?quiz_logs\s*\(\s*quiz_id\s*\)/i
      )
    })
  })
})
