# Research & Design Decisions

---
**Purpose**: settings-profile 機能のディスカバリーフェーズで得た調査結果と設計判断の根拠を記録する。
**Discovery Scope**: Extension（既存システムの拡張）
---

## Summary
- **Feature**: `settings-profile`
- **Discovery Scope**: Extension -- 既存の認証基盤（Supabase Auth）、profiles テーブル、avatars バケットを拡張し、統合設定ページを新規構築する
- **Key Findings**:
  - profiles テーブルは現在 `full_name` のみ保持しており、`last_name` / `first_name` カラムの追加が必要
  - avatars バケットは招待登録フローで既に使用されており、同一バケットを設定ページからも利用する
  - Next.js Server Actions のデフォルト body サイズ制限は 1MB であり、2MB のアバター画像アップロードには対策が必要

## Research Log

### profiles テーブルの現在のスキーマ
- **Context**: 要件で姓・名の分割入力が確定しているため、既存スキーマとの差分を調査
- **Sources Consulted**: `/Users/kitamurayua/dev/i-field/lms-fe/lib/types/database.ts`、`/Users/kitamurayua/dev/i-field/lms-fe/app/auth/actions/auth.ts`
- **Findings**:
  - 現在のスキーマは `full_name: string | null` のみ
  - 招待登録フローでは `lastName` / `firstName` をフォームで収集し、`"${lastName} ${firstName}"` として `full_name` に結合保存している
  - 既存のコードベース全体で `full_name` を参照している箇所が多数存在（Middleware、AppShellLayout、ユーザー管理ページ等）
- **Implications**:
  - `last_name` / `first_name` カラムを profiles テーブルに追加する
  - `full_name` は互換性のため維持し、`last_name || ' ' || first_name` の Generated Column（または Server Action での結合保存）に移行する
  - 既存データのマイグレーションが必要（既存の `full_name` から姓名を分割、または NULL 許容）

### Supabase Storage -- avatars バケットの既存利用
- **Context**: アバター画像の保存先バケットの調査
- **Sources Consulted**: `/Users/kitamurayua/dev/i-field/lms-fe/app/auth/actions/auth.ts`、Supabase Storage ドキュメント
- **Findings**:
  - `avatars` バケットは既に `completeInviteSetup` Server Action で使用されている
  - ファイルパスは `${user.id}/avatar.${fileExt}` パターン
  - `upsert: true` オプションで上書きアップロード対応済み
  - `getPublicUrl` でパブリック URL を取得している
- **Implications**:
  - 設定ページからのアバター更新も同一パターンを踏襲可能
  - 古い画像の削除は `remove` API を使用（異なる拡張子で保存された場合のみ必要）
  - RLS ポリシーとして `(storage.foldername(name))[1] = auth.uid()::text` を使用し、自身のフォルダのみ操作可能にする

### Next.js Server Actions の body サイズ制限
- **Context**: 2MB のアバター画像を Server Action 経由でアップロードする際の制限調査
- **Sources Consulted**: Next.js ドキュメント、Web検索結果
- **Findings**:
  - Next.js Server Actions のデフォルト body サイズ制限は 1MB
  - `next.config.ts` で `serverActions.bodySizeLimit` を変更可能（例: `"3mb"`）
  - 代替案としてクライアントから Supabase Storage へ直接アップロードする方法もある
- **Implications**: TBD として設計に記載（Server Action 経由 vs クライアント直接アップロード）

### Supabase Auth -- パスワード変更 API
- **Context**: 設定ページからのパスワード変更方法の調査
- **Sources Consulted**: Supabase ドキュメント、既存コードベース（`confirmPasswordReset`）
- **Findings**:
  - `supabase.auth.updateUser({ password })` でログイン中ユーザーのパスワードを変更可能
  - ただし既存コードでは `adminClient.auth.admin.updateUserById` を使用している（Secure password change の影響回避）
  - Supabase の Secure password change 設定が有効な場合、`updateUser` は現在のパスワードの入力を要求する可能性がある
- **Implications**: Admin API 経由のパスワード更新を採用（既存パターンに準拠）。ただし認証済みユーザーの確認を必ず行う。

### Google Calendar OAuth2 連携
- **Context**: Super Admin のシステム設定セクションで Google Calendar API との OAuth2 連携を実装
- **Sources Consulted**: Google OAuth2 ドキュメント、Web検索結果
- **Findings**:
  - OAuth2 Authorization Code Flow を使用: `access_type: 'offline'` + `prompt: 'consent'` でリフレッシュトークンを取得
  - リフレッシュトークンの安全な保存が必須（Supabase Vault またはアプリ層暗号化）
  - Google Cloud Console で OAuth クライアント ID、シークレット、リダイレクト URI を設定する必要がある
  - API スコープ: `https://www.googleapis.com/auth/calendar.readonly`（予約システムでは Busy/Free の確認のみ必要）
