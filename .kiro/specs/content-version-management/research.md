# Research & Design Decisions: コンテンツバージョン管理

---
**Purpose**: ディスカバリーフェーズで得られた調査結果、アーキテクチャ上の判断根拠、およびトレードオフを記録する。
**Discovery Scope**: Extension（既存同期パイプラインへのバージョン管理レイヤーの追加）

**Key Findings**:
- 既存の同期 API は `status = 'active'` を直接セットしており、version_id ベースのフィルタリングへの移行が必要
- 受講生ページの全クエリが `.eq("status", "active")` パターンに依存しており、version_id ベースに一括変更が必要
- contents テーブルの `slug_path` UNIQUE 制約は version_id 導入後に複合ユニーク制約 `(slug_path, version_id)` へ変更する必要がある
---

## Research Log

### contents テーブルの UNIQUE 制約と version_id の共存

- **Context**: 現在 `contents.slug_path` に UNIQUE 制約が存在する。draft と active で同じ slug_path のレコードが共存するため、制約の変更が必要。
- **Sources Consulted**: 既存マイグレーション `20260228130000_contents_and_progress.sql`、Supabase PostgreSQL ドキュメント
- **Findings**:
  - 現行: `slug_path TEXT UNIQUE NOT NULL`
  - draft 同期時に同じ slug_path で version_id が異なるレコードを INSERT する必要がある
  - `UNIQUE (slug_path, version_id)` の複合ユニーク制約に変更することで、同一 slug_path でもバージョンごとに独立したレコードを保持可能
  - UPSERT の `onConflict` も `slug_path, version_id` に変更する必要がある
- **Implications**: マイグレーションで既存の UNIQUE 制約を DROP し、複合ユニーク制約を作成する。既存インデックスも version_id を含む形に更新する。

### 同期 API の既存パターンと変更方針

- **Context**: 既存の `POST /api/admin/sync-curriculums` は全コンテンツを一括 UPSERT し、含まれないものを archived にする設計。
- **Sources Consulted**: `lms-fe/app/api/admin/sync-curriculums/route.ts`
- **Findings**:
  - 現行の UPSERT は `slug_path` をコンフリクトキーとして使用
  - `status: "active"` をハードコードしている
  - アーカイブ処理で `status = 'active'` かつペイロード外の slug_path を archived に変更
  - 変更後: UPSERT 対象は draft version_id に紐づくレコードのみ。active レコードには触れない。
  - アーカイブ処理（ペイロード外の slug_path 削除）は draft 内のみに適用。承認時に旧 active を処理する。
- **Implications**: 同期 API のロジックを大幅に変更。draft バージョンの作成/更新と、draft レコードの UPSERT を分離する。

### RLS ポリシーの version_id 対応

- **Context**: 既存 RLS は `status = 'active'` でフィルタリングしている。version_id ベースに移行する必要がある。
- **Sources Consulted**: 既存マイグレーション RLS 定義
- **Findings**:
  - 既存ポリシー `users_select_active_contents`: `status = 'active'` AND role IN ('user', 'super_admin')
  - 既存ポリシー `super_admin_select_all_contents`: role = 'super_admin'（全ステータス）
  - 新方針: User ロールは `version_id` が active バージョンの `id` に一致するコンテンツのみ参照可能
  - Super Admin は全バージョンのコンテンツを参照可能（既存ポリシーで対応済み）
  - `?version_id` パラメータによるプレビューは、Super Admin がアプリケーション層で draft の version_id を指定してクエリすることで実現。RLS は Super Admin に全レコードへのアクセスを許可しているため追加ポリシー不要。
- **Implications**: User 向け RLS ポリシーを version_id ベースに更新。`content_versions` テーブルで `status = 'active'` のバージョン ID をサブクエリで参照する。

### プレビュー実装: 既存ページの再利用方式

- **Context**: REQ-3.5 で「既存の受講生向けコンテンツ表示ページを `?version_id` パラメータ付きで再利用する」と定められている。
- **Sources Consulted**: `lms-fe/app/(authenticated)/contents/[tutorial]/[chapter]/[section]/page.tsx`
- **Findings**:
  - 現行ページは `searchParams` を受け取っていない
  - `searchParams` に `version_id` を追加し、指定時は RLS ではなく version_id でフィルタリング
  - Super Admin 判定はサーバーサイドで行い、非 Super Admin の version_id パラメータ使用を拒否
  - プレビュー用の専用ページは作成しない（REQ-3.5 の明示的な要件）
- **Implications**: 受講生向けコンテンツページに `version_id` パラメータのハンドリングを追加。最小限の変更で実現可能。

### draft 上書き戦略

