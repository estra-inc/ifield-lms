import type { Database } from "@/lib/types/database"

describe("Database 型定義 - contents テーブル", () => {
  describe("contents テーブルの Row 型", () => {
    it("全必須カラムが正しい型で定義されている", () => {
      const row: Database["public"]["Tables"]["contents"]["Row"] = {
        id: "test-uuid",
        slug_path: "html-css-basics/chapter1/intro",
        title: "HTML/CSS 基礎",
        body: "# はじめに\nMarkdown 本文",
        genre: "engineering",
        tutorial: "html-css-basics",
        chapter: "chapter1",
        section: "intro",
        content_type: "section",
        order: 1,
        status: "active",
        metadata: { key: "value" },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      expect(row.slug_path).toBe("html-css-basics/chapter1/intro")
      expect(row.content_type).toBe("section")
      expect(row.status).toBe("active")
      expect(row.order).toBe(1)
    })

    it("body, chapter, section, metadata が null を許容する", () => {
      const row: Database["public"]["Tables"]["contents"]["Row"] = {
        id: "test-uuid",
        slug_path: "engineering",
        title: "エンジニアリング",
        body: null,
        genre: "engineering",
        tutorial: "engineering",
        chapter: null,
        section: null,
        content_type: "genre",
        order: 0,
        status: "active",
        metadata: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      expect(row.body).toBeNull()
      expect(row.chapter).toBeNull()
      expect(row.section).toBeNull()
      expect(row.metadata).toBeNull()
    })

    it("content_type が 'genre' | 'tutorial' | 'chapter' | 'section' のいずれかである", () => {
      const types: Database["public"]["Tables"]["contents"]["Row"]["content_type"][] = [
        "genre",
        "tutorial",
        "chapter",
        "section",
      ]
      expect(types).toHaveLength(4)
    })

    it("status が 'active' | 'archived' のいずれかである", () => {
      const statuses: Database["public"]["Tables"]["contents"]["Row"]["status"][] = [
        "active",
        "archived",
      ]
      expect(statuses).toHaveLength(2)
    })
  })

  describe("contents テーブルの Insert 型", () => {
    it("必須フィールドのみでインサートオブジェクトが作成できる", () => {
      const insert: Database["public"]["Tables"]["contents"]["Insert"] = {
        slug_path: "html-css-basics/chapter1/intro",
        title: "イントロ",
        genre: "engineering",
        tutorial: "html-css-basics",
        content_type: "section",
      }

      expect(insert.slug_path).toBe("html-css-basics/chapter1/intro")
      expect(insert.id).toBeUndefined()
      expect(insert.order).toBeUndefined()
      expect(insert.status).toBeUndefined()
    })
  })

  describe("contents テーブルの Update 型", () => {
    it("部分更新ができる（全フィールド任意）", () => {
      const update: Database["public"]["Tables"]["contents"]["Update"] = {
        title: "更新タイトル",
        status: "archived",
      }

      expect(update.title).toBe("更新タイトル")
      expect(update.status).toBe("archived")
    })
  })
})

describe("Database 型定義 - content_progress テーブル", () => {
  describe("content_progress テーブルの Row 型", () => {
    it("全必須カラムが正しい型で定義されている", () => {
      const row: Database["public"]["Tables"]["content_progress"]["Row"] = {
        id: "progress-uuid",
        user_id: "user-uuid",
        content_id: "content-uuid",
        completed_at: "2026-01-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
      }

      expect(row.user_id).toBe("user-uuid")
      expect(row.content_id).toBe("content-uuid")
      expect(row.completed_at).toBe("2026-01-01T00:00:00Z")
    })
  })

  describe("content_progress テーブルの Insert 型", () => {
    it("user_id と content_id が必須で他は任意である", () => {
      const insert: Database["public"]["Tables"]["content_progress"]["Insert"] = {
        user_id: "user-uuid",
        content_id: "content-uuid",
      }

      expect(insert.user_id).toBe("user-uuid")
      expect(insert.content_id).toBe("content-uuid")
      expect(insert.id).toBeUndefined()
      expect(insert.completed_at).toBeUndefined()
    })
  })

  describe("content_progress テーブルの Relationships", () => {
    it("user_id が profiles テーブルを参照する外部キーを持つ", () => {
      const relationships: Database["public"]["Tables"]["content_progress"]["Relationships"] =
        [
          {
            foreignKeyName: "content_progress_user_id_fkey",
            columns: ["user_id"],
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "content_progress_content_id_fkey",
            columns: ["content_id"],
            referencedRelation: "contents",
            referencedColumns: ["id"],
          },
        ]

      expect(relationships[0].foreignKeyName).toBe(
        "content_progress_user_id_fkey"
      )
      expect(relationships[0].referencedRelation).toBe("profiles")
    })

    it("content_id が contents テーブルを参照する外部キーを持つ", () => {
      const relationships: Database["public"]["Tables"]["content_progress"]["Relationships"] =
        [
          {
            foreignKeyName: "content_progress_user_id_fkey",
            columns: ["user_id"],
            referencedRelation: "profiles",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "content_progress_content_id_fkey",
            columns: ["content_id"],
            referencedRelation: "contents",
            referencedColumns: ["id"],
          },
        ]

      expect(relationships[1].foreignKeyName).toBe(
        "content_progress_content_id_fkey"
      )
      expect(relationships[1].referencedRelation).toBe("contents")
    })
  })
})

describe("Database 型定義 - profiles テーブルの追加カラム", () => {
  it("graduation_date カラムが string | null 型で定義されている", () => {
    const row: Database["public"]["Tables"]["profiles"]["Row"] = {
      id: "test-uuid",
      full_name: "テスト太郎",
      email: "test@example.com",
      avatar_url: null,
      role: "user",
      current_term: null,
      graduation_date: "2026-12-31",
      default_genre: "engineering",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }

    expect(row.graduation_date).toBe("2026-12-31")
  })

  it("graduation_date が null を許容する", () => {
    const row: Database["public"]["Tables"]["profiles"]["Row"] = {
      id: "test-uuid",
      full_name: "テスト太郎",
      email: "test@example.com",
      avatar_url: null,
      role: "user",
      current_term: null,
      graduation_date: null,
      default_genre: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }

    expect(row.graduation_date).toBeNull()
  })

  it("default_genre カラムが string | null 型で定義されている", () => {
    const row: Database["public"]["Tables"]["profiles"]["Row"] = {
      id: "test-uuid",
      full_name: null,
      email: "test@example.com",
      avatar_url: null,
      role: "user",
      current_term: null,
      graduation_date: null,
      default_genre: "design",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    }

    expect(row.default_genre).toBe("design")
  })

  it("profiles Insert 型で graduation_date と default_genre が任意である", () => {
    const insert: Database["public"]["Tables"]["profiles"]["Insert"] = {
      role: "user",
    }

    expect(insert.graduation_date).toBeUndefined()
    expect(insert.default_genre).toBeUndefined()
  })

  it("profiles Update 型で graduation_date と default_genre が任意である", () => {
    const update: Database["public"]["Tables"]["profiles"]["Update"] = {
      graduation_date: "2026-12-31",
      default_genre: "engineering",
    }

    expect(update.graduation_date).toBe("2026-12-31")
    expect(update.default_genre).toBe("engineering")
  })
})
