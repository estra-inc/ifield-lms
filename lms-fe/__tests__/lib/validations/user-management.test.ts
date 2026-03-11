import {
  inviteUserSchema,
  changeRoleSchema,
  userIdSchema,
} from "@/lib/validations/user-management"

describe("ユーザー管理バリデーションスキーマ", () => {
  describe("inviteUserSchema", () => {
    it("有効なメールアドレスと role: user でバリデーションが成功する", () => {
      const result = inviteUserSchema.safeParse({
        email: "test@example.com",
        role: "user",
      })

      expect(result.success).toBe(true)
    })

    it("有効なメールアドレスと role: manager でバリデーションが成功する", () => {
      const result = inviteUserSchema.safeParse({
        email: "manager@example.com",
        role: "manager",
      })

      expect(result.success).toBe(true)
    })

    it("メールアドレスが空の場合にバリデーションが失敗する", () => {
      const result = inviteUserSchema.safeParse({
        email: "",
        role: "user",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const emailErrors = result.error.issues.filter(
          (i) => i.path[0] === "email"
        )
        expect(emailErrors.length).toBeGreaterThan(0)
        expect(emailErrors[0].message).toContain("メールアドレス")
      }
    })

    it("無効なメールアドレス形式の場合にバリデーションが失敗する", () => {
      const result = inviteUserSchema.safeParse({
        email: "invalid-email",
        role: "user",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const emailErrors = result.error.issues.filter(
          (i) => i.path[0] === "email"
        )
        expect(emailErrors.length).toBeGreaterThan(0)
        expect(emailErrors[0].message).toContain("メールアドレス")
      }
    })

    it("role が super_admin の場合にバリデーションが失敗する", () => {
      const result = inviteUserSchema.safeParse({
        email: "test@example.com",
        role: "super_admin",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const roleErrors = result.error.issues.filter(
          (i) => i.path[0] === "role"
        )
        expect(roleErrors.length).toBeGreaterThan(0)
      }
    })

    it("role が不正な値の場合にバリデーションが失敗する", () => {
      const result = inviteUserSchema.safeParse({
        email: "test@example.com",
        role: "invalid",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const roleErrors = result.error.issues.filter(
          (i) => i.path[0] === "role"
        )
        expect(roleErrors.length).toBeGreaterThan(0)
      }
    })

    it("role が未指定の場合にバリデーションが失敗する", () => {
      const result = inviteUserSchema.safeParse({
        email: "test@example.com",
      })

      expect(result.success).toBe(false)
    })

    it("エラーメッセージが日本語である", () => {
      const result = inviteUserSchema.safeParse({
        email: "",
        role: "invalid",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        // email のエラーは日本語であること
        const emailErrors = result.error.issues.filter(
          (i) => i.path[0] === "email"
        )
        expect(emailErrors.length).toBeGreaterThan(0)
        expect(emailErrors[0].message).toMatch(/[\u3000-\u9FFF]/)
      }
    })
  })

  describe("changeRoleSchema", () => {
    it("有効な UUID と role: user でバリデーションが成功する", () => {
      const result = changeRoleSchema.safeParse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        role: "user",
      })

      expect(result.success).toBe(true)
    })

    it("有効な UUID と role: manager でバリデーションが成功する", () => {
      const result = changeRoleSchema.safeParse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        role: "manager",
      })

      expect(result.success).toBe(true)
    })

    it("有効な UUID と role: super_admin でバリデーションが成功する", () => {
      const result = changeRoleSchema.safeParse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        role: "super_admin",
      })

      expect(result.success).toBe(true)
    })

    it("userId が UUID 形式でない場合にバリデーションが失敗する", () => {
      const result = changeRoleSchema.safeParse({
        userId: "not-a-uuid",
        role: "user",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const userIdErrors = result.error.issues.filter(
          (i) => i.path[0] === "userId"
        )
        expect(userIdErrors.length).toBeGreaterThan(0)
      }
    })

    it("userId が空の場合にバリデーションが失敗する", () => {
      const result = changeRoleSchema.safeParse({
        userId: "",
        role: "user",
      })

      expect(result.success).toBe(false)
    })

    it("role が不正な値の場合にバリデーションが失敗する", () => {
      const result = changeRoleSchema.safeParse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
        role: "invalid",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const roleErrors = result.error.issues.filter(
          (i) => i.path[0] === "role"
        )
        expect(roleErrors.length).toBeGreaterThan(0)
      }
    })

    it("エラーメッセージが日本語である", () => {
      const result = changeRoleSchema.safeParse({
        userId: "not-a-uuid",
        role: "invalid",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const userIdErrors = result.error.issues.filter(
          (i) => i.path[0] === "userId"
        )
        expect(userIdErrors.length).toBeGreaterThan(0)
        expect(userIdErrors[0].message).toMatch(/[\u3000-\u9FFF]/)
      }
    })
  })

  describe("userIdSchema", () => {
    it("有効な UUID でバリデーションが成功する", () => {
      const result = userIdSchema.safeParse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
      })

      expect(result.success).toBe(true)
    })

    it("UUID 形式でない場合にバリデーションが失敗する", () => {
      const result = userIdSchema.safeParse({
        userId: "not-a-uuid",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const userIdErrors = result.error.issues.filter(
          (i) => i.path[0] === "userId"
        )
        expect(userIdErrors.length).toBeGreaterThan(0)
      }
    })

    it("userId が空の場合にバリデーションが失敗する", () => {
      const result = userIdSchema.safeParse({
        userId: "",
      })

      expect(result.success).toBe(false)
    })

    it("userId が未指定の場合にバリデーションが失敗する", () => {
      const result = userIdSchema.safeParse({})

      expect(result.success).toBe(false)
    })

    it("エラーメッセージが日本語である", () => {
      const result = userIdSchema.safeParse({
        userId: "not-a-uuid",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const userIdErrors = result.error.issues.filter(
          (i) => i.path[0] === "userId"
        )
        expect(userIdErrors.length).toBeGreaterThan(0)
        expect(userIdErrors[0].message).toMatch(/[\u3000-\u9FFF]/)
      }
    })
  })
})
