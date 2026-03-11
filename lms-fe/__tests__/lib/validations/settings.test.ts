import {
  profileSchema,
  passwordChangeSchema,
  businessHoursSchema,
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/validations/settings"

describe("設定ページバリデーションスキーマ", () => {
  describe("profileSchema", () => {
    it("有効な姓と名でバリデーションが成功する", () => {
      const result = profileSchema.safeParse({
        lastName: "山田",
        firstName: "太郎",
      })

      expect(result.success).toBe(true)
    })

    it("姓が空の場合にバリデーションが失敗する", () => {
      const result = profileSchema.safeParse({
        lastName: "",
        firstName: "太郎",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const lastNameErrors = result.error.issues.filter(
          (i) => i.path[0] === "lastName"
        )
        expect(lastNameErrors.length).toBeGreaterThan(0)
        expect(lastNameErrors[0].message).toContain("姓")
      }
    })

    it("名が空の場合にバリデーションが失敗する", () => {
      const result = profileSchema.safeParse({
        lastName: "山田",
        firstName: "",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const firstNameErrors = result.error.issues.filter(
          (i) => i.path[0] === "firstName"
        )
        expect(firstNameErrors.length).toBeGreaterThan(0)
        expect(firstNameErrors[0].message).toContain("名")
      }
    })

    it("姓と名が両方空の場合に両方のエラーが出る", () => {
      const result = profileSchema.safeParse({
        lastName: "",
        firstName: "",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
      }
    })

    it("エラーメッセージが日本語である", () => {
      const result = profileSchema.safeParse({
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

    it("半角英数の姓名でもバリデーションが成功する", () => {
      const result = profileSchema.safeParse({
        lastName: "Yamada",
        firstName: "Taro",
      })

      expect(result.success).toBe(true)
    })
  })

  describe("passwordChangeSchema", () => {
    it("有効なパスワードと確認パスワードでバリデーションが成功する", () => {
      const result = passwordChangeSchema.safeParse({
        newPassword: "password123",
        confirmPassword: "password123",
      })

      expect(result.success).toBe(true)
    })

    it("パスワードが空の場合にバリデーションが失敗する", () => {
      const result = passwordChangeSchema.safeParse({
        newPassword: "",
        confirmPassword: "",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordErrors = result.error.issues.filter(
          (i) => i.path[0] === "newPassword"
        )
        expect(passwordErrors.length).toBeGreaterThan(0)
      }
    })

    it("パスワードが8文字未満の場合にバリデーションが失敗する", () => {
      const result = passwordChangeSchema.safeParse({
        newPassword: "short",
        confirmPassword: "short",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const passwordErrors = result.error.issues.filter(
          (i) => i.path[0] === "newPassword"
        )
        expect(passwordErrors.length).toBeGreaterThan(0)
        expect(passwordErrors[0].message).toContain("8文字")
      }
    })

    it("パスワードがちょうど8文字の場合にバリデーションが成功する", () => {
      const result = passwordChangeSchema.safeParse({
        newPassword: "12345678",
        confirmPassword: "12345678",
      })

      expect(result.success).toBe(true)
    })

    it("パスワードが7文字の場合にバリデーションが失敗する", () => {
      const result = passwordChangeSchema.safeParse({
        newPassword: "1234567",
        confirmPassword: "1234567",
      })

      expect(result.success).toBe(false)
    })

    it("パスワードと確認パスワードが一致しない場合にバリデーションが失敗する", () => {
      const result = passwordChangeSchema.safeParse({
        newPassword: "password123",
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

    it("確認パスワードが空の場合にバリデーションが失敗する", () => {
      const result = passwordChangeSchema.safeParse({
        newPassword: "password123",
        confirmPassword: "",
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        const confirmErrors = result.error.issues.filter(
          (i) => i.path[0] === "confirmPassword"
        )
        expect(confirmErrors.length).toBeGreaterThan(0)
      }
    })

    it("エラーメッセージが日本語である", () => {
      const result = passwordChangeSchema.safeParse({
        newPassword: "short",
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

  describe("アバター画像バリデーション定数", () => {
    it("許可される画像形式が JPEG, PNG, WebP の3種である", () => {
      expect(ACCEPTED_IMAGE_TYPES).toContain("image/jpeg")
      expect(ACCEPTED_IMAGE_TYPES).toContain("image/png")
      expect(ACCEPTED_IMAGE_TYPES).toContain("image/webp")
      expect(ACCEPTED_IMAGE_TYPES).toHaveLength(3)
    })

    it("最大ファイルサイズが 2MB (2 * 1024 * 1024 バイト) である", () => {
      expect(MAX_FILE_SIZE).toBe(2 * 1024 * 1024)
    })
  })

  describe("businessHoursSchema", () => {
    it("有効なビジネスアワー設定でバリデーションが成功する", () => {
      const result = businessHoursSchema.safeParse({
        slots: { mon_0900: true, mon_1000: true, fri_1400: false },
        holidayShift: false,
        bufferMinutes: 0,
        slotDurationMinutes: 60,
      })

      expect(result.success).toBe(true)
    })

    it("空の slots でもバリデーションが成功する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: false,
        bufferMinutes: 0,
        slotDurationMinutes: 60,
      })

      expect(result.success).toBe(true)
    })

    it("holidayShift が true でもバリデーションが成功する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: true,
        bufferMinutes: 15,
        slotDurationMinutes: 30,
      })

      expect(result.success).toBe(true)
    })

    it("bufferMinutes が負の値の場合にバリデーションが失敗する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: false,
        bufferMinutes: -1,
        slotDurationMinutes: 60,
      })

      expect(result.success).toBe(false)
    })

    it("bufferMinutes が 120 の場合にバリデーションが成功する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: false,
        bufferMinutes: 120,
        slotDurationMinutes: 60,
      })

      expect(result.success).toBe(true)
    })

    it("bufferMinutes が 121 の場合にバリデーションが失敗する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: false,
        bufferMinutes: 121,
        slotDurationMinutes: 60,
      })

      expect(result.success).toBe(false)
    })

    it("slotDurationMinutes が 15 の場合にバリデーションが成功する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: false,
        bufferMinutes: 0,
        slotDurationMinutes: 15,
      })

      expect(result.success).toBe(true)
    })

    it("slotDurationMinutes が 14 の場合にバリデーションが失敗する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: false,
        bufferMinutes: 0,
        slotDurationMinutes: 14,
      })

      expect(result.success).toBe(false)
    })

    it("slotDurationMinutes が 120 の場合にバリデーションが成功する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: false,
        bufferMinutes: 0,
        slotDurationMinutes: 120,
      })

      expect(result.success).toBe(true)
    })

    it("slotDurationMinutes が 121 の場合にバリデーションが失敗する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: false,
        bufferMinutes: 0,
        slotDurationMinutes: 121,
      })

      expect(result.success).toBe(false)
    })

    it("bufferMinutes が小数の場合にバリデーションが失敗する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: false,
        bufferMinutes: 15.5,
        slotDurationMinutes: 60,
      })

      expect(result.success).toBe(false)
    })

    it("slotDurationMinutes が小数の場合にバリデーションが失敗する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: false,
        bufferMinutes: 0,
        slotDurationMinutes: 30.5,
      })

      expect(result.success).toBe(false)
    })

    it("必須フィールドが欠けている場合にバリデーションが失敗する", () => {
      const result = businessHoursSchema.safeParse({
        slots: {},
        holidayShift: false,
      })

      expect(result.success).toBe(false)
    })
  })
})
