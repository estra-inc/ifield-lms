import type { Database } from "@/lib/types/database"

/**
 * Database 型定義 - mock_projects 関連テーブル
 *
 * Task 2.1: mock_projects, project_assignments, project_submissions, project_tasks の型定義
 * Requirements: 9.1
 */

describe("Database 型定義 - mock_projects テーブル", () => {
  describe("mock_projects テーブルの Row 型", () => {
    it("全必須カラムが正しい型で定義されている", () => {
      const row: Database["public"]["Tables"]["mock_projects"]["Row"] = {
        id: "project-uuid",
        slug: "portfolio-site",
        title: "ポートフォリオサイト制作",
        description: "自分のポートフォリオサイトを制作する案件です",
        requirements: "HTML/CSSを使用してポートフォリオサイトを作成してください",
        evaluation_items: [
          {
            category_large: "コーディング",
            category_medium: "HTML",
            items: [{ id: "e1", label: "セマンティックHTML", point: 30 }],
          },
        ],
        genre: "engineering",
        order: 1,
        status: "active",
        version_id: "version-uuid",
        created_at: "2026-03-03T00:00:00Z",
        updated_at: "2026-03-03T00:00:00Z",
      }

      expect(row.id).toBe("project-uuid")
      expect(row.slug).toBe("portfolio-site")
      expect(row.title).toBe("ポートフォリオサイト制作")
      expect(row.genre).toBe("engineering")
      expect(row.order).toBe(1)
      expect(row.status).toBe("active")
      expect(row.version_id).toBe("version-uuid")
    })

    it("description と requirements が null を許容する", () => {
      const row: Database["public"]["Tables"]["mock_projects"]["Row"] = {
        id: "project-uuid",
        slug: "test-project",
        title: "テスト案件",
        description: null,
        requirements: null,
        evaluation_items: [],
        genre: "design",
        order: 0,
        status: "active",
        version_id: "version-uuid",
        created_at: "2026-03-03T00:00:00Z",
        updated_at: "2026-03-03T00:00:00Z",
      }

      expect(row.description).toBeNull()
      expect(row.requirements).toBeNull()
    })

    it("genre が 'engineering' | 'design' のいずれかである", () => {
      const genres: Database["public"]["Tables"]["mock_projects"]["Row"]["genre"][] = [
        "engineering",
        "design",
      ]
      expect(genres).toHaveLength(2)
    })

    it("status が 'active' | 'archived' のいずれかである", () => {
      const statuses: Database["public"]["Tables"]["mock_projects"]["Row"]["status"][] = [
        "active",
        "archived",
      ]
      expect(statuses).toHaveLength(2)
    })
  })

  describe("mock_projects テーブルの Insert 型", () => {
    it("必須フィールドのみでインサートオブジェクトが作成できる", () => {
      const insert: Database["public"]["Tables"]["mock_projects"]["Insert"] = {
        slug: "test-project",
        title: "テスト案件",
        genre: "engineering",
        version_id: "version-uuid",
      }

      expect(insert.slug).toBe("test-project")
      expect(insert.id).toBeUndefined()
      expect(insert.description).toBeUndefined()
      expect(insert.requirements).toBeUndefined()
      expect(insert.status).toBeUndefined()
      expect(insert.order).toBeUndefined()
      expect(insert.created_at).toBeUndefined()
    })
  })

  describe("mock_projects テーブルの Update 型", () => {
    it("部分更新ができる（全フィールド任意）", () => {
      const update: Database["public"]["Tables"]["mock_projects"]["Update"] = {
        title: "更新タイトル",
        status: "archived",
      }

      expect(update.title).toBe("更新タイトル")
      expect(update.status).toBe("archived")
    })
  })

  describe("mock_projects テーブルの Relationships", () => {
    it("version_id が content_versions テーブルを参照する外部キーを持つ", () => {
      const relationships: Database["public"]["Tables"]["mock_projects"]["Relationships"] = [
        {
          foreignKeyName: "mock_projects_version_id_fkey",
          columns: ["version_id"],
          referencedRelation: "content_versions",
          referencedColumns: ["id"],
        },
      ]

      expect(relationships[0].foreignKeyName).toBe("mock_projects_version_id_fkey")
      expect(relationships[0].referencedRelation).toBe("content_versions")
    })
  })
})

