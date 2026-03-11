import fs from "fs"
import path from "path"

describe("AppSidebar - ログアウト連携 (components/app-shell/app-sidebar.tsx)", () => {
  const sidebarPath = path.resolve(
    __dirname,
    "../../../components/app-shell/app-sidebar.tsx"
  )

  it("app-sidebar.tsx ファイルが存在する", () => {
    expect(fs.existsSync(sidebarPath)).toBe(true)
  })

  it("logout Server Action をインポートしている", () => {
    const content = fs.readFileSync(sidebarPath, "utf-8")
    expect(content).toContain("logout")
    expect(content).toContain("@/app/auth/actions/auth")
  })

  it("handleLogout 内で logout Server Action を呼び出している (console.log のプレースホルダを置き換え済み)", () => {
    const content = fs.readFileSync(sidebarPath, "utf-8")
    // プレースホルダの console.log が削除されていること
    expect(content).not.toContain('console.log("Logout requested")')
  })

  it("handleLogout が async 関数として定義されている", () => {
    const content = fs.readFileSync(sidebarPath, "utf-8")
    // logout() は Server Action (async) なので handleLogout も async である必要がある
    expect(content).toMatch(/handleLogout.*=.*async/)
  })

  it("handleLogout 内で logout() を呼び出している", () => {
    const content = fs.readFileSync(sidebarPath, "utf-8")
    // handleLogout の定義内に logout() 呼び出しがあること
    expect(content).toMatch(/logout\(\)/)
  })
})
