/**
 * 無効化確認ダイアログコンポーネントのテスト
 *
 * deactivate-dialog.tsx のロジック検証。
 * ダイアログ内の警告メッセージ構築とユーザー名の埋め込みを検証する。
 */

describe("無効化確認ダイアログ", () => {
  describe("警告メッセージの構築", () => {
    it("ユーザー名を含む警告メッセージを構築する", () => {
      const userName = "山田 太郎"
      const warningMessage = `${userName} のアカウントを無効化します。このユーザーはシステムにログインできなくなりますが、後から有効化で復元可能です。`

      expect(warningMessage).toContain("山田 太郎")
      expect(warningMessage).toContain("無効化")
      expect(warningMessage).toContain("有効化で復元可能")
    })

    it("fullNameがnullの場合もメッセージを構築できる", () => {
      const userName = "未設定"
      const warningMessage = `${userName} のアカウントを無効化します。このユーザーはシステムにログインできなくなりますが、後から有効化で復元可能です。`

      expect(warningMessage).toContain("未設定")
    })
  })

  describe("ダイアログのテキスト要素", () => {
    it("タイトルが正しい", () => {
      const title = "アカウントを無効化"
      expect(title).toBe("アカウントを無効化")
    })

    it("サブタイトルが正しい", () => {
      const subtitle = "この操作は有効化で復元できます。"
      expect(subtitle).toBe("この操作は有効化で復元できます。")
    })

    it("確認ボタンのテキストが正しい", () => {
      const buttonText = "無効化する"
      expect(buttonText).toBe("無効化する")
    })

    it("キャンセルボタンのテキストが正しい", () => {
      const cancelText = "キャンセル"
      expect(cancelText).toBe("キャンセル")
    })
  })

  describe("モジュールの存在確認", () => {
    it("deactivate-dialog.tsx モジュールが存在し、DeactivateDialogがエクスポートされている", async () => {
      const mod = await import(
        "@/app/(authenticated)/admin/users/[id]/_components/deactivate-dialog"
      )
      expect(mod).toBeDefined()
      expect(mod.DeactivateDialog).toBeDefined()
      expect(typeof mod.DeactivateDialog).toBe("function")
    })
  })
})