describe("Database 型定義 - project_assignments テーブル", () => {
  describe("project_assignments テーブルの Row 型", () => {
    it("全必須カラムが正しい型で定義されている", () => {
      const row: Database["public"]["Tables"]["project_assignments"]["Row"] = {
        id: "assignment-uuid",
        user_id: "user-uuid",
        project_id: "project-uuid",
        status: "started",
        created_at: "2026-03-03T00:00:00Z",
      }

      expect(row.id).toBe("assignment-uuid")
      expect(row.user_id).toBe("user-uuid")
      expect(row.project_id).toBe("project-uuid")
      expect(row.status).toBe("started")
    })

    it("status が 'started' のみである", () => {
      const status: Database["public"]["Tables"]["project_assignments"]["Row"]["status"] = "started"
      expect(status).toBe("started")
    })
  })

  describe("project_assignments テーブルの Insert 型", () => {
    it("必須フィールドのみでインサートオブジェクトが作成できる", () => {
      const insert: Database["public"]["Tables"]["project_assignments"]["Insert"] = {
        user_id: "user-uuid",
        project_id: "project-uuid",
      }

      expect(insert.user_id).toBe("user-uuid")
      expect(insert.id).toBeUndefined()
      expect(insert.status).toBeUndefined()
      expect(insert.created_at).toBeUndefined()
    })
  })

  describe("project_assignments テーブルの Relationships", () => {
    it("user_id が profiles テーブルを参照し project_id が mock_projects テーブルを参照する", () => {
      const relationships: Database["public"]["Tables"]["project_assignments"]["Relationships"] = [
        {
          foreignKeyName: "project_assignments_user_id_fkey",
          columns: ["user_id"],
          referencedRelation: "profiles",
          referencedColumns: ["id"],
        },
        {
          foreignKeyName: "project_assignments_project_id_fkey",
          columns: ["project_id"],
          referencedRelation: "mock_projects",
          referencedColumns: ["id"],
        },
      ]

      expect(relationships[0].referencedRelation).toBe("profiles")
      expect(relationships[1].referencedRelation).toBe("mock_projects")
    })
  })
})

describe("Database 型定義 - project_submissions テーブル", () => {
  describe("project_submissions テーブルの Row 型", () => {
    it("全必須カラムが正しい型で定義されている", () => {
      const row: Database["public"]["Tables"]["project_submissions"]["Row"] = {
        id: "submission-uuid",
        assignment_id: "assignment-uuid",
        github_url: "https://github.com/user/repo",
        status: "submitted",
        score: null,
        result_data: null,
        feedback_comment: null,
        created_at: "2026-03-03T00:00:00Z",
        updated_at: "2026-03-03T00:00:00Z",
      }

      expect(row.id).toBe("submission-uuid")
      expect(row.github_url).toBe("https://github.com/user/repo")
      expect(row.status).toBe("submitted")
      expect(row.score).toBeNull()
      expect(row.result_data).toBeNull()
      expect(row.feedback_comment).toBeNull()
    })

    it("status が 4状態のいずれかである", () => {
      const statuses: Database["public"]["Tables"]["project_submissions"]["Row"]["status"][] = [
        "submitted",
        "grading",
        "graded",
        "rejected",
      ]
      expect(statuses).toHaveLength(4)
    })

    it("score と result_data と feedback_comment が値を持てる", () => {
      const row: Database["public"]["Tables"]["project_submissions"]["Row"] = {
        id: "submission-uuid",
        assignment_id: "assignment-uuid",
        github_url: "https://github.com/user/repo",
        status: "graded",
        score: 85,
        result_data: { feedback: "よくできました" },
        feedback_comment: "全体的によくできています。改善点はCSSの整理です。",
        created_at: "2026-03-03T00:00:00Z",
        updated_at: "2026-03-03T00:00:00Z",
      }

      expect(row.score).toBe(85)
      expect(row.result_data).toEqual({ feedback: "よくできました" })
      expect(row.feedback_comment).toBe("全体的によくできています。改善点はCSSの整理です。")
    })
  })

  describe("project_submissions テーブルの Insert 型", () => {
    it("必須フィールドのみでインサートオブジェクトが作成できる", () => {
      const insert: Database["public"]["Tables"]["project_submissions"]["Insert"] = {
        assignment_id: "assignment-uuid",
        github_url: "https://github.com/user/repo",
      }

      expect(insert.assignment_id).toBe("assignment-uuid")
      expect(insert.id).toBeUndefined()
      expect(insert.status).toBeUndefined()
      expect(insert.score).toBeUndefined()
      expect(insert.result_data).toBeUndefined()
    })
  })

  describe("project_submissions テーブルの Relationships", () => {
    it("assignment_id が project_assignments テーブルを参照する", () => {
      const relationships: Database["public"]["Tables"]["project_submissions"]["Relationships"] = [
        {
          foreignKeyName: "project_submissions_assignment_id_fkey",
          columns: ["assignment_id"],
          referencedRelation: "project_assignments",
          referencedColumns: ["id"],
        },
      ]

      expect(relationships[0].referencedRelation).toBe("project_assignments")
    })
  })
})

