import type { Database } from "@/lib/types/database"

describe("Database 型定義 - email カラム追加", () => {
  it("profiles テーブルの Row 型に email カラムが含まれている", () => {
    const row: Database["public"]["Tables"]["profiles"]["Row"] = {
      id: "test-uuid",
      full_name: "テスト太郎",
      email: "test@example.com",
      avatar_url: null,
      role: "user",
      current_term: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }

    expect(row.email).toBe("test@example.com")
  })

  it("profiles テーブルの Insert 型に email が任意フィールドとして含まれている", () => {
    const insert: Database["public"]["Tables"]["profiles"]["Insert"] = {
      role: "user",
      email: "new@example.com",
    }

    expect(insert.email).toBe("new@example.com")
  })

  it("profiles テーブルの Insert 型で email を省略できる", () => {
    const insert: Database["public"]["Tables"]["profiles"]["Insert"] = {
      role: "user",
    }

    expect(insert.email).toBeUndefined()
  })

  it("profiles テーブルの Update 型に email が任意フィールドとして含まれている", () => {
    const update: Database["public"]["Tables"]["profiles"]["Update"] = {
      email: "updated@example.com",
    }

    expect(update.email).toBe("updated@example.com")
  })
})
