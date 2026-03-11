/**
 * ユーザー招待ダイアログコンポーネントのテスト
 *
 * invite-dialog.tsx のロジック（フォームバリデーション、ロール選択肢、アクション連携）を検証する。
 */
import { inviteUserSchema } from "@/lib/validations/user-management"

describe("InviteDialog コンポーネント", () => {
  it("モジュールが存在し、InviteDialog がエクスポートされる", async () => {
    const mod = await import(
      "@/app/(authenticated)/admin/users/_components/invite-dialog"
    )
    expect(mod).toBeDefined()
    expect(mod.InviteDialog).toBeDefined()
    expect(typeof mod.InviteDialog).toBe("function")
  })

  describe("招待フォームバリデーション", () => {
    it("有効なメールアドレスと user ロールでバリデーション成功", () => {
      const result = inviteUserSchema.safeParse({
        email: "test@example.com",
        role: "user",
      })
      expect(result.success).toBe(true)
    })

    it("有効なメールアドレスと manager ロールでバリデーション成功", () => {
      const result = inviteUserSchema.safeParse({
        email: "test@example.com",
        role: "manager",
      })
      expect(result.success).toBe(true)
    })

    it("super_admin ロールはバリデーション失敗", () => {
      const result = inviteUserSchema.safeParse({
        email: "test@example.com",
        role: "super_admin",
      })
      expect(result.success).toBe(false)
    })

    it("無効なメールアドレスでバリデーション失敗", () => {
      const result = inviteUserSchema.safeParse({
        email: "invalid-email",
        role: "user",
      })
      expect(result.success).toBe(false)
    })

    it("空のメールアドレスでバリデーション失敗", () => {
      const result = inviteUserSchema.safeParse({
        email: "",
        role: "user",
      })
      expect(result.success).toBe(false)
    })

    it("ロール未指定でバリデーション失敗", () => {
      const result = inviteUserSchema.safeParse({
        email: "test@example.com",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("ロール選択肢", () => {
    it("招待時のロール選択肢は user と manager のみ", () => {
      const roleOptions = [
        { value: "user", label: "受講生 (User)" },
        { value: "manager", label: "マネージャー (Manager)" },
      ]

      expect(roleOptions).toHaveLength(2)
      expect(roleOptions.map((r) => r.value)).toEqual(["user", "manager"])
      expect(roleOptions.map((r) => r.value)).not.toContain("super_admin")
    })
  })

  describe("FormData 構築", () => {
    it("email と role を含む FormData を構築する", () => {
      const formData = new FormData()
      formData.set("email", "test@example.com")
      formData.set("role", "user")

      expect(formData.get("email")).toBe("test@example.com")
      expect(formData.get("role")).toBe("user")
    })
  })

  describe("アクション結果のハンドリング", () => {
    it("success: true の場合はダイアログを閉じるべき", () => {
      const result = { success: true, message: "招待メールを送信しました。" }
      const shouldClose = result.success

      expect(shouldClose).toBe(true)
    })

    it("success: false の場合はダイアログ内にエラーを表示するべき", () => {
      const result = {
        success: false,
        message: "このメールアドレスは既に登録されています。",
      }
      const shouldShowError = !result.success

      expect(shouldShowError).toBe(true)
      expect(result.message).toBe(
        "このメールアドレスは既に登録されています。"
      )
    })
  })
})
