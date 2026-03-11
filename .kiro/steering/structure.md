# プロジェクト構成

## 構成の基本方針

モノレポ構成を採用。ルートディレクトリにプロジェクト全体の設定と共有リソースを配置し、`lms-fe/`にNext.jsアプリケーションを格納する。

## ディレクトリパターン

### Next.jsアプリケーション (`lms-fe/`)

**目的**: LMSフロントエンド・APIの全コード
**構成**: Next.js App Router規約に従う

```
lms-fe/
  app/          -- App Routerのルーティング（ページ、レイアウト、API Routes）
  public/       -- 静的アセット
```

現在は初期セットアップ状態（`create-next-app`のスキャフォールド）。今後の機能開発で以下のパターンに拡張予定:

- `app/(auth)/` -- 認証関連ルート（ログイン、招待登録）
- `app/(user)/` -- 受講生向けルート
- `app/(manager)/` -- マネージャー向けルート
- `app/(admin)/` -- スーパー管理者向けルート
- `app/api/` -- API Routes（同期API等）
- `components/` -- 共有UIコンポーネント（shadcn/ui含む）
- `lib/` -- ユーティリティ、Supabaseクライアント等

### ドキュメント (`docs/`)

**目的**: プロジェクトの要件定義書・設計ドキュメント
**パターン**: Markdownファイルで管理
**主要ファイル**: `docs/prd.md`（要件定義書）

### デザイン (`designs/`)

**目的**: UIデザインデータ
**パターン**: Pencil MCPで作成した`.pen`ファイルを配置
**規約**: デザインは必ずこのディレクトリ配下に保存・参照する

### 仕様・ステアリング (`.kiro/`)

**目的**: AI開発支援のためのプロジェクトメモリ
**パターン**:
- `.kiro/steering/` -- プロジェクト全体のコンテキスト（本ファイル群）
- `.kiro/specs/` -- 機能ごとの仕様（要件・設計・タスク）

## 命名規約

- **ディレクトリ**: kebab-case（例: `coaching-sessions`）
- **コンポーネントファイル**: App Router規約に従う（`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`）
- **UIコンポーネント**: PascalCase（例: `Button.tsx`, `UserCard.tsx`）
- **ユーティリティ**: camelCase（例: `supabaseClient.ts`, `formatDate.ts`）
- **型定義**: PascalCase（例: `User`, `DailyReport`）
- **DBテーブル**: snake_case（例: `daily_reports`, `coaching_sessions`）

## インポート規約

```typescript
// パスエイリアス（tsconfig.jsonで設定済み）
import { Something } from '@/lib/something'   // lms-feルートからの絶対パス
import { Local } from './local'                // 同階層の相対パス
```

**パスエイリアス**:
- `@/*` -> `lms-fe/*`（lms-feルートからの絶対パス）

## App Routerのルーティング方針

- Route Groups `(group)/` を使用してロール別にルートを分離
- 各ロールのダッシュボードを起点とした画面遷移
- Middlewareで`graduation_date`に基づくアクセス制御を実装
- Server ComponentsをデフォルトとしClient Componentは必要最小限に

## コード構成の原則

- **関心の分離**: UIコンポーネントにビジネスロジックを持たせない
- **Server Components優先**: データフェッチはServer Componentsで行い、インタラクティブな部分のみClient Component化
- **Supabase RLS依存**: アプリケーション層のアクセス制御に加え、DB層でRLSを必ず適用
- **Docs as Code分離**: LMSアプリケーション内にコンテンツ作成・編集機能は作らない

---
_created_at: 2026-02-24_
