# リサーチ & 設計判断: App Shell

---
**目的**: App Shell機能の技術設計を裏付ける調査結果、アーキテクチャ検討、設計判断の根拠を記録する。

**利用方法**:
- ディスカバリフェーズでの調査活動と結果を記録
- `design.md`に収まらない詳細なトレードオフを文書化
- 将来の監査や再利用のための参照・根拠を提供
---

## サマリ
- **機能**: `app-shell`
- **ディスカバリ範囲**: Extension（既存shadcn/ui Sidebarコンポーネント群を活用した新規レイアウト構築）
- **主要な発見**:
  - shadcn/ui SidebarProviderはCookie（`sidebar_state`）で展開/折りたたみ状態を永続化。Next.js 16のcache components機能と組み合わせる場合、`await cookies()`がBlocking Routeエラーを引き起こす可能性がある
  - Next.js App RouterのRoute Groupsを使用すれば、`(user)/`, `(manager)/`, `(admin)/` の各グループに同一のApp Shellレイアウトを適用可能。共通レイアウトコンポーネントを作成し、各Route Groupの `layout.tsx` から参照する設計が最適
  - Sora / IBM Plex Monoフォントは `next/font/google` で直接インポート可能。現在のGeistフォントから置き換える必要がある

## リサーチログ

### shadcn/ui Sidebar + Next.js 16の互換性

