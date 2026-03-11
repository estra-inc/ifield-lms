# Research & Design Decisions: 演習問題（Quiz）

## Summary
- **Feature**: quiz
- **Discovery Scope**: Extension（既存コンテンツ同期・表示システムの拡張）
- **Key Findings**:
  - 既存同期API（`POST /api/admin/sync-curriculums`）は RPC `sync_content_version` を呼び出す構造で、クイズ同期は同一エンドポイントのペイロード拡張またはRPC追加で対応可能
  - `content_versions` テーブルの `version_id` ベースバージョン管理が確立済み。`quizzes` テーブルも同パターンで管理する
  - セクション詳細ページは Server Component + Client Component（ReadCompleteButton）の分離パターンが確立済み。クイズUIも同一パターンで実装する

## Research Log

### 既存同期APIの構造分析
- **Context**: クイズデータの同期方法を決定するため、既存の同期APIの構造を調査
- **Sources Consulted**: `lms-fe/app/api/admin/sync-curriculums/route.ts`, `lms-fe/lib/supabase/admin.ts`
- **Findings**:
  - 同期APIは `x-api-key` ヘッダーによるAPIキー認証を使用
  - `createAdminClient()` でRLSバイパスし、RPC `sync_content_version` を呼び出す
  - ペイロードは `contents` 配列 + `commit_hash` の構造
  - RPC は `p_commit_hash` と `p_contents` を受け取り、draft バージョンの作成・上書きを行う
  - 返却値は `version_id` と `changes_summary`（added/updated/deleted）
- **Implications**: クイズ同期はペイロードに `quizzes` 配列を追加し、新規 RPC `sync_quiz_version` で処理する方式が最適。既存コンテンツ同期ロジックとの分離を維持しつつ、同一エンドポイント・同一バージョンで管理できる

### バージョン管理パターン
- **Context**: クイズデータのバージョン管理方法を確認
- **Sources Consulted**: `lms-fe/lib/supabase/content-version.ts`, `lms-fe/lib/types/database.ts`
- **Findings**:
  - `content_versions` テーブルで `draft` / `active` / `archived` のステータス管理
  - `resolveVersionId()` で active バージョンIDを解決し、Super Admin のみ任意バージョンをプレビュー可能
  - `contents` テーブルは `version_id` 外部キーで `content_versions` に紐づく
  - `getActiveVersionId()` は `status='active'` のバージョンを1件取得
- **Implications**: `quizzes` テーブルも同一の `version_id` で管理し、`resolveVersionId()` を共用する。クイズの公開・非公開は `content_versions` の active ステータスに連動する

### UI コンポーネントパターン
- **Context**: クイズUIの設計パターンを既存実装から導出
- **Sources Consulted**: セクション詳細ページ、ReadCompleteButton、ContentsTabs、ContentBreadcrumb
- **Findings**:
  - Server Component でデータフェッチ、Client Component でインタラクティブ処理の分離パターン
  - Server Actions は `createClient()` でユーザー認証を行い、`revalidatePath()` でキャッシュ無効化
  - `ActionResult` 型（`{ success: boolean; message: string } | null`）を Server Actions の戻り値に使用
  - ContentsTabs は「教材」タブがアクティブ、「演習問題」タブが disabled 状態で実装済み
  - パンくずリストは `ContentBreadcrumb` コンポーネントで統一
  - モーダルは shadcn/ui の `Dialog` コンポーネントを使用
- **Implications**: クイズ解答ページは Server Component（データフェッチ）+ Client Component（解答・採点インタラクション）で構成。ContentsTabs を拡張して「演習問題」タブを有効化する

### Middleware とアクセス制御
- **Context**: クイズページのアクセス制御要件を確認
- **Sources Consulted**: `lms-fe/middleware.ts`
- **Findings**:
  - `/contents/*` パスで `graduation_date` ベースのアクセス制御を実施
  - 受講期間が過去日付の場合はダッシュボードへリダイレクト
  - sync-curriculums APIは Middleware の matcher から除外済み
- **Implications**: クイズページを `/contents/` 配下に配置すれば、既存 Middleware で受講期間チェックが自動適用される。追加の Middleware 変更は不要

