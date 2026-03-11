# Research & Design Decisions

## Summary
- **Feature**: `user-management`
- **Discovery Scope**: Extension（既存認証基盤・profiles テーブル・App Shell の上に構築）
- **Key Findings**:
  - Supabase Auth Admin API（inviteUserByEmail, updateUserById, deleteUser, getUserById）はすべて service_role キーが必要であり、Server Actions 内で専用の Admin クライアントを使用する必要がある
  - ユーザーの ban 状態は `auth.admin.getUserById` で取得される `banned_until` フィールドで判定可能
  - profiles テーブルに email カラムが存在しないため、ユーザー一覧でメールアドレスを表示するには auth.admin.listUsers と profiles を結合する設計が必要

## Research Log

### Supabase Auth Admin API の調査

- **Context**: ユーザー招待・無効化・有効化・物理削除に Supabase Auth Admin API を使用する設計のため、各 API のシグネチャと制約を調査
- **Sources Consulted**:
  - [Supabase JS: auth.admin.inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail)
  - [Supabase JS: auth.admin.updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)
  - [Supabase JS: auth.admin.deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)
  - [Supabase JS: auth.admin.listUsers](https://supabase.com/docs/reference/javascript/auth-admin-listusers)
  - [Supabase Discussion: How to disable/deactivate a user](https://github.com/orgs/supabase/discussions/9239)
- **Findings**:
  - `inviteUserByEmail(email, options?)`: `options.data` で `user_metadata` を設定可能（ロール情報は `user_metadata` に設定し、DB トリガーで profiles.role へ反映）。`options.redirectTo` でリダイレクト先を指定可能
  - `updateUserById(uid, { ban_duration })`: `ban_duration` に `"876000h"` 等を指定して ban、`"none"` を指定して unban。返却される User オブジェクトに `banned_until` フィールドが含まれる
  - `deleteUser(id, shouldSoftDelete?)`: 物理削除（デフォルト）。profiles は ON DELETE CASCADE で連動削除
  - `getUserById(uid)`: User オブジェクト（email, banned_until 等）を返却
  - `listUsers({ page, perPage })`: デフォルト 50 件/ページ。User オブジェクトの配列を返却
  - すべての Admin API は `service_role` キーで初期化したクライアントでのみ使用可能
- **Implications**:
  - `lib/supabase/admin.ts` に service_role キー使用の Admin クライアントを新設する
  - 環境変数 `SUPABASE_SERVICE_ROLE_KEY`（`NEXT_PUBLIC_` プレフィックスなし）が必要
  - Server Actions 内で呼び出し元ユーザーの認証・認可チェックを必ず行う

### profiles テーブルと auth.users の結合設計

- **Context**: profiles テーブルには email カラムが存在しないが、ユーザー一覧画面でメールアドレスを表示する必要がある
- **Sources Consulted**: 既存の `lib/types/database.ts`、Supabase Auth Admin API ドキュメント
- **Findings**:
  - profiles テーブルのカラム: `id, full_name, avatar_url, role, current_term, created_at, updated_at`
  - email は `auth.users` テーブルにのみ存在する
  - 方式1: profiles テーブルに email カラムを追加 → スキーマ変更が必要だが、RLS で SELECT を制御可能でパフォーマンスが良い
  - 方式2: Server Action 内で `auth.admin.listUsers` と profiles を結合 → スキーマ変更不要だが、Admin API 呼び出しのオーバーヘッドがある
  - 方式3: PostgreSQL ビューで `auth.users` と `profiles` を JOIN → RLS の適用が複雑
- **Implications**: 方式1（profiles に email カラム追加）を採用。DB トリガーで auth.users.email と同期し、RLS で保護できる。検索フィルタも SQL レベルで実行可能

### Ban 状態の判定方法

- **Context**: ユーザー詳細画面で無効化/有効化ボタンの表示を切り替えるため、ban 状態の取得方法を調査
- **Sources Consulted**:
  - [Supabase Discussion: How to show a user that he is banned](https://github.com/orgs/supabase/discussions/22775)
  - [Supabase Issue: Have a way to reliably know if a user is banned](https://github.com/supabase/auth/issues/1354)
- **Findings**:
  - `auth.admin.getUserById(uid)` が返す User オブジェクトの `banned_until` フィールドで判定
  - `banned_until` が `null` または過去の日時 → アクティブ
  - `banned_until` が未来の日時 → ban 中
  - `updateUserById(uid, { ban_duration: "876000h" })` で約100年間の ban を設定（実質的な永久 ban）
  - `updateUserById(uid, { ban_duration: "none" })` で ban 解除
- **Implications**: ユーザー詳細の Server Component で `auth.admin.getUserById` を呼び出し、`banned_until` を判定してクライアントに渡す

### TanStack Table の導入検討

- **Context**: ユーザー一覧テーブルにソート・フィルタ・ページネーション機能が必要
- **Sources Consulted**: shadcn/ui DataTable ドキュメント、TanStack Table v8 ドキュメント
- **Findings**:
  - shadcn/ui の DataTable パターンは `@tanstack/react-table` に依存する
  - 本機能ではサーバーサイドでのフィルタリング・ページネーションを行うため、TanStack Table のクライアントサイドフィルタ機能は不要
  - shadcn/ui の基本 Table コンポーネント（既に導入済み）にサーバーサイドロジックを組み合わせる方がシンプル
- **Implications**: `@tanstack/react-table` は導入せず、既存の shadcn/ui Table + サーバーサイドフィルタリング・ページネーションで実装する。URL SearchParams でフィルタ・ページ状態を管理する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Server Components + Server Actions | ページは Server Component でデータ取得、ミューテーションは Server Actions で実行 | 既存パターンと一致、型安全、RLS 活用可能 | クライアントインタラクション部分は Client Component が必要 | 既存の auth actions パターンに従う |
| API Routes + クライアントフェッチ | REST API エンドポイントを作成し、Client Component からフェッチ | SPA 的な UX | 既存パターンと不一致、二重実装 | 不採用 |

## Design Decisions

### Decision: Admin クライアントの分離

- **Context**: Supabase Auth Admin API は service_role キーが必要。既存の server.ts クライアントは anon キーを使用
- **Alternatives Considered**:
  1. 既存の server.ts に service_role オプションを追加
  2. 新規 `admin.ts` として分離
- **Selected Approach**: `lib/supabase/admin.ts` として分離
- **Rationale**: 関心の分離。service_role クライアントは RLS をバイパスするため、通常のクライアントと明確に区別する必要がある。誤用防止にもなる
- **Trade-offs**: ファイル数が増えるが、セキュリティ上のリスク低減が大きい
- **Follow-up**: Server Actions 内で必ず呼び出し元ユーザーの super_admin 権限を検証すること

### Decision: profiles テーブルへの email カラム追加

- **Context**: ユーザー一覧でメールアドレスを表示・検索する必要があるが、profiles テーブルに email が存在しない
- **Alternatives Considered**:
  1. auth.admin.listUsers で全ユーザーを取得し profiles と結合（Admin API 依存）
  2. profiles に email カラムを追加（DB トリガーで同期）
  3. PostgreSQL ビューで JOIN
- **Selected Approach**: profiles に email カラムを追加し、DB トリガーで auth.users.email と同期
- **Rationale**: RLS で保護可能、SQL レベルでの検索・フィルタが効率的、既存のクエリパターンと一致
- **Trade-offs**: マイグレーションが必要、email の二重管理（ただしトリガーで自動同期）
- **Follow-up**: マイグレーション SQL とトリガー定義を tasks で実装

### Decision: サーバーサイドフィルタリング・ページネーション

- **Context**: ユーザー一覧のフィルタ・ページネーション方式の選択
- **Alternatives Considered**:
  1. TanStack Table によるクライアントサイドフィルタ・ページネーション
  2. URL SearchParams + Server Component によるサーバーサイド処理
- **Selected Approach**: URL SearchParams + Server Component
- **Rationale**: 24件程度でもスケーラビリティを考慮しサーバーサイドで処理。URL にフィルタ状態を保持するため、ブックマーク・共有・ブラウザバックが自然に動作する。TanStack Table の追加依存が不要
- **Trade-offs**: ページ遷移時にサーバーリクエストが発生するが、Server Component のストリーミングで UX は十分
- **Follow-up**: なし

### Decision: ロール設定のタイミング（招待時 vs 招待受諾後）

- **Context**: `inviteUserByEmail` の `options.data` で `user_metadata` にロールを設定し、DB トリガーで profiles.role に反映する
- **Alternatives Considered**:
  1. 招待時に `data: { role }` で metadata に設定 → トリガーで profiles.role に反映
  2. 招待後に別途 `updateUserById` で role を設定
- **Selected Approach**: 招待時に `data: { role }` で設定
- **Rationale**: 1回の API 呼び出しで完結。既存の DB トリガー（auth.users INSERT → profiles INSERT）で `raw_user_meta_data.role` を読み取って profiles.role に設定する拡張が自然
- **Trade-offs**: DB トリガーの修正が必要
- **Follow-up**: 既存トリガーの確認と修正を tasks に含める

## Risks & Mitigations

- **service_role キーの漏洩リスク** → `SUPABASE_SERVICE_ROLE_KEY` は `NEXT_PUBLIC_` プレフィックスなし。Admin クライアントは Server Actions 内でのみ使用。コードレビューで確認
- **認可バイパスリスク** → Server Actions の冒頭で呼び出し元ユーザーの role を検証。super_admin 以外は即座にエラーを返却
- **自己操作の防止漏れ** → 各 Server Action で `auth.uid() === targetUserId` の場合にエラーを返却（ロール変更、無効化、物理削除）
- **profiles.email の同期ズレ** → DB トリガーで auth.users の email 変更時に profiles.email も更新。トリガーが失敗した場合のフォールバックは将来的に検討
- **ページネーションのオフセット問題** → ユーザー数が大幅に増加した場合、OFFSET ベースのページネーションはパフォーマンスが劣化する可能性がある。現時点では十分だが、将来的にカーソルベースへの移行を検討

## References

- [Supabase JS: Auth Admin API](https://supabase.com/docs/reference/javascript/admin-api) -- Admin API 全体の概要
- [Supabase JS: inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail) -- 招待 API
- [Supabase JS: updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) -- ban/unban を含むユーザー更新
- [Supabase JS: deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser) -- 物理削除
- [Supabase JS: listUsers](https://supabase.com/docs/reference/javascript/auth-admin-listusers) -- ユーザー一覧取得
- [Supabase JS: getUserById](https://supabase.com/docs/reference/javascript/auth-admin-getuserbyid) -- 個別ユーザー取得（banned_until 含む）
- [Supabase: Creating a client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- service_role クライアント作成
- [Supabase Discussion: Service Role with Next.js](https://github.com/orgs/supabase/discussions/30739) -- Server Actions での service_role 使用パターン
