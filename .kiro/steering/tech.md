# 技術スタック

## アーキテクチャ

Next.js App Routerによるフルスタック構成。バックエンドはSupabase（Auth/DB/Storage）に委譲し、Next.js側はUI・API Routes・Middlewareを担当する。

コンテンツ管理は別リポジトリ（GitHub）で行い、GitHub ActionsからLMSの同期APIへ自動連携するDocs as Codeアーキテクチャ。

## コア技術

- **言語**: TypeScript（strict mode有効）
- **フレームワーク**: Next.js 16 (App Router)
- **UIライブラリ**: React 19
- **BaaS**: Supabase（Auth / PostgreSQL / Storage / RLS）
- **UIコンポーネント**: shadcn/ui（導入予定）
- **スタイリング**: Tailwind CSS v4
- **CI/CD**: GitHub Actions

## 主要ライブラリ

開発パターンに影響するもののみ記載:

- `@supabase/ssr` -- Next.js App Router向けSupabaseクライアント（Cookie管理）
- `@supabase/supabase-js` -- Supabaseクライアント
- `next/font` -- フォント最適化（現在Geist Sans/Mono使用）

## 開発標準

### 型安全性

- TypeScript strict mode有効（`tsconfig.json`で`strict: true`）
- `any`の使用は原則禁止

### コード品質

- ESLint: `eslint-config-next` (core-web-vitals + typescript)
- PostCSS: `@tailwindcss/postcss`プラグイン

### テスト

テストフレームワークは未導入（今後設定予定）。

## 開発環境

### 必要ツール

- Node.js（バージョンは`package.json`のenginesに準拠）
- npm（パッケージマネージャー）

### 主要コマンド

```bash
# 開発サーバー起動
cd lms-fe && npm run dev

# ビルド
cd lms-fe && npm run build

# リント
cd lms-fe && npm run lint
```

## 主要な技術的意思決定

| 決定事項 | 選択 | 理由 |
| --- | --- | --- |
| フレームワーク | Next.js App Router | Server Components/Server Actionsによるフルスタック開発 |
| 認証・DB | Supabase | RLSによるきめ細かいアクセス制御、招待制認証の実現 |
| コンテンツ管理 | Docs as Code (GitHub) | LMSからコンテンツ管理を分離、GitHubワークフローで運用 |
| UIコンポーネント | shadcn/ui | Tailwindベースのカスタマイズ可能なコンポーネント |
| スタイリング | Tailwind CSS v4 | ユーティリティファーストCSS、CSS変数によるテーマ管理 |
| アクセス制御 | Next.js Middleware + Supabase RLS | 二重防御（フロント＋DB層） |
| デザインツール | Pencil MCP | `.pen`ファイルとして`designs/`ディレクトリに保存 |

## セキュリティ方針

- 全テーブルにSupabase RLS適用
- Manager権限からのコンテンツアクセスをDB層で遮断
- 同期APIはAPIキーで保護
- 機密トークン（refresh_token等）はSupabase Vaultまたはアプリ層暗号化
- `graduation_date`ベースのアクセス制御をMiddlewareで強制

## 環境変数

`.env.local`で管理（Git管理外）。SupabaseのURL・Anonキー等を格納。

---
_created_at: 2026-02-24_
