# 調査・設計判断記録: daily-reports-goals

## サマリー

- **機能名**: `daily-reports-goals`
- **ディスカバリー範囲**: 新機能（3テーブル新設）+ 既存システム拡張（ナビゲーション、型定義、App Shell統合）
- **主要な知見**:
  1. Supabase RLS では `auth.uid()` 参照カラムにインデックスを追加することで 100 倍以上のパフォーマンス改善が見込める
  2. 月次・週次目標の UPSERT は `onConflict` で UNIQUE 制約カラムを指定する既存 supabase-js パターンで対応可能
  3. 既存コードベースは `ActionResult` 型 + `useActionState` パターンを統一的に採用しており、本機能もこれに準拠する

## 調査ログ

### Supabase RLS ポリシー設計

- **背景**: 3つの新テーブル（daily_reports, monthly_goals, weekly_goals）に対し、ロール別アクセス制御を RLS で実装する必要がある
- **参照元**: [Supabase RLS ドキュメント](https://supabase.com/docs/guides/database/postgres/row-level-security)、[RLS パフォーマンスガイド](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- **知見**:
  - RLS ポリシーで使用するカラム（`user_id`）にインデックスを追加することが必須
  - `auth.uid()` を `(select auth.uid())` でラップすると、PostgreSQL が initPlan としてキャッシュしステートメント単位で再利用する（行ごとの関数呼び出しを回避）
  - Manager/Super Admin のポリシーでは `profiles.role` の結合が必要。パフォーマンス考慮から、`auth.jwt() ->> 'role'` を使うか、サブクエリで profiles を参照するか選択が必要
  - `user_metadata` はユーザー自身が変更可能なため RLS ポリシーでの使用は不可。`app_metadata` または `profiles` テーブルを参照すべき
- **設計への影響**: profiles テーブルの role を参照するサブクエリを使用し、`(select auth.uid())` ラッパーを全ポリシーで適用する

### Supabase UPSERT パターン

- **背景**: 月次目標・週次目標は同一期間に対して「存在すれば更新、なければ挿入」の UPSERT 動作が要件
- **参照元**: [supabase-js upsert ドキュメント](https://supabase.com/docs/reference/javascript/upsert)
- **知見**:
  - `supabase.from('table').upsert(data, { onConflict: 'column' })` で UNIQUE 制約カラムを指定
  - monthly_goals: `(user_id, year_month)` に UNIQUE 制約 → `onConflict: 'user_id,year_month'`
  - weekly_goals: `(user_id, start_date)` に UNIQUE 制約 → `onConflict: 'user_id,start_date'`
  - UPSERT 時は主キーを含める必要がある（id カラムを含めるか、UNIQUE 制約のみで対応するかの選択）
- **設計への影響**: 各目標テーブルに複合 UNIQUE 制約を設定し、Server Action 内で `upsert` メソッドを使用する

### 既存コードベースのパターン分析

- **背景**: 本機能が既存アーキテクチャにどう統合されるかを把握する
- **参照元**: `lms-fe/` 以下のソースコード解析（Grep/Read）
- **知見**:
  - **Server Actions パターン**: `ActionResult` 型（`{ success: boolean; message: string } | null`）を使用し、Zod でバリデーション後に Supabase クライアントを呼び出す。`revalidatePath` でキャッシュを無効化
  - **ページ構成パターン**: Server Component がデータフェッチ、`_components/` 配下に Client Component を配置。ページヘッダーは `<h1>` + サブテキスト + アクションボタンの構成
  - **型定義パターン**: `lib/types/` にドメイン型、`lib/validations/` に Zod スキーマ。DB の snake_case から camelCase への変換はページコンポーネントで行う
  - **ナビゲーション**: `config/navigation.ts` の `NAVIGATION_MAP` にロール別メニューを定義。Lucide アイコンを使用
  - **レイアウト**: `(authenticated)` Route Group で認証レイアウトを共有。`AppShellLayout` が `SidebarProvider` + `AppSidebar` + `AppHeader` を提供
- **設計への影響**: 全パターンをそのまま踏襲する。新規の独自パターンは導入しない

### Next.js Server Actions + useActionState フォームパターン

- **背景**: 日報入力・目標設定のフォーム送信パターンを確認
- **参照元**: [Next.js Forms ガイド](https://nextjs.org/docs/app/guides/forms)、既存コードベースの `actions.ts`
- **知見**:
  - `useActionState` でフォーム状態管理。`pending` フラグで送信中 UI を制御
  - Server Action は `(prevState: ActionResult, formData: FormData) => Promise<ActionResult>` シグネチャ
  - クライアントサイドバリデーションは Zod スキーマの `.safeParse()` で実行し、サーバーサイドでも同じスキーマで再検証
- **設計への影響**: 既存の `ActionResult` + `useActionState` パターンを踏襲

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク/制約 | 備考 |
|-----------|------|------|-----------|------|
| 既存パターン踏襲（Server Components + Server Actions） | 現行の App Router パターンをそのまま適用 | 学習コスト 0、コードベースの一貫性維持 | 大規模データ時のパフォーマンス未検証 | 採用 |
| RSC + React Query ハイブリッド | Server Components でデータフェッチ + クライアント側でキャッシュ管理 | リアルタイム更新が容易 | ライブラリ追加、既存パターンとの不整合 | 不採用（現時点では不要） |

## 設計判断

### 判断: ルーティング構成

- **背景**: User 向けページ（日報、目標）と Manager/Admin 向けページ（フィード、テーブル）のルート配置
- **検討した選択肢**:
  1. ロール別 Route Group 分離（`(user)/reports`、`(manager)/reports`）
  2. 共通 `(authenticated)` 配下にフラット配置し、ページ内でロール判定
- **選定**: 選択肢 2（フラット配置）
- **理由**: 既存コードベースが `(authenticated)` 配下にフラット配置するパターンを採用済み（`admin/users`）。ロール別アクセス制御は Middleware + ページ内チェック + RLS の三重防御で実現
- **トレードオフ**: ルートの責務がやや曖昧になるが、既存パターンとの一貫性を優先
- **フォローアップ**: Manager/Admin 向けページが増加した場合、Route Group 分離を再検討

### 判断: 日報の日付グループ化

- **背景**: 日報一覧で同一日のエントリをグループ化して表示する要件
- **検討した選択肢**:
  1. PostgreSQL の GROUP BY + JSON_AGG でグループ化済みデータを返す
  2. フラットなクエリ結果をフロントエンド側でグループ化
- **選定**: 選択肢 2（フロントエンド側グループ化）
- **理由**: Supabase クライアント SDK はカスタム SQL を直接実行しにくく、RLS が適用される `.from().select()` パターンとの親和性が高い。データ量は 1 ユーザーの日報で月 30 件程度であり、フロントエンド処理で十分
- **トレードオフ**: 大量データ時のパフォーマンス懸念があるが、1 ユーザーあたりの日報数は限定的
- **フォローアップ**: ページネーション導入時に再検討

### 判断: Manager の「いいね」実装方式

- **背景**: Manager が日報に「いいね」を付与する機能。トグル動作が要件
- **検討した選択肢**:
  1. `daily_reports.liked_by_manager` boolean カラム（単一 Manager 想定）
  2. 中間テーブル `report_likes(report_id, manager_id)` で多対多管理
- **選定**: 選択肢 1（boolean カラム）
- **理由**: 要件上「いいね」は Manager ロール全体で 1 つの状態（済/未済）であり、「誰がいいねしたか」の追跡は不要。スキーマがシンプルで実装コストが低い
- **トレードオフ**: 複数 Manager が独立していいねする要件が発生した場合、スキーマ変更が必要
- **フォローアップ**: 複数 Manager 対応が必要になった場合は中間テーブルへの移行を検討

### 判断: 進捗集計の実装方式

- **背景**: 月次・週次の合計学習時間と達成率を表示する要件
- **検討した選択肢**:
  1. PostgreSQL ビュー / RPC でサーバーサイド集計
  2. Supabase クライアント SDK のクエリで日報を取得し、フロントエンドで SUM 計算
- **選定**: 選択肢 2（フロントエンド集計）
- **理由**: Supabase SDK の `.select()` で期間フィルタ付きクエリを実行し、結果を Server Component 内で集計する。RLS が自動適用されるため、セキュリティ面でも安全。データ量は月 30 件程度
- **トレードオフ**: サーバーサイド集計に比べてネットワーク転送量がやや多いが、実用上問題ない規模
- **フォローアップ**: データ量が増大した場合、PostgreSQL RPC への移行を検討

## リスクと緩和策

- **RLS ポリシーの設定漏れ**: 新テーブル作成時に RLS が無効な状態が発生するリスク。緩和策: マイグレーションスクリプトで `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` と `CREATE POLICY` をセットで記述
- **UPSERT の競合**: 月次・週次目標で UNIQUE 制約違反が発生する可能性。緩和策: `onConflict` を正しく設定し、エラーハンドリングを実装
- **Manager ロール判定の一貫性**: RLS ポリシーとフロントエンドのロール判定が不一致になるリスク。緩和策: `profiles.role` を単一の信頼できるソースとし、RLS とフロントエンドの両方で参照

## 参考文献

- [Supabase RLS ドキュメント](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS ポリシーの設計パターン
- [Supabase RLS パフォーマンスガイド](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- インデックス設計、`(select auth.uid())` ラッパー
- [supabase-js upsert ドキュメント](https://supabase.com/docs/reference/javascript/upsert) -- `onConflict` パラメータの使用法
- [Next.js Forms ガイド](https://nextjs.org/docs/app/guides/forms) -- Server Actions + useActionState パターン
