import type { Database } from "@/lib/types/database"

describe("Database 型定義 -- settings-profile 関連", () => {
  describe("profiles テーブルの last_name / first_name カラム", () => {
    it("profiles の Row 型に last_name と first_name が含まれている", () => {
      const row: Database["public"]["Tables"]["profiles"]["Row"] = {
        id: "test-uuid",
        full_name: "山田 太郎",
        last_name: "山田",
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

      expect(row.last_name).toBe("山田")
      expect(row.first_name).toBe("太郎")
    })

    it("profiles の Row 型で last_name と first_name が null を許容する", () => {
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

      expect(row.last_name).toBeNull()
      expect(row.first_name).toBeNull()
    })

    it("profiles の Insert 型で last_name / first_name が任意フィールドである", () => {
      const insert: Database["public"]["Tables"]["profiles"]["Insert"] = {
        role: "user",
      }

      expect(insert.last_name).toBeUndefined()
      expect(insert.first_name).toBeUndefined()
    })

    it("profiles の Insert 型で last_name / first_name を指定できる", () => {
      const insert: Database["public"]["Tables"]["profiles"]["Insert"] = {
        role: "user",
        last_name: "田中",
        first_name: "花子",
      }

      expect(insert.last_name).toBe("田中")
      expect(insert.first_name).toBe("花子")
    })

    it("profiles の Update 型で last_name / first_name のみを更新できる", () => {
      const update: Database["public"]["Tables"]["profiles"]["Update"] = {
        last_name: "鈴木",
        first_name: "一郎",
      }

      expect(update.last_name).toBe("鈴木")
      expect(update.first_name).toBe("一郎")
    })
  })

  describe("system_integrations テーブルの型定義", () => {
    it("system_integrations の Row 型に必要なカラムが含まれている", () => {
      const row: Database["public"]["Tables"]["system_integrations"]["Row"] = {
        id: "test-uuid",
        service_name: "google_calendar",
        encrypted_refresh_token: null,
        business_hours: {
          slots: {},
          holidayShift: false,
          bufferMinutes: 0,
          slotDurationMinutes: 60,
        },
        connected_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      expect(row.service_name).toBe("google_calendar")
      expect(row.business_hours).toEqual({
        slots: {},
        holidayShift: false,
        bufferMinutes: 0,
        slotDurationMinutes: 60,
      })
    })

    it("system_integrations の Row 型で encrypted_refresh_token が null を許容する", () => {
      const row: Database["public"]["Tables"]["system_integrations"]["Row"] = {
        id: "test-uuid",
        service_name: "google_calendar",
        encrypted_refresh_token: null,
        business_hours: { slots: {}, holidayShift: false, bufferMinutes: 0, slotDurationMinutes: 60 },
        connected_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      expect(row.encrypted_refresh_token).toBeNull()
    })

    it("system_integrations の Row 型で encrypted_refresh_token が文字列を許容する", () => {
      const row: Database["public"]["Tables"]["system_integrations"]["Row"] = {
        id: "test-uuid",
        service_name: "google_calendar",
        encrypted_refresh_token: "encrypted-token-value",
        business_hours: { slots: {}, holidayShift: false, bufferMinutes: 0, slotDurationMinutes: 60 },
        connected_at: "2026-03-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      expect(row.encrypted_refresh_token).toBe("encrypted-token-value")
      expect(row.connected_at).toBe("2026-03-01T00:00:00Z")
    })

    it("system_integrations の Row 型の business_hours がスロットデータを含む", () => {
      const row: Database["public"]["Tables"]["system_integrations"]["Row"] = {
        id: "test-uuid",
        service_name: "google_calendar",
        encrypted_refresh_token: null,
        business_hours: {
          slots: { mon_0900: true, mon_1000: true, fri_1400: false },
          holidayShift: true,
          bufferMinutes: 15,
          slotDurationMinutes: 30,
        },
        connected_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      expect(row.business_hours.slots["mon_0900"]).toBe(true)
      expect(row.business_hours.holidayShift).toBe(true)
      expect(row.business_hours.bufferMinutes).toBe(15)
      expect(row.business_hours.slotDurationMinutes).toBe(30)
    })

    it("system_integrations の Insert 型で id が任意フィールドである", () => {
      const insert: Database["public"]["Tables"]["system_integrations"]["Insert"] = {
        service_name: "google_calendar",
      }

      expect(insert.service_name).toBe("google_calendar")
      expect(insert.id).toBeUndefined()
    })

    it("system_integrations の Update 型で全フィールドが任意である", () => {
      const update: Database["public"]["Tables"]["system_integrations"]["Update"] = {
        business_hours: {
          slots: { mon_0900: true },
          holidayShift: false,
          bufferMinutes: 10,
          slotDurationMinutes: 60,
        },
      }

      expect(update.business_hours?.slots["mon_0900"]).toBe(true)
    })

    it("system_integrations の Update 型で encrypted_refresh_token を更新できる", () => {
      const update: Database["public"]["Tables"]["system_integrations"]["Update"] = {
        encrypted_refresh_token: "new-encrypted-token",
        connected_at: "2026-03-05T00:00:00Z",
      }

      expect(update.encrypted_refresh_token).toBe("new-encrypted-token")
    })
  })
})
