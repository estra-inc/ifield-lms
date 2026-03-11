# Research & Design Decisions

## Summary
- **Feature**: semantic-search
- **Discovery Scope**: Extension（既存コンテンツシステムへの検索機能追加）
- **Key Findings**:
  - pg_trgm はSupabaseのデフォルトロケール（en_US.UTF-8）で日本語テキストをサポートする。ただし2文字のクエリではトライグラム精度が低下するため、ILIKE フォールバックの検討が有用
  - shadcn/ui Command コンポーネント（cmdk ベース）は未導入だが、既存の shadcn/ui 環境に容易に追加可能
  - 既存の `SearchBarPlaceholder` コンポーネントが `app-header.tsx` 内に配置済みで、User ロール限定表示のロジックが実装済み

## Research Log

### pg_trgm と日本語テキストの互換性
- **Context**: 検索対象の教材コンテンツが日本語を含むため、pg_trgm のマルチバイト文字サポートを検証する必要があった
- **Sources Consulted**:
  - [PostgreSQL pg_trgm 公式ドキュメント](https://www.postgresql.org/docs/current/pgtrgm.html)
  - [PGroonga vs pg_trgm 比較](https://pgroonga.github.io/reference/pgroonga-versus-textsearch-and-pg-trgm.html)
  - [Alibaba Cloud: CJK 文字での pg_trgm 最適化](https://www.alibabacloud.com/blog/performance-optimization-of-fuzzy-queries-for-chinese-characters-using-postgresql-trgm_595634)
- **Findings**:
  - pg_trgm は PostgreSQL 9.3 以降で wchar（ワイド文字）をサポートし、日本語トライグラム生成が可能
  - 前提条件: データベースの Collate/Ctype が `C` でないこと。Supabase のデフォルト `en_US.UTF-8` で条件を満たす
  - 2文字以下のクエリではトライグラム（3文字単位）の精度が低下する。要件の最小文字数2文字は境界ケース
  - `similarity()` 関数のデフォルト閾値は 0.3。日本語混在コンテンツでは 0.1 程度への引き下げが実用的
- **Implications**: pg_trgm は本プロジェクトの日本語検索要件を満たす。短いクエリ（2文字）への対策として similarity + ILIKE の二段構え検索を設計に組み込む

### GIN インデックスのパフォーマンス特性
- **Context**: 検索APIの200msレスポンス目標を達成するためのインデックス戦略を検証
- **Sources Consulted**:
  - [pganalyze: GIN Index の長所と短所](https://pganalyze.com/blog/gin-index)
  - [PostgreSQL GIN Index 公式ドキュメント](https://www.postgresql.org/docs/current/gin.html)
- **Findings**:
  - GIN インデックスは読み取り性能で GiST を大幅に上回る（検索速度優先のユースケースに最適）
  - 書き込みオーバーヘッドがあるが、contents テーブルは Docs as Code 同期（低頻度バッチ更新）のため影響は無視できる
  - PostgreSQL 18 で GIN インデックスの並列ビルドがサポートされた
  - ワイルドカード検索のベンチマーク: インデックスあり 103ms vs なし 8000ms+（98.7%の高速化）
- **Implications**: GIN インデックスが最適な選択。書き込み頻度が低く読み取りが主な contents テーブルに合致する

### shadcn/ui Command コンポーネント
- **Context**: 検索モーダルUI の基盤となるコンポーネントライブラリを確認
- **Sources Consulted**:
  - [shadcn/ui Command ドキュメント](https://ui.shadcn.com/docs/components/radix/command)
  - [cmdk ライブラリ](https://cmdk.paco.me/)
- **Findings**:
  - cmdk ベースの Command コンポーネント: CommandDialog, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup 等のサブコンポーネントを提供
  - キーボードナビゲーション（上下矢印、Enter、Escape）がビルトイン
  - フォーカス管理とダイアログ統合が標準装備
  - 現在のプロジェクトに未導入（`components/ui/command.tsx` が存在しない）
  - `npx shadcn@latest add command` で追加可能
- **Implications**: shadcn/ui Command は要件（キーボードショートカット、フォーカス管理、空状態表示）を標準機能で網羅する。カスタム実装を最小限に抑えられる

### 既存コードベース統合ポイント
- **Context**: 新コンポーネントの統合先と既存パターンの確認
- **Findings**:
  - `SearchBarPlaceholder` コンポーネント: `components/app-shell/search-bar-placeholder.tsx` に disabled 状態で配置済み。User ロール限定ロジック実装済み
  - `AppHeader`: `components/app-shell/app-header.tsx` から `SearchBarPlaceholder` を参照。`userRole` prop で制御
  - `getActiveVersionId`: `lib/supabase/content-version.ts` に active バージョン解決ロジックが存在。検索APIでの再利用が可能
  - API Route パターン: `app/api/admin/sync-curriculums/route.ts` が既存のAPI実装パターンを提供（NextResponse.json、エラーハンドリング）
  - Supabase クライアント: Server用 (`lib/supabase/server.ts`) とBrowser用 (`lib/supabase/client.ts`) が分離済み
  - 型定義: `lib/types/database.ts` に contents テーブルの型が定義済み
  - Middleware: `graduation_date` による `/contents/*` パスのアクセス制御が実装済み（検索APIパスにも同様の制御を検討）
- **Implications**: 既存のユーティリティとパターンを最大限に再利用できる。新規実装は検索ロジックとUIコンポーネントに集中する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| API Route + RPC | Next.js API Route から Supabase RPC 関数を呼び出す | SQL レベルでの最適化が可能、複合スコアリングが容易 | RPC 関数の管理が追加される | 既存の sync-curriculums が RPC パターンを採用しており一貫性がある |
| API Route + クエリビルダー | Next.js API Route から Supabase クエリビルダーで検索 | TypeScript 型安全性が高い、RPC 不要 | similarity 関数の呼び出しがクエリビルダーで煩雑 | Supabase JS SDK で raw SQL 相当の操作が必要 |
| Server Action | Server Action で検索を実行 | API Route 不要、シンプル | キャッシュ制御やエラーハンドリングの柔軟性が低い | 検索は GET 操作のため API Route が適切 |

**選択**: API Route + Supabase RPC。理由は既存パターンとの一貫性、SQL レベルでの重み付けスコアリング最適化、および将来の検索エンジン差し替え容易性。

## Design Decisions

### Decision: 検索エンジンとして pg_trgm を採用
- **Context**: 教材コンテンツのあいまい検索機能が必要。外部API依存なし・無料運用が制約
- **Alternatives Considered**:
  1. OpenAI Embedding + pgvector -- 意味的検索が可能だがAPIコスト発生、外部依存
  2. PostgreSQL FTS (tsvector) -- 形態素解析が必要、日本語辞書の管理コスト
  3. PGroonga -- 日本語特化だがSupabaseでの利用が制限される可能性
- **Selected Approach**: pg_trgm（トライグラム）による similarity ベースのあいまい検索
- **Rationale**: Supabase 内蔵、無料、GIN インデックスで高速、日本語対応（UTF-8 ロケール前提）
- **Trade-offs**: 意味的検索は不可能だが、キーワードベースのあいまい検索で十分なユースケース
- **Follow-up**: 精度不足の場合は検索API層のみ差し替えて Embedding 検索に移行可能

### Decision: Supabase RPC 関数による検索実行
- **Context**: pg_trgm の similarity 関数と重み付けスコアリングを SQL レベルで実行する必要がある
- **Alternatives Considered**:
  1. Supabase クエリビルダーの `.rpc()` -- 選択
  2. Supabase クエリビルダーの `.select()` + `.filter()` -- similarity 関数の呼び出しが困難
  3. Raw SQL（supabase.rpc で代用）-- 型安全性の確保が困難
- **Selected Approach**: PostgreSQL 関数（`search_contents`）を作成し、Supabase `.rpc()` で呼び出す
- **Rationale**: 複合スコアリング（title x3 + body x1）をSQL関数内で完結させることで、ネットワーク往復を削減しパフォーマンスを最適化
- **Trade-offs**: マイグレーションで関数を管理する追加コストがあるが、既存の `sync_content_version` RPC と同じパターンで一貫性がある

### Decision: shadcn/ui Command コンポーネントの採用
- **Context**: Command Palette 風の検索モーダルUIが必要
- **Alternatives Considered**:
  1. shadcn/ui Command（cmdk ベース）-- 選択
  2. カスタム Dialog + Input -- キーボードナビゲーションの自前実装が必要
  3. headless-ui Combobox -- shadcn/ui エコシステムとの統合コストが高い
- **Selected Approach**: shadcn/ui Command コンポーネントを `npx shadcn@latest add command` で追加
- **Rationale**: キーボードナビゲーション、フォーカス管理、空状態表示がビルトイン。既存の shadcn/ui 環境に統合が容易
- **Trade-offs**: cmdk の内部フィルタリングを無効化しサーバーサイド検索結果を直接表示する必要がある

## Risks & Mitigations
- **Risk 1**: pg_trgm の日本語2文字クエリで精度が低下する可能性 -- **Mitigation**: similarity スコアが閾値未満でも最低1件を保証する設計 + ILIKE フォールバック検索
- **Risk 2**: GIN インデックスが大量コンテンツ更新時に書き込み性能を低下させる -- **Mitigation**: コンテンツ更新は GitHub Actions 同期（低頻度バッチ）のため実用上問題なし
- **Risk 3**: cmdk のクライアントサイドフィルタリングとサーバーサイド検索の競合 -- **Mitigation**: `shouldFilter={false}` で cmdk のフィルタリングを無効化

## References
- [PostgreSQL pg_trgm 公式ドキュメント](https://www.postgresql.org/docs/current/pgtrgm.html) -- similarity 関数、GIN インデックス、閾値設定の仕様
- [pganalyze: GIN Index 解説](https://pganalyze.com/blog/gin-index) -- GIN vs GiST のパフォーマンス比較
- [shadcn/ui Command ドキュメント](https://ui.shadcn.com/docs/components/radix/command) -- コンポーネント API とサブコンポーネント構成
- [Supabase Extensions ドキュメント](https://supabase.com/docs/guides/database/extensions) -- pg_trgm 拡張の有効化手順