- **Implications**:
  - OAuth フローは Next.js API Route（`/api/auth/google/callback`）でコールバックを処理
  - リフレッシュトークンは `system_integrations` テーブルに暗号化保存
  - 環境変数: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

### system_integrations テーブル設計
- **Context**: PRD で定義されている `system_integrations` テーブルの詳細設計
- **Sources Consulted**: `/Users/kitamurayua/dev/i-field/docs/prd.md` セクション 6.4
- **Findings**:
  - PRD 定義: `service_name`, `refresh_token`, `business_hours` (jsonb)
  - 本機能で作成確定（TBD 7 A案）
  - シングルトン行パターン（`service_name = 'google_calendar'` の 1 行のみ）
- **Implications**: `business_hours` の JSONB スキーマを詳細に定義する必要がある（週間カレンダー UI のデータモデル）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Server Action 中心 | 全フォーム送信を Server Actions で処理 | 既存パターンとの一貫性、型安全、RLS 自動適用 | 画像アップロードの body サイズ制限 | 既存コードベースのパターンに準拠 |
| API Route 併用 | OAuth コールバックのみ API Route を使用 | OAuth フローの標準的な実装パターン | 2 つのパターンが混在 | Google OAuth コールバック処理に必要 |

## Design Decisions

### Decision: profiles テーブルへの last_name / first_name 追加方式
- **Context**: 姓名分割入力の要件確定に伴い、DB スキーマの更新方針を決定
- **Alternatives Considered**:
  1. `last_name` / `first_name` カラム追加 + `full_name` は Generated Column 化
  2. `last_name` / `first_name` カラム追加 + `full_name` はアプリケーション層で結合保存を継続
- **Selected Approach**: Option 2 -- アプリケーション層で `full_name = "${last_name} ${first_name}"` を維持
- **Rationale**: Generated Column は Supabase の RLS や既存クエリとの互換性リスクがある。既存コードベースの `full_name` 参照を維持しつつ、新規フォームでは `last_name` / `first_name` を個別に保存・編集できるようにする
- **Trade-offs**: `full_name` の更新漏れリスクがあるが、Server Action で一元管理することで軽減
- **Follow-up**: 既存の招待登録フローも `last_name` / `first_name` の個別保存に更新する（本機能スコープ外、別タスクとして管理）

### Decision: Server Action パターンの採用
- **Context**: フォーム送信の処理方式
- **Selected Approach**: 既存の `ActionResult` パターンを踏襲した Server Actions
- **Rationale**: コードベース全体の一貫性を維持。Zod バリデーション + `useActionState` の確立されたパターンが存在する

### Decision: OAuth コールバック処理に API Route を使用
- **Context**: Google Calendar OAuth2 フローのコールバック処理
- **Selected Approach**: `/api/auth/google/callback` API Route でコールバックを受信し、トークンを保存後に設定ページへリダイレクト
- **Rationale**: OAuth コールバックは外部サービスからのリダイレクトであり、Server Action では処理不可。API Route が標準的なパターン

## Risks & Mitigations
- **Server Actions body サイズ制限** -- `next.config.ts` での制限緩和、またはクライアント直接アップロードで対応（TBD）
- **既存 full_name 参照箇所の影響** -- `full_name` カラムを維持し、`last_name` / `first_name` と同期更新することで後方互換性を確保
- **Google OAuth トークンの安全な保存** -- Supabase Vault またはアプリ層での AES-256 暗号化を検討（PRD のセキュリティ方針に準拠）
- **business_hours JSONB スキーマの将来的な変更** -- JSON Schema で厳密に型定義し、バリデーションを Server Action 層で実施

## References
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) -- RLS ポリシーの設定方法
- [Supabase Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) -- バケット設定
- [Google OAuth2 Web Server Flow](https://developers.google.com/identity/protocols/oauth2/web-server) -- OAuth2 認可コードフロー
- [Supabase Auth updateUser](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) -- パスワード変更 API
- [shadcn/ui Form](https://ui.shadcn.com/docs/forms/react-hook-form) -- React Hook Form + Zod 統合パターン
- [Next.js Server Actions File Upload](https://nikofischer.com/supabase-storage-file-upload-guide) -- ファイルアップロードのベストプラクティス
