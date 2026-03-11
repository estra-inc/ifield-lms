# Research & Design Decisions

---
**Purpose**: ダッシュボード機能の設計判断に必要な調査結果と技術的意思決定を記録する。
---

## Summary
- **Feature**: dashboard
- **Discovery Scope**: Extension（既存システムへの拡張）
- **Key Findings**:
  - 教材完了率の分母定義は `content_type = 'section'` かつ active バージョンのレコード数とする（TBD として A/B案を提示）
  - 複数テーブルからのデータ取得は個別クエリ vs RPC の選択が必要（TBD）
  - レーダーチャートは既存の `@nivo/radar` を使用可能（新規依存不要）
  - アカウント無効化状態は Supabase Auth の `banned_until` フィールドで判定（既存パターン踏襲）

## Research Log

### 教材完了率の計算方法
- **Context**: Requirement 3 で「各チュートリアルの完了率を `content_progress` の完了セクション数 / 該当チュートリアルの全セクション数で算出する」と定義されているが、具体的な分母の定義を確認する必要がある。
- **Sources Consulted**: `database.ts` の `contents` テーブル型定義、既存の `TutorialDetailPage` での `content_type` フィルタリングパターン
- **Findings**:
  - `contents` テーブルの `content_type` は `"genre" | "tutorial" | "chapter" | "section"` の4種
  - 既存の TutorialDetailPage では `content_type = 'section'` でセクション一覧を取得し、`content_progress` と突合している
  - `content_progress` は `content_id` を持ち、section レベルのレコードに対する完了記録
  - 分母 = 該当チュートリアルの `content_type = 'section'` かつ `status = 'active'` かつ `version_id = activeVersionId` のレコード数
  - 分子 = 上記セクション ID のうち `content_progress` にレコードが存在するもの
- **Implications**: 分母にはアクティブバージョンの section のみを含む。archived されたセクションは除外。

### データ取得戦略（個別クエリ vs RPC）
- **Context**: ダッシュボードはログイン直後に表示されるため、6-7種類のデータを効率的に取得する必要がある。
- **Sources Consulted**: 既存の `UserDetailPage` のデータフェッチパターン（個別クエリ方式）、Supabase RPC ドキュメント
- **Findings**:
  - 既存パターン: `UserDetailPage`（admin/users/[id]）では個別クエリを逐次実行しており、RPC は `finalize_grading` のみ使用
  - 個別クエリ方式: 各セクション（目標達成率、教材完了率、日報、コーチング、模擬案件、スキルレポート）ごとに独立したクエリを実行。Server Component 内で `Promise.all` による並列化が可能
  - RPC 方式: PostgreSQL 関数で全データを1回のラウンドトリップで取得。型定義とメンテナンスコストが増加
  - Next.js Server Components ではサーバー-DB 間のレイテンシが小さいため、個別クエリの並列実行で十分な性能が期待できる
- **Implications**: TBD として両方式を design.md に記載し、ユーザー判断を仰ぐ

### アカウント無効化（deactivated）の判定方法
- **Context**: Requirement 7 でアカウント無効化時のバナー表示が要求されている。
- **Sources Consulted**: 既存の `UserDetailPage` での ban 状態判定パターン、`middleware.ts`
- **Findings**:
  - 既存パターン: `adminClient.auth.admin.getUserById(id)` で `banned_until` を取得し、現在日時と比較
  - 問題: この方法は Admin クライアント（Service Role Key）が必要で、Server Component から通常の Supabase クライアントでは取得不可
  - ダッシュボードページは自身の ban 状態を確認する必要があるが、RLS 経由のクライアントでは `auth.users` テーブルにアクセスできない
  - 代替案: Middleware で ban 状態を検出してヘッダーや cookie に埋め込む、または profiles テーブルに `is_active` カラムを追加する
- **Implications**: TBD としてユーザー判断を仰ぐ

### レーダーチャート（スキルレポート）の技術選定
- **Context**: ダッシュボードにスキルレポートのレーダーチャートを表示する。
- **Sources Consulted**: `package.json` の依存関係
- **Findings**:
  - プロジェクトには `@nivo/radar` (v0.99.0) と `@nivo/core` (v0.99.0) が既に導入済み
  - ユーザーの追加コンテキストでは「Recharts RadarChart」と記載があるが、既存依存は Nivo
  - Nivo は SSR 非対応（Client Component 必須）だが、レーダーチャートのインタラクティブ性を考慮すると妥当
- **Implications**: 既存の `@nivo/radar` を使用する（新規依存の追加不要）

### Next.js Server Components でのキャッシュ戦略
- **Context**: ダッシュボードはログイン直後に表示されるため、パフォーマンスが重要。
- **Sources Consulted**: Next.js 16 App Router ドキュメント
- **Findings**:
  - Next.js App Router の Server Components はデフォルトで動的レンダリング（cookie/header を使用するため）
  - Supabase クライアントが cookie に依存するため、ダッシュボードページは自動的に動的レンダリングとなる
  - `revalidate` は静的生成ページ向けであり、認証が必要なダッシュボードには不適用
  - パフォーマンス最適化は「クエリの並列化」と「必要最小限のデータ取得（select カラム指定）」が主な手段
- **Implications**: キャッシュ戦略は不要。Server Components でのクエリ並列化に注力する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Server Component + 個別データフェッチ | 既存パターン踏襲。page.tsx でデータ取得し、子コンポーネントに props で渡す | シンプル、既存パターンと一貫性あり、型安全 | page.tsx が肥大化する可能性 | 推奨 |
| Server Component + データフェッチ関数分離 | データ取得ロジックを `lib/` 以下に分離 | page.tsx の可読性向上、再利用性 | ファイル数増加 | page.tsx が複雑になる場合の拡張オプション |

## Design Decisions

### Decision: Server Component ベースのアーキテクチャ
- **Context**: ダッシュボードは閲覧専用ページで、認証ユーザーのデータを表示する
- **Alternatives Considered**:
  1. 全体を Server Component で構成し、Client Component は最小限
  2. Client Component + useEffect でクライアントサイドフェッチ
- **Selected Approach**: Option 1 -- Server Component ベース
- **Rationale**: Steering の方針（Server Components 優先）に合致。閲覧専用のため Client Component の必要性が低い。レーダーチャートのみ Client Component とする。
- **Trade-offs**: ページ遷移ごとにサーバーサイドで全データ再取得が必要だが、閲覧専用ページでは許容範囲。
- **Follow-up**: データ量が増えた場合の Streaming / Suspense 導入を検討。

### Decision: レーダーチャートに @nivo/radar を使用
- **Context**: スキルレポートセクションにレーダーチャートを表示する必要がある
- **Alternatives Considered**:
  1. 既存の `@nivo/radar` を使用
  2. Recharts を新規導入
- **Selected Approach**: `@nivo/radar` を使用
- **Rationale**: 既にプロジェクトに導入済みで、新規依存の追加が不要。
- **Trade-offs**: Nivo は Client Component 必須だが、チャート表示部分のみの Client Component 化で影響は限定的。

## Risks & Mitigations
- **多数のクエリによるレイテンシ**: `Promise.all` による並列化で緩和。TBD として RPC 案も検討。
- **アカウント無効化判定の実装難易度**: Server Component から Admin クライアントを使用する必要がある可能性。TBD として別案を提示。
- **教材完了率の分母定義**: バージョン更新時にセクション数が変動する可能性。アクティブバージョンを基準とすることで対応。

## References
- Next.js App Router Server Components: 公式ドキュメント
- Supabase RLS: プロジェクトの既存 RLS ポリシー
- @nivo/radar: 既存依存（v0.99.0）
