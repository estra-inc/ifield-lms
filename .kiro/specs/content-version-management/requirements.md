# 要件定義書: コンテンツバージョン管理

## プロジェクト概要

教材リポジトリ（GitHub）への Push 単位でコンテンツのバージョンを管理し、管理画面での承認を経て公開する仕組みを構築する。現在の「Push → 即 active」フローを「Push → draft 作成 → プレビュー確認 → 承認 → active 昇格」に変更し、意図しないコンテンツ公開を防止する。

## 用語定義

| 用語 | 定義 |
|------|------|
| **バージョン** | 教材リポジトリへの 1 回の Push に対応するコンテンツのスナップショット。コミットハッシュで識別する |
| **draft** | 同期されたが未承認のバージョン。受講生には公開されない |
| **active** | 承認済みで現在公開中のバージョン。受講生が閲覧するコンテンツはこのバージョンのもの |
| **archived** | 過去に active だったバージョン。コンテンツ行（contents テーブルの body 等）は削除され、メタデータのみ残る |

---

## 要件一覧

### REQ-1: バージョン = Push 単位

**REQ-1.1**: 同期 API が呼び出されたとき、システムはペイロードに含まれるコミットハッシュを用いて新しいバージョンレコード（`content_versions` テーブル）を作成しなければならない。

**REQ-1.2**: 新しいバージョンのステータスは `draft` として作成されなければならない。

**REQ-1.3**: draft バージョンとして同期されたコンテンツは、`contents` テーブルに `version_id` を紐付けて保存されなければならない。

**REQ-1.4**: draft バージョンのコンテンツ同期中も、既存の active バージョンのコンテンツは受講生に対して継続的に公開されなければならない。

### REQ-2: draft は常に 1 つ（最新 Push で上書き）

**REQ-2.1**: 既存の draft バージョンが承認される前に新しい Push が発生した場合、システムは既存の draft バージョンを新しい Push の内容で上書きしなければならない。

**REQ-2.2**: 上書きされた中間 Push の履歴は Git リポジトリで追跡可能であるため、DB には中間バージョンのレコードを保持しない。

**REQ-2.3**: draft の上書き時、既存の draft に紐づくコンテンツ行は新しいコンテンツで置き換えられなければならない。

### REQ-3: プレビュー機能

**REQ-3.1**: 管理画面において、draft バージョンの変更ファイル一覧（追加・更新・削除）を表示しなければならない。

**REQ-3.2**: 変更ファイル一覧の各項目は、変更種別（追加 / 更新 / 削除）をバッジで視覚的に区別しなければならない。

**REQ-3.3**: 変更ファイル一覧から各コンテンツをクリックすると、受講生と同じ表示で Markdown レンダリングプレビューを閲覧できなければならない。

**REQ-3.4**: 全体プレビュー機能として、draft バージョンの全セクションを通しで閲覧できなければならない。

**REQ-3.5**: プレビューは既存の受講生向けコンテンツ表示ページを `?version_id={draft_version_id}` パラメータ付きで再利用する。専用プレビュー画面は設けない。これにより受講生と同一のレンダリングを構造的に保証する。Super Admin のみがプレビューパラメータを使用できなければならない。

### REQ-4: バージョンログ（軽量）

**REQ-4.1**: `content_versions` テーブルは以下のカラムを持たなければならない:
- `id` (UUID, PK)
- `commit_hash` (TEXT, NOT NULL) — Git コミットハッシュ
- `status` (TEXT, NOT NULL) — `draft` / `active` / `archived`
- `synced_at` (TIMESTAMPTZ) — 同期日時
- `changes_summary` (JSONB) — 変更サマリー（追加数・更新数・削除数）
- `changed_paths` (TEXT[]) — 変更されたコンテンツの slug_path 配列
- `approved_by` (UUID, FK → auth.users) — 承認者
- `approved_at` (TIMESTAMPTZ) — 承認日時

**REQ-4.2**: 各コンテンツの過去のバージョンの本文（body）は DB に保持しない。Git が Source of Truth であり、過去の内容は Git から取得可能である。

**REQ-4.3**: 管理画面のバージョン履歴一覧では、過去のバージョン（archived）のメタデータ（コミットハッシュ、同期日時、承認者、変更サマリー）を閲覧できなければならない。

### REQ-5: 承認フロー

**REQ-5.1**: 管理画面で承認操作を行うと、draft バージョンが active に昇格しなければならない。

**REQ-5.2**: 承認時、旧 active バージョンは archived に変更されなければならない。

**REQ-5.3**: archived に変更されたバージョンに紐づくコンテンツ行（`contents` テーブルの該当レコード）は削除し、DB を軽量に保たなければならない。

**REQ-5.4**: 承認操作時に `approved_by`（承認者の user_id）と `approved_at`（承認日時）が記録されなければならない。

**REQ-5.5**: 初回同期（active バージョンが存在しない状態）では、draft を即座に active に昇格させることができなければならない。

### REQ-6: 同期 API の変更

