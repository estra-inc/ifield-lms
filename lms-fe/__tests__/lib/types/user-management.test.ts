import type {
  UserListItem,
  UserListResult,
  UserDetail,
  UserListFilter,
} from "@/lib/types/user-management"
import type { UserRole } from "@/lib/types/app-shell"

describe("ユーザー管理型定義", () => {
  describe("UserListItem", () => {
    it("必要なプロパティを持つオブジェクトを受け入れる", () => {
      const item: UserListItem = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        fullName: "山田 太郎",
        email: "taro@example.com",
        avatarUrl: "https://example.com/avatar.png",
        role: "user",
        currentTerm: "基礎",
        createdAt: "2026-01-01T00:00:00Z",
      }

      expect(item.id).toBe("550e8400-e29b-41d4-a716-446655440000")
      expect(item.fullName).toBe("山田 太郎")
      expect(item.email).toBe("taro@example.com")
      expect(item.avatarUrl).toBe("https://example.com/avatar.png")
      expect(item.role).toBe("user")
      expect(item.currentTerm).toBe("基礎")
      expect(item.createdAt).toBe("2026-01-01T00:00:00Z")
    })

    it("fullName が null を許容する", () => {
      const item: UserListItem = {
        id: "test-uuid",
        fullName: null,
        email: "test@example.com",
        avatarUrl: null,
        role: "manager",
        currentTerm: null,
        createdAt: "2026-01-01T00:00:00Z",
      }

      expect(item.fullName).toBeNull()
      expect(item.avatarUrl).toBeNull()
      expect(item.currentTerm).toBeNull()
    })

    it("role が UserRole 型と互換性がある", () => {
      const roles: UserRole[] = ["user", "manager", "super_admin"]
      for (const role of roles) {
        const item: UserListItem = {
          id: "test-uuid",
          fullName: "テスト",
          email: "test@example.com",
          avatarUrl: null,
          role,
          currentTerm: null,
          createdAt: "2026-01-01T00:00:00Z",
        }
        expect(roles).toContain(item.role)
      }
    })
  })

  describe("UserListResult", () => {
    it("users 配列と totalCount を持つ", () => {
      const result: UserListResult = {
        users: [
          {
            id: "uuid-1",
            fullName: "ユーザー1",
            email: "user1@example.com",
            avatarUrl: null,
            role: "user",
            currentTerm: null,
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
        totalCount: 50,
      }

      expect(result.users).toHaveLength(1)
      expect(result.totalCount).toBe(50)
    })

    it("空の users 配列を受け入れる", () => {
      const result: UserListResult = {
        users: [],
        totalCount: 0,
      }

      expect(result.users).toHaveLength(0)
      expect(result.totalCount).toBe(0)
    })
  })

  describe("UserDetail", () => {
    it("UserListItem を拡張し isBanned フラグを持つ", () => {
      const detail: UserDetail = {
        id: "test-uuid",
        fullName: "山田 太郎",
        email: "taro@example.com",
        avatarUrl: null,
        role: "user",
        currentTerm: "実践",
        createdAt: "2026-01-01T00:00:00Z",
        isBanned: false,
      }

      expect(detail.isBanned).toBe(false)
      expect(detail.fullName).toBe("山田 太郎")
      expect(detail.currentTerm).toBe("実践")
    })

    it("isBanned が true のユーザーを表現できる", () => {
      const detail: UserDetail = {
        id: "test-uuid",
        fullName: "無効化ユーザー",
        email: "banned@example.com",
        avatarUrl: null,
        role: "user",
        currentTerm: null,
        createdAt: "2026-01-01T00:00:00Z",
        isBanned: true,
      }

      expect(detail.isBanned).toBe(true)
    })
  })

  describe("UserListFilter", () => {
    it("検索・ロール・ページのフィルタパラメータを持つ", () => {
      const filter: UserListFilter = {
        search: "山田",
        role: "user",
        page: 1,
      }

      expect(filter.search).toBe("山田")
      expect(filter.role).toBe("user")
      expect(filter.page).toBe(1)
    })

    it("search と role が省略可能である", () => {
      const filter: UserListFilter = {
        page: 2,
      }

      expect(filter.search).toBeUndefined()
      expect(filter.role).toBeUndefined()
      expect(filter.page).toBe(2)
    })

    it("role にすべてのロール値を設定できる", () => {
      const roles: UserRole[] = ["user", "manager", "super_admin"]
      for (const role of roles) {
        const filter: UserListFilter = {
          role,
          page: 1,
        }
        expect(filter.role).toBe(role)
      }
    })
  })
})
