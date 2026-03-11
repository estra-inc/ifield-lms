# Research & Design Decisions

## Summary
- **Feature**: mock-projects
- **Discovery Scope**: Complex Integration（新規テーブル4つ + カンバンD&D + 排他制御 + 既存同期API統合）
- **Key Findings**:
  - `@hello-pangea/dnd` は React 19 との互換性が未解決（peer dependency 制約）。`@dnd-kit/react` は 0.3.x で React 19 対応済みだが、まだ安定版 1.0 未到達。TBD として選定をユーザーに委ねる
  - 排他制御（1案件制限）は DB レベルの部分ユニークインデックスまたは PostgreSQL 関数 + Server Action の二重防御で実装可能。トランザクション設計が重要
  - Next.js App Router の `searchParams` prop（Promise）をタブ管理に使用するパターンは既存コードベースで確立済み

## Research Log

### D&D ライブラリ選定調査

- **Context**: カンバンボードのドラッグ&ドロップ実装に使用するライブラリの選定
- **Sources Consulted**:
  - [Top 5 Drag-and-Drop Libraries for React in 2026 | Puck](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)
  - [@dnd-kit/react - npm](https://www.npmjs.com/package/@dnd-kit/react)
  - [@hello-pangea/dnd - npm](https://www.npmjs.com/package/@hello-pangea/dnd)
  - [React 19 compatibility discussion - hello-pangea/dnd](https://github.com/hello-pangea/dnd/discussions/810)
  - [Support React 19 & Next.js 15 - dnd-kit Issue #1511](https://github.com/clauderic/dnd-kit/issues/1511)
- **Findings**:
  - `@hello-pangea/dnd` v17.0.0: React 18 の peer dependency 制約あり。React 19 環境ではインストール時に peer dependency conflict が発生。公式の React 19 対応は安定版としてリリースされていない
  - `@dnd-kit/react` v0.3.2: React 19 + Next.js 16 環境での動作実績あり（複数のプロジェクトで使用報告）。ただし semver 的に 0.x であり安定版（1.0）未到達
  - `@dnd-kit/react` は Pointer Events ベースで custom collision detection をサポートし、カンバンボードのカラム間移動に適している
  - `@hello-pangea/dnd` はリストベースの D&D に特化しており、カンバンのような複数リスト間移動のユースケースに最適化されている
- **Implications**: 両ライブラリにトレードオフが存在するため、設計書では TBD として A/B オプションを提示する

### 排他制御の実装パターン調査

- **Context**: 「1人につき進行中の案件は1つまで」制約の堅牢な実装方法
- **Sources Consulted**:
  - [Managing Indexes in PostgreSQL | Supabase Docs](https://supabase.com/docs/guides/database/postgres/indexes)
  - [Supabase partial unique index discussion](https://github.com/orgs/supabase/discussions/12565)
- **Findings**:
  - **Option A: PostgreSQL 関数 + Advisory Lock**: `check_and_start_project` RPC 関数内で `SELECT ... FOR UPDATE` を使用し、着手可能かチェック後に INSERT する。強い整合性保証
  - **Option B: 部分ユニークインデックス**: `project_assignments` に対して `CREATE UNIQUE INDEX ... WHERE ...` で制約を設け、DB レベルで重複を防止。ただし Supabase クライアントの UPSERT との相性に制約あり
  - いずれの方法でも Server Action 側でのバリデーションとの二重防御が必要
- **Implications**: Option A（PostgreSQL 関数）の方が、ターム移行トランザクションとの統合が容易。設計書では RPC 関数を基本方針とする

### Next.js App Router タブ管理パターン

- **Context**: 詳細ページの4タブを URL searchParams で管理する方法
- **Sources Consulted**:
  - [App Router: Adding Search and Pagination | Next.js](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination)
  - [Functions: useSearchParams | Next.js](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
  - 既存コードベース: `contents/[tutorial]/[chapter]/[section]/page.tsx` の searchParams 使用パターン
- **Findings**:
  - Next.js 16 では `searchParams` は Page の props として `Promise<{...}>` で渡される（await 必要）
  - Server Component でデータフェッチ、Client Component でタブ切替 UI を担当する分離パターンが確立済み
  - Layout では searchParams を受け取れないため、Page レベルでの処理が必要
  - 既存コードベースでは `?genre=` パラメータで同パターンを使用中
- **Implications**: 既存パターンに従い、`?tab=requirements` 形式で管理。タブ切替は `useSearchParams` + `router.replace` の Client Component で実装

### 既存同期 API の拡張調査

- **Context**: `/api/admin/sync-curriculums` への mock_projects データ統合
- **Sources Consulted**:
  - 既存コードベース: `app/api/admin/sync-curriculums/route.ts`
- **Findings**:
  - 現在の同期 API は `contents` と `quizzes` の2種類を処理。`mock_projects` を第3のデータ型として追加可能
  - RPC パターン（`sync_content_version`, `sync_quiz_data`）が確立済み。同様に `sync_mock_project_data` RPC を追加する設計が整合的
  - バリデーション・エラーハンドリングのパターンも踏襲可能
- **Implications**: 同期 API のペイロードに `mock_projects` フィールドを追加し、既存パターンを踏襲して RPC 関数を新設

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Server Components + Server Actions | Next.js App Router の標準パターン。Server Component でデータフェッチ、Server Action で mutation | 既存コードベースとの一貫性、型安全性 | カンバンボードの楽観的更新が複雑になる可能性 | 既存パターンに合致 |
| Client-heavy SPA | Client Component 中心にデータフェッチも mutation も Supabase クライアントで直接処理 | リアルタイム性が高い | RLS に依存しすぎる、既存パターンと不整合 | 不採用 |

## Design Decisions

### Decision: Server Actions ベースの mutation 処理

- **Context**: 着手・提出・タスク操作の mutation をどの層で処理するか
- **Alternatives Considered**:
  1. Server Actions（`"use server"`）で処理
  2. API Routes で RESTful API を構築
  3. Client Component から Supabase クライアント直接呼び出し
- **Selected Approach**: Server Actions
- **Rationale**: 既存コードベース（`markAsRead`, `updateDefaultGenre`）が Server Actions パターンを採用しており、一貫性を維持。型安全性も高い
- **Trade-offs**: カンバンの楽観的更新では Client Component 側の状態管理が必要になるが、Server Action 呼び出しとの組み合わせで対応可能
- **Follow-up**: カンバンボードの楽観的更新の具体的な実装パターンは実装フェーズで検証

### Decision: RPC 関数による排他制御

- **Context**: 着手操作とターム移行を同一トランザクションで処理する必要がある
- **Selected Approach**: PostgreSQL 関数（`start_project`）を Supabase RPC として呼び出す
- **Rationale**: 排他制御チェック + assignment INSERT + ターム更新を単一のトランザクションで実行可能。RPC パターンは同期 API で確立済み
- **Trade-offs**: PostgreSQL 関数の保守コストが追加されるが、データ整合性の保証が優先

### Decision: タブ管理を URL searchParams で実装

- **Context**: 詳細ページの4タブの状態管理方法
- **Selected Approach**: `?tab=requirements|tasks|submission|history` の URL パラメータ
- **Rationale**: ブックマーク・共有可能、Server Component でのデータフェッチに直接利用可能、既存パターンと整合
- **Trade-offs**: タブ切替のたびにサーバーサイドレンダリングが発生するが、Next.js のキャッシュ機構で軽減可能

## Risks & Mitigations
- D&D ライブラリの React 19 互換性リスク -- TBD として選定をユーザーに委ね、PoC で検証
- カンバンボードの楽観的更新とサーバー状態の同期 -- `useOptimistic` または `useTransition` で UI の応答性を確保
- 排他制御の race condition -- PostgreSQL 関数内で `SELECT ... FOR UPDATE` を使用し行ロックで防止
- 同期 API の後方互換性 -- `mock_projects` フィールドをオプショナルとし、既存の contents/quizzes 同期に影響を与えない

## References
- [dnd-kit Documentation](https://dndkit.com/) -- D&D ライブラリの公式ドキュメント
- [hello-pangea/dnd Storybook](https://dnd.hellopangea.com/) -- hello-pangea/dnd のデモ・ドキュメント
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS ポリシー設計の参考
- [Next.js App Router searchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) -- タブ管理パターン
- [Managing Indexes in PostgreSQL | Supabase Docs](https://supabase.com/docs/guides/database/postgres/indexes) -- 部分ユニークインデックスの参考