describe("Database 型定義 - project_tasks テーブル", () => {
  describe("project_tasks テーブルの Row 型", () => {
    it("全必須カラムが正しい型で定義されている", () => {
      const row: Database["public"]["Tables"]["project_tasks"]["Row"] = {
        id: "task-uuid",
        assignment_id: "assignment-uuid",
        title: "HTML構造の作成",
        description: "index.htmlのベース構造を作成する",
        status: "backlog",
        order: 0,
        created_by: "user-uuid",
        created_at: "2026-03-03T00:00:00Z",
        updated_at: "2026-03-03T00:00:00Z",
      }

      expect(row.id).toBe("task-uuid")
      expect(row.title).toBe("HTML構造の作成")
      expect(row.description).toBe("index.htmlのベース構造を作成する")
      expect(row.status).toBe("backlog")
      expect(row.order).toBe(0)
      expect(row.created_by).toBe("user-uuid")
    })

    it("description が null を許容する", () => {
      const row: Database["public"]["Tables"]["project_tasks"]["Row"] = {
        id: "task-uuid",
        assignment_id: "assignment-uuid",
        title: "タスク",
        description: null,
        status: "todo",
        order: 1,
        created_by: "user-uuid",
        created_at: "2026-03-03T00:00:00Z",
        updated_at: "2026-03-03T00:00:00Z",
      }

      expect(row.description).toBeNull()
    })

    it("status が 4状態のいずれかである", () => {
      const statuses: Database["public"]["Tables"]["project_tasks"]["Row"]["status"][] = [
        "backlog",
        "todo",
        "in_progress",
        "done",
      ]
      expect(statuses).toHaveLength(4)
    })
  })

  describe("project_tasks テーブルの Insert 型", () => {
    it("必須フィールドのみでインサートオブジェクトが作成できる", () => {
      const insert: Database["public"]["Tables"]["project_tasks"]["Insert"] = {
        assignment_id: "assignment-uuid",
        title: "タスク",
        created_by: "user-uuid",
      }

      expect(insert.title).toBe("タスク")
      expect(insert.id).toBeUndefined()
      expect(insert.description).toBeUndefined()
      expect(insert.status).toBeUndefined()
      expect(insert.order).toBeUndefined()
    })
  })

  describe("project_tasks テーブルの Relationships", () => {
    it("assignment_id と created_by の外部キーを持つ", () => {
      const relationships: Database["public"]["Tables"]["project_tasks"]["Relationships"] = [
        {
          foreignKeyName: "project_tasks_assignment_id_fkey",
          columns: ["assignment_id"],
          referencedRelation: "project_assignments",
          referencedColumns: ["id"],
        },
        {
          foreignKeyName: "project_tasks_created_by_fkey",
          columns: ["created_by"],
          referencedRelation: "profiles",
          referencedColumns: ["id"],
        },
      ]

      expect(relationships[0].referencedRelation).toBe("project_assignments")
      expect(relationships[1].referencedRelation).toBe("profiles")
    })
  })
})