**REQ-6.1**: 同期 API (`POST /api/admin/sync-curriculums`) は、リクエストペイロードに `commit_hash` フィールドを受け取らなければならない。

**REQ-6.2**: GitHub Actions ワークフローは、Push 時のコミットハッシュ (`${{ github.sha }}`) をペイロードに含めなければならない。

**REQ-6.3**: ローカル同期スクリプト (`scripts/sync-contents-local.mjs`) は、Git コマンドから HEAD のコミットハッシュを取得してペイロードに含めなければならない。

**REQ-6.4**: 同期 API は、コンテンツを `contents` テーブルに UPSERT する際、draft バージョンの `version_id` を紐付けなければならない。

### REQ-7: 受講生ページへの影響

**REQ-7.1**: 受講生向けコンテンツ表示ページは、active バージョンに紐づくコンテンツのみを表示しなければならない。

**REQ-7.2**: draft バージョンのコンテンツは、受講生に対して一切表示されてはならない。

**REQ-7.3**: 既存の `status = 'active'` フィルタは、`version_id` ベースのフィルタに移行しなければならない。

### REQ-8: 管理画面 UI

**REQ-8.1**: 管理画面にバージョン管理セクションを追加し、以下の情報を表示しなければならない:
- 現在の active バージョン情報（コミットハッシュ、同期日時）
- 未承認の draft バージョン情報（存在する場合）
- バージョン履歴一覧

**REQ-8.2**: draft バージョンが存在する場合、「変更を確認」ボタンから差分ビューにアクセスできなければならない。

**REQ-8.3**: 差分ビューからプレビューを確認した上で「承認」ボタンを押下できなければならない。

**REQ-8.4**: 承認ボタンは確認ダイアログを表示し、誤操作を防止しなければならない。

### REQ-9: RLS ポリシー

**REQ-9.1**: `content_versions` テーブルに RLS を適用し、Super Admin のみが全レコードを参照できなければならない。

**REQ-9.2**: `contents` テーブルの既存 RLS ポリシーは、active バージョンに紐づくコンテンツのみを受講生に公開するよう更新しなければならない。

**REQ-9.3**: Manager ロールは引き続きコンテンツテーブルへのアクセス権限を持たない。

---

## 確定済み設計判断

以下の事項は要件レビューにおいて確定しました。

### 判断-1: 承認権限のスコープ → Super Admin のみ

承認権限は **Super Admin に限定**する。PRD の権限分離方針（Manager はコンテンツへの SELECT 権限なし）と一貫性を保つ。将来的に Manager への権限拡張が必要になった場合は、`content_versions` テーブルへの SELECT のみ許可する形で段階的に対応する。

### 判断-2: 差し戻しフロー → 不要

差し戻し（リジェクト）機能は **実装しない**。draft を承認するか、次の Push を待つかの2択とする。不要な draft は新しい Push で自動的に上書きされる。フィードバックは GitHub Issues / PR レビューで行う。

### 判断-3: 過去バージョンへのロールバック → 不要

ロールバック機能は **実装しない**。問題があれば GitHub 側で `git revert` → 再 Push → 新 draft → 承認で対応する。Git が Source of Truth であり、LMS 側でのロールバックは不要。archived バージョンのコンテンツ行は削除済みのため、DB を軽量に保つ設計を維持する。

### 判断-4: 初回導入時の移行戦略 → マイグレーションで自動対応

マイグレーション内で以下をアトミックに実行し、ダウンタイムゼロで移行する:
1. `content_versions` テーブルを作成
2. ダミーの `content_versions` レコード（`status='active'`, `commit_hash='initial'`）を INSERT
3. 既存 `contents` の全レコードに `version_id` を UPDATE

次回の正規 Push でダミーバージョンは自然に archived に移行する。

---

## 影響範囲

| 対象 | ファイル | 変更内容 |
|------|---------|---------|
| DB スキーマ | `supabase/migrations/` | `content_versions` テーブル新規、`contents` に `version_id` 追加 |
| 同期 API | `lms-fe/app/api/admin/sync-curriculums/route.ts` | `commit_hash` 受け取り、version 作成、draft として upsert |
| 承認 API | 新規 `lms-fe/app/api/admin/content-versions/[id]/approve/route.ts` | draft → active 昇格、旧 active 行削除 |
| プレビュー API | 新規 `lms-fe/app/api/admin/content-versions/[id]/preview/route.ts` | draft 版コンテンツ取得、差分情報取得 |
| GH Actions | `.github/workflows/sync-contents.yml` | `commit_hash` をペイロードに追加 |
| ローカルスクリプト | `scripts/sync-contents-local.mjs` | `commit_hash` 対応 |
| 受講生ページ | `lms-fe/app/(authenticated)/contents/` | active version のコンテンツのみ表示（`version_id` ベースフィルタ） |
| 管理画面 | `lms-fe/app/(authenticated)/admin/contents/` | バージョン管理 UI（差分ビュー、プレビュー、承認ボタン） |
| RLS | Supabase | `version_id` ベースのポリシー更新 |

---

_作成日: 2026-02-28_
