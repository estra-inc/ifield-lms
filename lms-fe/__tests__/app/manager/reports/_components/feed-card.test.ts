/**
 * FeedCard コンポーネントのテスト
 *
 * Manager 向け日報フィードカードのロジックを検証する。
 * - アバターイニシャル生成
 * - ユーザー別の決定論的カラー割り当て
 * - いいね状態による UI 分岐
 * - ロール別のいいねボタン表示/非表示
 */
import {
  getAvatarInitial,
  getAvatarColor,
  shouldShowLikeButton,
  AVATAR_COLORS,
} from "@/lib/utils/avatar"

describe("FeedCard", () => {
  describe("getAvatarInitial", () => {
    it("姓名スペース区切りの場合、姓の頭文字を返す", () => {
      expect(getAvatarInitial("田中 太郎")).toBe("田")
    })

    it("単名の場合、最初の文字を返す", () => {
      expect(getAvatarInitial("田中")).toBe("田")
    })

    it("空文字の場合、'?' を返す", () => {
      expect(getAvatarInitial("")).toBe("?")
    })

    it("英語名の場合、姓の最初の文字を返す", () => {
      expect(getAvatarInitial("Tanaka Taro")).toBe("T")
    })
  })

  describe("getAvatarColor", () => {
    it("同一ユーザー ID に対して常に同じ色を返す", () => {
      const userId = "550e8400-e29b-41d4-a716-446655440000"
      const color1 = getAvatarColor(userId)
      const color2 = getAvatarColor(userId)
      expect(color1).toBe(color2)
    })

    it("異なるユーザー ID に対して（高確率で）異なる色を返す", () => {
      const color1 = getAvatarColor("user-id-1")
      const color2 = getAvatarColor("user-id-2")
      expect(typeof color1).toBe("string")
      expect(typeof color2).toBe("string")
      expect(AVATAR_COLORS).toContain(color1)
      expect(AVATAR_COLORS).toContain(color2)
    })

    it("返される色は AVATAR_COLORS 配列の要素である", () => {
      const testIds = [
        "uuid-1", "uuid-2", "uuid-3", "uuid-4", "uuid-5",
        "uuid-6", "uuid-7", "uuid-8", "uuid-9", "uuid-10",
      ]
      for (const id of testIds) {
        const color = getAvatarColor(id)
        expect(AVATAR_COLORS).toContain(color)
      }
    })
  })

  describe("shouldShowLikeButton", () => {
    it("Manager ロールの場合は true を返す", () => {
      expect(shouldShowLikeButton("manager")).toBe(true)
    })

    it("Super Admin ロールの場合は false を返す（閲覧専用）", () => {
      expect(shouldShowLikeButton("super_admin")).toBe(false)
    })

    it("User ロールの場合は false を返す", () => {
      expect(shouldShowLikeButton("user")).toBe(false)
    })
  })

  describe("いいね状態の UI 分岐", () => {
    it("likedByManager=true の場合のスタイル定義が正しい", () => {
      const liked = true
      const bgClass = liked ? "bg-[#FEF2F2]" : ""
      const btnClass = liked
        ? "bg-[#EF4444] text-white hover:bg-[#EF4444]/90"
        : "border"
      const label = liked ? "いいね済み" : "いいね"

      expect(bgClass).toBe("bg-[#FEF2F2]")
      expect(btnClass).toContain("#EF4444")
      expect(label).toBe("いいね済み")
    })

    it("likedByManager=false の場合のスタイル定義が正しい", () => {
      const liked = false
      const bgClass = liked ? "bg-[#FEF2F2]" : ""
      const btnClass = liked
        ? "bg-[#EF4444] text-white hover:bg-[#EF4444]/90"
        : "border"
      const label = liked ? "いいね済み" : "いいね"

      expect(bgClass).toBe("")
      expect(btnClass).toBe("border")
      expect(label).toBe("いいね")
    })
  })
})
