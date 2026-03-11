import {
  loginSchema,
  inviteSetupStep1Schema,
  inviteSetupStep2Schema,
  resetPasswordSchema,
  resetPasswordConfirmSchema,
} from "@/lib/validations/auth"
import type { ActionResult } from "@/lib/validations/auth"

describe("認証バリデーションスキーマ", () => {
  describe("loginSchema", () => {
    it("有効なメールアドレスとパスワードでバリデーションが成功する", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      })

      expect(result.success).toBe(true)
    })

    it("メールアドレスが空の場合にバリデーションが失敗する", () => {
      const result = loginSchema.safeParse({
        email: "",
        password: "password123",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const emailErrors = result.error.issues.filter(
          (i) => i.path[0] === "email"
        )
        expect(emailErrors.length).toBeGreaterThan(0)
      }
    })

    it("メールアドレスの形式が不正な場合にバリデーションが失敗する", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email",
        password: "password123",
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

    it("パスワードが空の場合にバリデーションが失敗する", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordErrors = result.error.issues.filter(
          (i) => i.path[0] === "password"
        )
        expect(passwordErrors.length).toBeGreaterThan(0)
      }
    })

    it("エラーメッセージが日本語である", () => {
      const result = loginSchema.safeParse({
        email: "",
        password: "",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          // 日本語文字が含まれていることを確認
          expect(issue.message).toMatch(/[\u3000-\u9FFF]/)
        })
      }
    })
  })

  describe("inviteSetupStep1Schema", () => {
    it("有効な姓と名でバリデーションが成功する", () => {
      const result = inviteSetupStep1Schema.safeParse({
        lastName: "山田",
        firstName: "太郎",
      })

      expect(result.success).toBe(true)
    })

    it("姓が空の場合にバリデーションが失敗する", () => {
      const result = inviteSetupStep1Schema.safeParse({
        lastName: "",
        firstName: "太郎",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const lastNameErrors = result.error.issues.filter(
          (i) => i.path[0] === "lastName"
        )
        expect(lastNameErrors.length).toBeGreaterThan(0)
      }
    })

    it("名が空の場合にバリデーションが失敗する", () => {
      const result = inviteSetupStep1Schema.safeParse({
        lastName: "山田",
        firstName: "",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const firstNameErrors = result.error.issues.filter(
          (i) => i.path[0] === "firstName"
        )
        expect(firstNameErrors.length).toBeGreaterThan(0)
      }
    })

    it("エラーメッセージが日本語である", () => {
      const result = inviteSetupStep1Schema.safeParse({
        lastName: "",
        firstName: "",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          expect(issue.message).toMatch(/[\u3000-\u9FFF]/)
        })
      }
    })
  })

  describe("inviteSetupStep2Schema", () => {
    it("有効なパスワードと確認パスワードでバリデーションが成功する", () => {
      const result = inviteSetupStep2Schema.safeParse({
        password: "password123",
        confirmPassword: "password123",
      })

      expect(result.success).toBe(true)
    })

    it("パスワードが8文字未満の場合にバリデーションが失敗する", () => {
      const result = inviteSetupStep2Schema.safeParse({
        password: "short",
        confirmPassword: "short",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordErrors = result.error.issues.filter(
          (i) => i.path[0] === "password"
        )
        expect(passwordErrors.length).toBeGreaterThan(0)
        expect(passwordErrors[0].message).toContain("8文字")
      }
    })

    it("パスワードがちょうど8文字の場合にバリデーションが成功する", () => {
      const result = inviteSetupStep2Schema.safeParse({
        password: "12345678",
        confirmPassword: "12345678",
      })

      expect(result.success).toBe(true)
    })

    it("パスワードが7文字の場合にバリデーションが失敗する", () => {
      const result = inviteSetupStep2Schema.safeParse({
        password: "1234567",
        confirmPassword: "1234567",
      })

      expect(result.success).toBe(false)
    })

    it("パスワードと確認パスワードが一致しない場合にバリデーションが失敗する", () => {
      const result = inviteSetupStep2Schema.safeParse({
        password: "password123",
        confirmPassword: "different123",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const confirmErrors = result.error.issues.filter(
          (i) =>
            i.path.includes("confirmPassword") || i.path.length === 0
        )
        expect(confirmErrors.length).toBeGreaterThan(0)
      }
    })

    it("パスワードが空の場合にバリデーションが失敗する", () => {
      const result = inviteSetupStep2Schema.safeParse({
        password: "",
        confirmPassword: "",
      })

      expect(result.success).toBe(false)
    })

    it("エラーメッセージが日本語である", () => {
      const result = inviteSetupStep2Schema.safeParse({
        password: "short",
        confirmPassword: "different",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          expect(issue.message).toMatch(/[\u3000-\u9FFF]/)
        })
      }
    })
  })

  describe("resetPasswordSchema", () => {
    it("有効なメールアドレスでバリデーションが成功する", () => {
      const result = resetPasswordSchema.safeParse({
        email: "test@example.com",
      })

      expect(result.success).toBe(true)
    })

    it("メールアドレスが空の場合にバリデーションが失敗する", () => {
      const result = resetPasswordSchema.safeParse({
        email: "",
      })

      expect(result.success).toBe(false)
    })

    it("メールアドレスの形式が不正な場合にバリデーションが失敗する", () => {
      const result = resetPasswordSchema.safeParse({
        email: "not-an-email",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const emailErrors = result.error.issues.filter(
          (i) => i.path[0] === "email"
        )
        expect(emailErrors[0].message).toContain("メールアドレス")
      }
    })

    it("エラーメッセージが日本語である", () => {
      const result = resetPasswordSchema.safeParse({
        email: "",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          expect(issue.message).toMatch(/[\u3000-\u9FFF]/)
        })
      }
    })
  })

  describe("resetPasswordConfirmSchema", () => {
    it("有効なパスワードと確認パスワードでバリデーションが成功する", () => {
      const result = resetPasswordConfirmSchema.safeParse({
        password: "newpassword123",
        confirmPassword: "newpassword123",
      })

      expect(result.success).toBe(true)
    })

    it("パスワードが8文字未満の場合にバリデーションが失敗する", () => {
      const result = resetPasswordConfirmSchema.safeParse({
        password: "short",
        confirmPassword: "short",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordErrors = result.error.issues.filter(
          (i) => i.path[0] === "password"
        )
        expect(passwordErrors.length).toBeGreaterThan(0)
        expect(passwordErrors[0].message).toContain("8文字")
      }
    })

    it("パスワードがちょうど8文字の場合にバリデーションが成功する", () => {
      const result = resetPasswordConfirmSchema.safeParse({
        password: "12345678",
        confirmPassword: "12345678",
      })

      expect(result.success).toBe(true)
    })

    it("パスワードと確認パスワードが一致しない場合にバリデーションが失敗する", () => {
      const result = resetPasswordConfirmSchema.safeParse({
        password: "newpassword123",
        confirmPassword: "otherpassword1",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const confirmErrors = result.error.issues.filter(
          (i) =>
            i.path.includes("confirmPassword") || i.path.length === 0
        )
        expect(confirmErrors.length).toBeGreaterThan(0)
      }
    })

    it("エラーメッセージが日本語である", () => {
      const result = resetPasswordConfirmSchema.safeParse({
        password: "short",
        confirmPassword: "different",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          expect(issue.message).toMatch(/[\u3000-\u9FFF]/)
        })
      }
    })
  })

  describe("ActionResult 型", () => {
    it("success: true と message を持つオブジェクトを受け入れる", () => {
      const result: ActionResult = {
        success: true,
        message: "成功しました",
      }

      expect(result).not.toBeNull()
      expect(result?.success).toBe(true)
      expect(result?.message).toBe("成功しました")
    })

    it("success: false と message を持つオブジェクトを受け入れる", () => {
      const result: ActionResult = {
        success: false,
        message: "エラーが発生しました",
      }

      expect(result?.success).toBe(false)
      expect(result?.message).toBe("エラーが発生しました")
    })

    it("null を受け入れる（初期状態）", () => {
      const result: ActionResult = null

      expect(result).toBeNull()
    })
  })
})