### データベース型定義パターン
- **Context**: 新テーブルの型定義方法を確認
- **Sources Consulted**: `lms-fe/lib/types/database.ts`
- **Findings**:
  - `Database` 型で全テーブルの Row/Insert/Update/Relationships を手動定義
  - 将来的に `supabase gen types typescript` での自動生成に移行予定
  - 各テーブルは明確な型定義（ユニオン型、nullable指定）を持つ
- **Implications**: `quizzes` と `quiz_logs` テーブルの型定義を `database.ts` に追加する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 同一APIエンドポイント拡張 | sync-curriculums にクイズペイロードを追加 | 既存CI/CDパイプラインを維持、単一エンドポイントで管理 | ペイロードサイズ増大、既存ロジックの複雑化 | 採用: 同期の原子性を維持 |
| 別エンドポイント分離 | /api/admin/sync-quizzes を新設 | 関心の分離が明確 | GitHub Actions側の変更が大きい、バージョン整合性の管理が複雑 | 不採用: バージョン管理の一貫性が損なわれる |

## Design Decisions

### Decision: 同期APIのペイロード拡張方式
- **Context**: クイズデータの同期をどのように実現するか
- **Alternatives Considered**:
  1. 既存エンドポイントのペイロードに `quizzes` フィールドを追加
  2. 新規エンドポイント `/api/admin/sync-quizzes` を作成
- **Selected Approach**: 既存エンドポイントのペイロードに `quizzes` フィールドをオプショナルで追加。クイズデータが含まれる場合のみクイズ同期処理を実行する
- **Rationale**: コンテンツとクイズは同一バージョン（`version_id`）で管理される。同一トランザクション内で同期することでバージョン整合性を保証できる。後方互換性も維持される（`quizzes` フィールドが無い場合は既存動作のまま）
- **Trade-offs**: ペイロードサイズが増大するが、同期頻度が低い（Git push時のみ）ため許容範囲
- **Follow-up**: RPC `sync_content_version` の拡張または新規 RPC の追加が必要

### Decision: クライアントサイド採点方式
- **Context**: 採点処理をサーバーサイドとクライアントサイドのどちらで行うか
- **Alternatives Considered**:
  1. クライアントサイドで即時採点（正解データを含めてフェッチ）
  2. サーバーサイドで採点（回答をServer Actionに送信）
- **Selected Approach**: クライアントサイドで即時採点。正解データを含むクイズデータをServer Componentでフェッチし、Client Componentに渡す
- **Rationale**: 要件定義で「クライアントサイドで即時に採点」が明記されている。即時フィードバックのUX優先。正解データの秘匿は要件外（学習目的のクイズであり、不正防止は不要）
- **Trade-offs**: ブラウザの開発者ツールで正解が確認可能だが、学習促進が目的であり問題ない。将来的に秘匿が必要になった場合はサーバーサイド採点に移行可能
- **Follow-up**: quiz_logs への保存は Server Action 経由で行う

### Decision: 選択肢シャッフルの実装箇所
- **Context**: 選択肢のランダムシャッフルをどこで実行するか
- **Alternatives Considered**:
  1. Client Component の初期レンダリング時にシャッフル
  2. Server Component でシャッフルしてから渡す
- **Selected Approach**: Client Component のマウント時（`useMemo` + seed）でシャッフル
- **Rationale**: 「もう一度挑戦する」ボタンで再シャッフルが必要。Client Component で状態リセットと連動させることで自然に実装できる
- **Trade-offs**: SSR時の初期HTMLとクライアント側の表示順序が異なるが、クイズページ全体が Client Component のため問題ない

## Risks & Mitigations
- **RPC拡張の複雑性**: 既存 `sync_content_version` RPCの変更は影響範囲が大きい。新規RPC `sync_quiz_data` を作成し、API Route内で既存RPCと新規RPCを順次呼び出す方式でリスクを軽減する
- **JSONB型のクエリパフォーマンス**: `questions` カラムがJSONB型のため、大量データ時にクエリが遅くなる可能性がある。現時点では問題の規模が小さいため、インデックスは必要に応じて追加する
- **型安全性の確保**: JSONB カラムの型安全性が弱い。TypeScript側で厳密な型定義とランタイムバリデーション（zod）を導入する

## References
- Supabase RLS documentation: https://supabase.com/docs/guides/database/postgres/row-level-security
- Next.js App Router Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
- Fisher-Yates shuffle algorithm: 選択肢シャッフルに使用する標準的なアルゴリズム
