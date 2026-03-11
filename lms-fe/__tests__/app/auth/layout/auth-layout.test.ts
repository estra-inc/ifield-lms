import fs from "fs"
import path from "path"

describe("AuthLayout (app/auth/layout.tsx)", () => {
  const layoutPath = path.resolve(__dirname, "../../../../app/auth/layout.tsx")

  it("layout.tsx ファイルが存在する", () => {
    expect(fs.existsSync(layoutPath)).toBe(true)
  })

  it("Server Component である ('use client' ディレクティブがない)", () => {
    const content = fs.readFileSync(layoutPath, "utf-8")
    expect(content).not.toContain('"use client"')
    expect(content).not.toContain("'use client'")
  })

  it("App Shell コンポーネント (SidebarProvider, AppSidebar, AppHeader) をインポートしていない", () => {
    const content = fs.readFileSync(layoutPath, "utf-8")
    expect(content).not.toContain("SidebarProvider")
    expect(content).not.toContain("AppSidebar")
    expect(content).not.toContain("AppHeader")
    expect(content).not.toContain("AppShellLayout")
  })

  it("children を受け取り、レンダリングする関数をエクスポートする", () => {
    const content = fs.readFileSync(layoutPath, "utf-8")
    expect(content).toContain("children")
    expect(content).toMatch(/export\s+default/)
  })
})