- **コンテキスト**: SidebarProviderのCookie永続化がNext.js 16のcache components機能と競合するバグ報告（shadcn-ui/ui#9189）が存在
- **参照ソース**: [GitHub Issue #9189](https://github.com/shadcn-ui/ui/issues/9189)
- **発見**:
  - `await cookies()` をServer Componentのレイアウトで呼び出すと、Next.js 16のcache components有効時にBlocking Routeエラーが発生する
  - 回避策: Suspenseバウンダリで囲む、`use cache`コンポーネントでラップ、またはcache componentsを無効化
- **設計への影響**: レイアウトでの `cookies()` 呼び出しを `<Suspense>` で囲むか、defaultOpenをハードコードして回避する。現時点では `<Suspense>` ラップが最も安全な選択

### Route Groups間での共通レイアウト共有

- **コンテキスト**: 3つのロール別Route Groupsに同一のApp Shellレイアウトを適用する方法
- **参照ソース**: [Next.js Route Groups ドキュメント](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
- **発見**:
  - 各Route Groupに個別の `layout.tsx` を配置し、共通のApp Shellコンポーネントをインポートする方式が推奨
  - Route Group間で同一URLパスに解決されるルートは不可（例: `(user)/dashboard` と `(admin)/dashboard` は両方 `/dashboard` になるため競合）
  - 解決策: 各ロールのRoute Group内に `dashboard/page.tsx` を配置し、Middlewareでロールに基づいたリダイレクトを行う
- **設計への影響**: 共通App Shellコンポーネントを `components/layouts/` に配置し、各Route Groupの `layout.tsx` から呼び出す。URLパスの競合はMiddlewareで解決

### フォント移行: Geist -> Sora + IBM Plex Mono

- **コンテキスト**: デザインシステムで指定されたフォントへの切り替え
- **参照ソース**: [Google Fonts - Sora](https://fonts.google.com/specimen/Sora), [Google Fonts - IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono)
- **発見**:
  - `next/font/google` から `Sora` と `IBM_Plex_Mono` を直接インポート可能
  - CSS変数 `--font-primary` (Sora) と `--font-secondary` (IBM Plex Mono) として登録
  - `globals.css` の `@layer base` でユーティリティクラス `font-primary`, `font-secondary` を定義
- **設計への影響**: `app/layout.tsx` のフォント定義を差し替え。Tailwind設定にカスタムフォントを追加

### shadcn/ui Sidebar collapsible="icon" モード

- **コンテキスト**: サイドバーの展開(240px)/折りたたみ(48px)の実現方式
- **参照ソース**: [shadcn/ui Sidebar ドキュメント](https://ui.shadcn.com/docs/components/radix/sidebar)
- **発見**:
  - `collapsible="icon"` プロパティでアイコンのみモードを実現可能
  - 折りたたみ時のCSS: `group-data-[collapsible=icon]:hidden` でテキスト要素を非表示化
  - `SIDEBAR_WIDTH` (16rem = 256px) と `SIDEBAR_WIDTH_ICON` (3rem = 48px) がデフォルト値
  - デザイン仕様の240px (15rem) に合わせるには `--sidebar-width` のオーバーライドが必要
- **設計への影響**: SidebarProviderの `style` プロパティで `--sidebar-width: 15rem` をオーバーライド。`collapsible="icon"` を使用

## アーキテクチャパターン評価

| 選択肢 | 説明 | 強み | リスク / 制限 | 備考 |
|--------|------|------|--------------|------|
| A: 各Route Groupに個別layout + 共通コンポーネント | `components/layouts/AppShell.tsx` を作成し、各Route Groupのlayoutから呼び出す | 関心の分離が明確、ロール別カスタマイズが容易 | コンポーネントの重複呼び出し（ただしReactが最適化） | **採用** |
| B: 単一のRoute Groupで全ロールを統合 | `(authenticated)/layout.tsx` 一つでMiddlewareによるロール分岐 | layoutファイル数が少ない | ロール別のメタデータやレイアウト拡張が困難 | 却下 |
| C: Parallel Routesによる動的サイドバー切り替え | `@sidebar` スロットでロール別サイドバーを並列レンダリング | 高度な動的UI制御 | 過剰な複雑性、現要件に対してオーバーエンジニアリング | 却下 |

## 設計判断

### 判断: Route Groups構成とレイアウト共有方式

- **コンテキスト**: 3つのロール（User/Manager/Super Admin）が同一のApp Shellを共有しつつ、ロール別のメニュー項目やアクセス制御を持つ
- **検討した選択肢**:
  1. 選択肢A — 共通AppShellコンポーネント + 各Route Group個別layout
  2. 選択肢B — 単一認証済みRoute Group + Middleware分岐
- **選択したアプローチ**: 選択肢A。`components/layouts/AppShell.tsx` を共通コンポーネントとして作成し、`(user)/layout.tsx`, `(manager)/layout.tsx`, `(admin)/layout.tsx` の各layoutから呼び出す
- **根拠**: steering/structure.md の「Route Groups `(group)/` を使用してロール別にルートを分離」方針に合致。将来のロール別拡張（独自のヘッダー要素やレイアウト変更）が容易
- **トレードオフ**: layoutファイルの重複があるが、内容は共通コンポーネントの呼び出しのみで最小限
- **フォローアップ**: Middlewareでのロール判定とリダイレクトロジックは別仕様で定義

### 判断: サイドバー状態管理方式

- **コンテキスト**: サイドバーの展開/折りたたみ状態を画面遷移やリロード後も維持する
- **検討した選択肢**:
  1. 選択肢A — shadcn/ui SidebarProvider標準のCookie永続化
  2. 選択肢B — Client Componentのみで状態管理（Cookie不使用）
- **選択したアプローチ**: 選択肢A（Cookie永続化）を採用。ただしNext.js 16のcache components問題を考慮し、layoutでの `cookies()` 呼び出しを `<Suspense>` で安全にラップする
- **根拠**: UX的にリロード後もサイドバー状態が維持されることが望ましい。SidebarProviderの標準機能を活用することで追加コード不要
- **トレードオフ**: cache components有効時にSuspenseフォールバックが一瞬表示される可能性
- **フォローアップ**: shadcn-ui/ui#9189の進捗を監視し、公式修正があれば適用

### 判断: サイドバー幅のカスタマイズ方式

- **コンテキスト**: デザイン仕様では展開時240px、折りたたみ時48px。shadcn/uiデフォルトは展開16rem(256px)、折りたたみ3rem(48px)
- **検討した選択肢**:
  1. 選択肢A — SidebarProviderのstyleプロパティで `--sidebar-width` をオーバーライド
  2. 選択肢B — `sidebar.tsx` の定数を直接編集
- **選択したアプローチ**: 選択肢A。SidebarProviderに `style={{ "--sidebar-width": "15rem" }}` を渡す
- **根拠**: shadcn/uiの更新時にコンフリクトを回避できる。`--sidebar-width-icon` は3rem(48px)でデザイン仕様と一致するためオーバーライド不要
- **トレードオフ**: styleプロパティ経由のため、CSSファイルでの管理に比べて可視性がやや低い
- **フォローアップ**: なし

## リスク & 軽減策

- **Next.js 16 cache components との競合** — Suspenseバウンダリによるラップで軽減。issue#9189の進捗を継続的に監視
- **URLパス競合** — Middlewareでロール判定し適切なRoute Groupへリダイレクト。認証後の初回リダイレクトで解決
- **フォント移行によるCLS** — `next/font/google` の `display: 'swap'` オプションと `variable` モードで最小化
- **ドロップアップメニューのポジション** — DropdownMenuの `side="top"` で上方向表示。ビューポート端でのはみ出しはRadix UIのコリジョン検出で自動対応

## 参考文献

- [shadcn/ui Sidebar ドキュメント](https://ui.shadcn.com/docs/components/radix/sidebar) — Sidebarコンポーネントの公式リファレンス
- [Next.js Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) — Route Groups ファイルシステム規約
- [Next.js Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages) — Layout/Page設計ガイド
- [shadcn-ui/ui#9189](https://github.com/shadcn-ui/ui/issues/9189) — SidebarProvider + Next.js 16 cache components 互換性問題
- [Google Fonts - Sora](https://fonts.google.com/specimen/Sora) — プライマリフォント
- [Google Fonts - IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) — セカンダリフォント（データ/技術テキスト用）