- **Context**: REQ-2.1 で「既存 draft を新しい Push で上書き」と定められている。
- **Findings**:
  - 既存 draft バージョンレコードの `commit_hash`, `synced_at`, `changes_summary`, `changed_paths` を UPDATE
  - 既存 draft に紐づく contents レコードを全削除し、新しいコンテンツで再作成
  - DELETE + INSERT（UPSERT ではなく）のほうがシンプルで確実。draft のコンテンツは完全置換のため、差分計算は不要。
- **Implications**: 同期 API 内で draft 上書き時は `DELETE FROM contents WHERE version_id = {draft_id}` → 新規 INSERT のフローを採用。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン拡張 | 現行の Server Components + Server Actions + API Routes パターンを維持し、バージョン管理レイヤーを追加 | 学習コスト最小、既存コードとの一貫性、段階的に導入可能 | 同期 API の変更が大きい | 採用 |
| 専用マイクロサービス | バージョン管理を独立サービスとして分離 | 関心の分離が明確 | オーバーエンジニアリング、運用コスト増大 | 不採用: プロジェクト規模に不適 |

## Design Decisions

### Decision: contents テーブルの slug_path ユニーク制約の変更

- **Context**: draft と active で同一 slug_path のレコードが共存する必要がある
- **Alternatives Considered**:
  1. `UNIQUE (slug_path, version_id)` 複合ユニーク制約
  2. slug_path のユニーク制約を完全に削除し、アプリケーション層で管理
- **Selected Approach**: 複合ユニーク制約 `UNIQUE (slug_path, version_id)`
- **Rationale**: DB レベルでデータ整合性を保証しつつ、バージョンごとのコンテンツ共存を許可
- **Trade-offs**: UPSERT の onConflict 指定を変更する必要がある
- **Follow-up**: 既存インデックスの更新、マイグレーションの動作確認

### Decision: draft 上書き時の DELETE + INSERT 方式

- **Context**: 既存 draft を新しい Push で上書きする際の方式選択
- **Alternatives Considered**:
  1. UPSERT（slug_path + version_id でコンフリクト解決）
  2. DELETE + INSERT（draft 紐づきコンテンツを全削除後に再作成）
- **Selected Approach**: DELETE + INSERT
- **Rationale**: draft のコンテンツは完全置換であり、差分計算のオーバーヘッドが不要。slug_path が変更される可能性（ファイル名変更、削除）も考慮すると、全削除→再作成が最もシンプル。
- **Trade-offs**: 大量レコードの DELETE + INSERT はトランザクション内で実行する必要がある
- **Follow-up**: Supabase JavaScript クライアントでのトランザクション制御方法の確認（RPC 関数の利用を検討）

### Decision: 承認処理のアトミック性確保

- **Context**: 承認時に draft → active 昇格、旧 active → archived 変更、旧コンテンツ行削除を一貫して行う必要がある
- **Alternatives Considered**:
  1. Supabase JavaScript クライアントで逐次実行
  2. PostgreSQL 関数（RPC）でアトミックに実行
- **Selected Approach**: PostgreSQL 関数（RPC）`approve_content_version`
- **Rationale**: 複数テーブルの状態変更をトランザクション内で実行し、中間状態の発生を防止。SECURITY DEFINER により RLS をバイパスし、承認ロジックを DB 層に集約。
- **Trade-offs**: DB 側にビジネスロジックが移動する。ただし承認処理は明確なドメイン操作であり、適切な境界設計。
- **Follow-up**: 関数のテスト、エラーハンドリングの検証

### Decision: 同期 API のバージョン管理ロジックも RPC で実装

- **Context**: 同期 API の「draft バージョン作成/更新 → コンテンツ UPSERT」も複数ステップのアトミック処理が必要
- **Selected Approach**: PostgreSQL 関数（RPC）`sync_content_version`
- **Rationale**: draft の存在確認、上書き時の DELETE、新規コンテンツの INSERT、変更サマリーの計算をトランザクション内で一貫して行う。JavaScript クライアントの逐次実行では中間状態が発生するリスクがある。
- **Trade-offs**: RPC 関数の定義と保守が必要

## Risks & Mitigations

- **Risk 1**: contents テーブルのユニーク制約変更によるダウンタイム -- マイグレーション内でアトミックに DROP/CREATE し、ダウンタイムゼロで移行
- **Risk 2**: 既存受講生ページのクエリ変更による表示崩れ -- マイグレーションでダミー active バージョンを作成し、version_id の NOT NULL 制約を満たす
- **Risk 3**: RPC 関数のエラーハンドリング不備 -- 関数内で適切な RAISE EXCEPTION を定義し、アプリケーション層で PostgreSQL エラーコードを解釈

## References

- [Supabase RPC (Remote Procedure Call)](https://supabase.com/docs/reference/javascript/rpc) -- PostgreSQL 関数の呼び出し方法
- [PostgreSQL CREATE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html) -- 関数定義の構文
- [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS ポリシー設計
