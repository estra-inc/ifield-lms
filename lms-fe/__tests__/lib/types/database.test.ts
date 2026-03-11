import type { Database } from "@/lib/types/database"

describe("Database 型定義", () => {
  describe("profiles テーブルの型定義", () => {
    it("profiles テーブルの Row 型に必要なカラムが含まれている", () => {
      // 型レベルのテスト: コンパイルが通ることで型の正しさを検証
      const row: Database["public"]["Tables"]["profiles"]["Row"] = {
        id: "test-uuid",
        full_name: "テスト太郎",
        last_name: "テスト",
        first_name: "太郎",
        email: "test@example.com",
        avatar_url: null,
        role: "user",
        current_term: null,
        graduation_date: null,
        default_genre: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      expect(row.id).toBe("test-uuid")
      expect(row.full_name).toBe("テスト太郎")
      expect(row.email).toBe("test@example.com")
      expect(row.role).toBe("user")
    })

    it("profiles テーブルの Row 型で full_name が null を許容する", () => {
      const row: Database["public"]["Tables"]["profiles"]["Row"] = {
        id: "test-uuid",
        full_name: null,
        last_name: null,
        first_name: null,
        email: "test@example.com",
        avatar_url: null,
        role: "user",
        current_term: null,
        graduation_date: null,
        default_genre: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      expect(row.full_name).toBeNull()
    })

    it("profiles テーブルの Insert 型で id が任意フィールドである", () => {
      // Insert 時は id を省略可能（Supabase Auth trigger が自動設定）
      const insert: Database["public"]["Tables"]["profiles"]["Insert"] = {
        role: "user",
      }

      expect(insert.role).toBe("user")
      expect(insert.id).toBeUndefined()
    })

    it("profiles テーブルの Update 型で全フィールドが任意である", () => {
      // Update 時は更新対象のフィールドのみ指定
      const update: Database["public"]["Tables"]["profiles"]["Update"] = {
        full_name: "更新太郎",
      }

      expect(update.full_name).toBe("更新太郎")
    })

    it("role カラムが 'user' | 'manager' | 'super_admin' のいずれかである", () => {
      const userRow: Database["public"]["Tables"]["profiles"]["Row"] = {
        id: "1",
        full_name: null,
        last_name: null,
        first_name: null,
        email: "user@example.com",
        avatar_url: null,
        role: "user",
        current_term: null,
        graduation_date: null,
        default_genre: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      const managerRow: Database["public"]["Tables"]["profiles"]["Row"] = {
        id: "2",
        full_name: null,
        last_name: null,
        first_name: null,
        email: "manager@example.com",
        avatar_url: null,
        role: "manager",
        current_term: null,
        graduation_date: null,
        default_genre: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      const adminRow: Database["public"]["Tables"]["profiles"]["Row"] = {
        id: "3",
        full_name: null,
        last_name: null,
        first_name: null,
        email: "admin@example.com",
        avatar_url: null,
        role: "super_admin",
        current_term: null,
        graduation_date: null,
        default_genre: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      expect(userRow.role).toBe("user")
      expect(managerRow.role).toBe("manager")
      expect(adminRow.role).toBe("super_admin")
    })
  })
})
