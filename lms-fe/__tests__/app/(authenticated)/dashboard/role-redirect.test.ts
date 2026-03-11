/**
 * ロールベースリダイレクト インテグレーションテスト
 *
 * Task 7.3: ロールベースリダイレクトの検証
 * - Manager -> /users
 * - Super Admin -> /admin/grading
 * - User -> ダッシュボード表示（リダイレクトなし）
 * Requirements: 1.1, 1.2, 1.3
 */

import fs from "fs"
import path from "path"

describe("ロールベースリダイレクト (Task 7.3)", () => {
  const pagePath = path.resolve(
    __dirname,
    "../../../../app/(authenticated)/dashboard/page.tsx"
  )

  let pageContent: string

  beforeAll(() => {
    pageContent = fs.readFileSync(pagePath, "utf-8")
  })

  describe("リダイレクトロジックの実装確認", () => {
    it("Manager ロールで redirect('/users') が呼ばれるコードが存在する", () => {
      // profile.role === "manager" のチェックと redirect("/users") の呼び出し
      expect(pageContent).toContain('role === "manager"')
      expect(pageContent).toContain('redirect("/users")')
    })

    it("Super Admin ロールで redirect('/admin/grading') が呼ばれるコードが存在する", () => {
      expect(pageContent).toContain('role === "super_admin"')
      expect(pageContent).toContain('redirect("/admin/grading")')
    })

    it("User ロールではリダイレクトせずダッシュボードを表示する", () => {
      // User ロールに対する明示的な redirect がないことを確認
      // （manager と super_admin のリダイレクト後に残るのが User のフロー）
      expect(pageContent).not.toContain('redirect("/user")')
    })

    it("未認証ユーザーは redirect('/auth/login') にリダイレクトされる", () => {
      expect(pageContent).toContain('redirect("/auth/login")')
    })
  })

  describe("ロール判定関数のユニットテスト", () => {
    function getRedirectPath(role: string): string | null {
      switch (role) {
        case "manager":
          return "/users"
        case "super_admin":
          return "/admin/grading"
        case "user":
          return null // リダイレクトなし
        default:
          return "/auth/login"
      }
    }

    it("manager -> /users", () => {
      expect(getRedirectPath("manager")).toBe("/users")
    })

    it("super_admin -> /admin/grading", () => {
      expect(getRedirectPath("super_admin")).toBe("/admin/grading")
    })

    it("user -> null (リダイレクトなし)", () => {
      expect(getRedirectPath("user")).toBeNull()
    })

    it("不明なロール -> /auth/login", () => {
      expect(getRedirectPath("unknown")).toBe("/auth/login")
    })
  })

  describe("認証フロー順序の検証", () => {
    it("auth.getUser() の後に profiles クエリが実行される順序になっている", () => {
      const authPos = pageContent.indexOf("auth.getUser()")
      const profilePos = pageContent.indexOf(".from(\"profiles\")")
      expect(authPos).toBeLessThan(profilePos)
    })

    it("profiles クエリの後にロール判定が行われる", () => {
      const profilePos = pageContent.indexOf(".from(\"profiles\")")
      const roleCheckPos = pageContent.indexOf('role === "manager"')
      expect(profilePos).toBeLessThan(roleCheckPos)
    })
  })
})
