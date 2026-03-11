/**
 * @vitest-environment jsdom
 */

/**
 * MarkdownEditor コンポーネントテスト
 *
 * - 編集モードで textarea が表示される
 * - プレビューモードで markdown がレンダリングされる
 * - ツールバーボタンクリックで markdown 構文が挿入される
 * - disabled 時に textarea とツールバーが非活性になる
 * - 空テキスト時のプレビュー表示
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { fireEvent } from "@testing-library/react"

// Mock react-markdown
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="react-markdown">{children}</div>
  ),
}))

// Mock remark-gfm
vi.mock("remark-gfm", () => ({
  default: {},
}))

import { MarkdownEditor } from "@/app/(authenticated)/projects/_components/markdown-editor"

describe("MarkdownEditor", () => {
  // ==============================
  // 編集モード
  // ==============================
  describe("編集モード", () => {
    it("デフォルトで textarea を表示する", () => {
      render(<MarkdownEditor value="" onChange={vi.fn()} />)

      expect(screen.getByRole("textbox")).toBeInTheDocument()
    })

    it("value が textarea に反映される", () => {
      render(<MarkdownEditor value="テスト内容" onChange={vi.fn()} />)

      expect(screen.getByRole("textbox")).toHaveValue("テスト内容")
    })

    it("placeholder が表示される", () => {
      render(
        <MarkdownEditor
          value=""
          onChange={vi.fn()}
          placeholder="説明を入力"
        />
      )

      expect(screen.getByPlaceholderText("説明を入力")).toBeInTheDocument()
    })

    it("入力時に onChange が呼ばれる", async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={handleChange} />)

      await user.type(screen.getByRole("textbox"), "a")
      expect(handleChange).toHaveBeenCalledWith("a")
    })

    it("id が textarea に設定される", () => {
      render(
        <MarkdownEditor value="" onChange={vi.fn()} id="my-editor" />
      )

      expect(screen.getByRole("textbox")).toHaveAttribute("id", "my-editor")
    })
  })

  // ==============================
  // プレビューモード
  // ==============================
  describe("プレビューモード", () => {
    it("プレビュータブをクリックすると markdown がレンダリングされる", async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="**太字**" onChange={vi.fn()} />)

      await user.click(screen.getByText("プレビュー"))

      expect(screen.getByTestId("react-markdown")).toBeInTheDocument()
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    })

    it("空テキスト時に「プレビューするテキストがありません」を表示する", async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={vi.fn()} />)

      await user.click(screen.getByText("プレビュー"))

      expect(
        screen.getByText("プレビューするテキストがありません")
      ).toBeInTheDocument()
    })

    it("空白のみのテキスト時に「プレビューするテキストがありません」を表示する", async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="   " onChange={vi.fn()} />)

      await user.click(screen.getByText("プレビュー"))

      expect(
        screen.getByText("プレビューするテキストがありません")
      ).toBeInTheDocument()
    })

    it("編集タブに戻ると textarea が表示される", async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="テスト" onChange={vi.fn()} />)

      await user.click(screen.getByText("プレビュー"))
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument()

      await user.click(screen.getByText("編集"))
      expect(screen.getByRole("textbox")).toBeInTheDocument()
    })
  })

  // ==============================
  // ツールバー
  // ==============================
  describe("ツールバー", () => {
    it("編集モードでツールバーボタンが表示される", () => {
      render(<MarkdownEditor value="" onChange={vi.fn()} />)

      expect(screen.getByRole("button", { name: "太字" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "斜体" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "見出し" })).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "箇条書き" })
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "コード" })).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "コードブロック" })
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "リンク" })).toBeInTheDocument()
    })

    it("プレビューモードではツールバーボタンが非表示になる", async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={vi.fn()} />)

      await user.click(screen.getByText("プレビュー"))

      expect(
        screen.queryByRole("button", { name: "太字" })
      ).not.toBeInTheDocument()
    })

    it("太字ボタンで **テキスト** が挿入される", async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={handleChange} />)

      await user.click(screen.getByRole("button", { name: "太字" }))
      expect(handleChange).toHaveBeenCalledWith("**テキスト**")
    })

    it("斜体ボタンで *テキスト* が挿入される", async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={handleChange} />)

      await user.click(screen.getByRole("button", { name: "斜体" }))
      expect(handleChange).toHaveBeenCalledWith("*テキスト*")
    })

    it("見出しボタンで ## 見出し が挿入される", async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={handleChange} />)

      await user.click(screen.getByRole("button", { name: "見出し" }))
      expect(handleChange).toHaveBeenCalledWith("## 見出し")
    })

    it("箇条書きボタンで - が挿入される", async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={handleChange} />)

      await user.click(screen.getByRole("button", { name: "箇条書き" }))
      expect(handleChange).toHaveBeenCalledWith("- ")
    })

    it("コードボタンで `コード` が挿入される", async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={handleChange} />)

      await user.click(screen.getByRole("button", { name: "コード" }))
      expect(handleChange).toHaveBeenCalledWith("`コード`")
    })

    it("リンクボタンで [テキスト](url) が挿入される", async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={handleChange} />)

      await user.click(screen.getByRole("button", { name: "リンク" }))
      expect(handleChange).toHaveBeenCalledWith("[テキスト](url)")
    })

    it("コードブロックボタンで ```\\n\\n``` が挿入される", async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={handleChange} />)

      await user.click(screen.getByRole("button", { name: "コードブロック" }))
      expect(handleChange).toHaveBeenCalledWith("```\n\n```")
    })
  })

  // ==============================
  // disabled 状態
  // ==============================
  describe("disabled 状態", () => {
    it("disabled 時に textarea が非活性になる", () => {
      render(<MarkdownEditor value="" onChange={vi.fn()} disabled />)

      expect(screen.getByRole("textbox")).toBeDisabled()
    })

    it("disabled 時にツールバーボタンが非活性になる", () => {
      render(<MarkdownEditor value="" onChange={vi.fn()} disabled />)

      expect(screen.getByRole("button", { name: "太字" })).toBeDisabled()
      expect(screen.getByRole("button", { name: "斜体" })).toBeDisabled()
      expect(screen.getByRole("button", { name: "見出し" })).toBeDisabled()
      expect(
        screen.getByRole("button", { name: "箇条書き" })
      ).toBeDisabled()
      expect(screen.getByRole("button", { name: "コード" })).toBeDisabled()
      expect(
        screen.getByRole("button", { name: "コードブロック" })
      ).toBeDisabled()
      expect(screen.getByRole("button", { name: "リンク" })).toBeDisabled()
    })

    it("disabled 時にタブボタンが非活性になる", () => {
      render(<MarkdownEditor value="" onChange={vi.fn()} disabled />)

      expect(screen.getByText("編集").closest("button")).toBeDisabled()
      expect(screen.getByText("プレビュー").closest("button")).toBeDisabled()
    })
  })

  // ==============================
  // アップロードボタン
  // ==============================
  describe("アップロードボタン", () => {
    it("onUpload 指定時に画像・動画ボタンが表示される", () => {
      render(
        <MarkdownEditor
          value=""
          onChange={vi.fn()}
          onUpload={vi.fn()}
        />
      )

      expect(screen.getByRole("button", { name: "画像" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "動画" })).toBeInTheDocument()
    })

    it("onUpload 未指定時は画像・動画ボタンが非表示", () => {
      render(<MarkdownEditor value="" onChange={vi.fn()} />)

      expect(
        screen.queryByRole("button", { name: "画像" })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: "動画" })
      ).not.toBeInTheDocument()
    })

    it("画像アップロード成功時に ![画像](url) が挿入される", async () => {
      const handleChange = vi.fn()
      const mockUpload = vi.fn().mockResolvedValue("https://example.com/image.png")
      render(
        <MarkdownEditor
          value=""
          onChange={handleChange}
          onUpload={mockUpload}
        />
      )

      const fileInput = screen.getByTestId("image-file-input")
      const file = new File(["dummy"], "test.png", { type: "image/png" })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith(file)
        expect(handleChange).toHaveBeenCalledWith(
          "![画像](https://example.com/image.png)"
        )
      })
    })

    it("動画アップロード成功時に [動画](url) が挿入される", async () => {
      const handleChange = vi.fn()
      const mockUpload = vi.fn().mockResolvedValue("https://example.com/video.mp4")
      render(
        <MarkdownEditor
          value=""
          onChange={handleChange}
          onUpload={mockUpload}
        />
      )

      const fileInput = screen.getByTestId("video-file-input")
      const file = new File(["dummy"], "test.mp4", { type: "video/mp4" })

      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith(file)
        expect(handleChange).toHaveBeenCalledWith(
          "[動画](https://example.com/video.mp4)"
        )
      })
    })
  })
})
