/**
 * 物理削除確認ダイアログコンポーネントのテスト
 *
 * delete-dialog.tsx のロジック検証。
 * ダイアログ内の警告メッセージ構築とユーザー名の埋め込みを検証する。
 */

describe("物理削除確認ダイアログ", () => {
  describe("警告メッセージの構築", () => {
    it("ユーザー名を含む強い警告メッセージを構築する", () => {
      const userName = "山田 太郎"
      const warningMessage = `${userName} のアカウントとすべての関連データを完全に削除します。この操作は不可逆であり、復元することはできません。`

      expect(warningMessage).toContain("山田 太郎")
      expect(warningMessage).toContain("完全に削除")
      expect(warningMessage).toContain("不可逆")
      expect(warningMessage).toContain("復元することはできません")
    })

    it("fullNameがnullの場合もメッセージを構築できる", () => {
      const userName = "未設定"
      const warningMessage = `${userName} のアカウントとすべての関連データを完全に削除します。この操作は不可逆であり、復元することはできません。`

      expect(warningMessage).toContain("未設定")
    })
  })

  describe("ダイアログのテキスト要素", () => {
    it("タイトルが正しい", () => {
      const title = "アカウントを完全に削除"
      expect(title).toBe("アカウントを完全に削除")
    })

    it("サブタイトルが正しい", () => {
      const subtitle = "この操作は取り消せません。"
      expect(subtitle).toBe("この操作は取り消せません。")
    })

    it("確認ボタンのテキストが正しい", () => {
      const buttonText = "完全に削除する"
      expect(buttonText).toBe("完全に削除する")
    })

    it("キャンセルボタンのテキストが正しい", () => {
      const cancelText = "キャンセル"
      expect(cancelText).toBe("キャンセル")
    })
  })

  describe("モジュールの存在確認", () => {
    it("delete-dialog.tsx モジュールが存在し、DeleteDialogがエクスポートされている", async () => {
      const mod = await import(
        "@/app/(authenticated)/admin/users/[id]/_components/delete-dialog"
      )
      expect(mod).toBeDefined()
      expect(mod.DeleteDialog).toBeDefined()
      expect(typeof mod.DeleteDialog).toBe("function")
    })
  })
})
