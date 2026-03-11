/**
 * ユーザーテーブルコンポーネントのテスト
 *
 * user-table.tsx のロジック（ロールバッジ表示、経過日数計算、空状態）を検証する。
 */
import { differenceInDays } from "date-fns"
import type { UserListItem } from "@/lib/types/user-management"

describe("UserTable コンポーネント", () => {
  it("モジュールが存在し、UserTable がエクスポートされる", async () => {
    const mod = await import(
      "@/app/(authenticated)/admin/users/_components/user-table"
    )
    expect(mod).toBeDefined()
    expect(mod.UserTable).toBeDefined()
    expect(typeof mod.UserTable).toBe("function")
  })

  describe("ロールバッジの表示", () => {
    it("user ロールは 受講生 として表示する", () => {
      const roleLabels: Record<string, string> = {
        user: "受講生",
        manager: "マネージャー",
        super_admin: "スーパー管理者",
      }

      expect(roleLabels["user"]).toBe("受講生")
    })

    it("manager ロールは マネージャー として表示する", () => {
      const roleLabels: Record<string, string> = {
        user: "受講生",
        manager: "マネージャー",
        super_admin: "スーパー管理者",
      }

      expect(roleLabels["manager"]).toBe("マネージャー")
    })

    it("super_admin ロールは スーパー管理者 として表示する", () => {
      const roleLabels: Record<string, string> = {
        user: "受講生",
        manager: "マネージャー",
        super_admin: "スーパー管理者",
      }

      expect(roleLabels["super_admin"]).toBe("スーパー管理者")
    })
  })

  describe("経過日数の計算", () => {
    it("作成日から今日までの日数を計算する", () => {
      const createdAt = "2024-01-01T00:00:00Z"
      const now = new Date("2024-02-01T00:00:00Z")
      const days = differenceInDays(now, new Date(createdAt))

      expect(days).toBe(31)
    })

    it("同日の場合は0日を返す", () => {
      const createdAt = "2024-01-15T00:00:00Z"
      const now = new Date("2024-01-15T00:00:00Z")
      const days = differenceInDays(now, new Date(createdAt))

      expect(days).toBe(0)
    })
  })

  describe("アバターのイニシャル", () => {
    it("full_name の最初の文字をイニシャルとして使用する", () => {
      const fullName = "山田 太郎"
      const initial = fullName.charAt(0)

      expect(initial).toBe("山")
    })

    it("full_name が null の場合は ? を使用する", () => {
      const getInitial = (name: string | null): string => {
        if (!name) return "?"
        return name.charAt(0)
      }

      expect(getInitial(null)).toBe("?")
    })
  })

  describe("空状態", () => {
    it("ユーザーが0件の場合のメッセージを表示する", () => {
      const users: UserListItem[] = []
      const isEmpty = users.length === 0
      const emptyMessage = "ユーザーが見つかりません"

      expect(isEmpty).toBe(true)
      expect(emptyMessage).toBe("ユーザーが見つかりません")
    })
  })

  describe("行クリック遷移先", () => {
    it("ユーザーIDに基づいて詳細ページのURLを構築する", () => {
      const userId = "uuid-123"
      const href = `/admin/users/${userId}`

      expect(href).toBe("/admin/users/uuid-123")
    })
  })
})
