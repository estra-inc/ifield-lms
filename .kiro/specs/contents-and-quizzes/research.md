# リサーチ & 設計判断記録: 教材・演習（Contents）

---
**目的**: ディスカバリーフェーズにおける調査結果と、技術設計に影響するアーキテクチャ判断の根拠を記録する。
---

## サマリー
- **機能名**: `contents-and-quizzes`
- **ディスカバリー範囲**: 新機能（New Feature） -- フル・ディスカバリー実施
- **主要な発見事項**:
  1. `react-markdown` + `remark-gfm` は React 19 / Server Component 対応済み。GFM 拡張（テーブル、取り消し線、タスクリスト）をネイティブサポート
  2. `rehype-pretty-code` (v0.14.1) は Shiki ^1.0.0 ベースで、サーバーサイドで完結するシンタックスハイライトを提供。`github-dark` テーマ対応
  3. `graduation_date` カラムは `20260224111315_user_management_schema_update.sql` で DROP 済み。本機能で再追加が必要（app-shell spec の `AppShellUser.graduationDate` との整合）
  4. 既存の `ActionResult` 型（`{ success: boolean; message: string } | null`）と Server Action パターンを踏襲
  5. Supabase RLS は「ポリシー未作成 = デフォルト拒否」の原則を利用し、Manager ロールの SELECT 権限を排除可能

## リサーチログ

### Markdown レンダリングライブラリの選定（確定）

- **背景**: 要件 Q2 により、Markdown 原文を `body` カラムに保存し、Server Component で表示時にサーバーサイド変換する方針が確定。最適なライブラリを調査した
- **参照ソース**:
  - [react-markdown GitHub](https://github.com/remarkjs/react-markdown) -- unified パイプラインのラッパー。React 19 対応
  - [react-markdown npm](https://www.npmjs.com/package/react-markdown) -- v10 系。Node.js 16+ 対応
  - [remark-gfm npm](https://www.npmjs.com/package/remark-gfm) -- GFM 拡張プラグイン
  - [Next.js MDX Guide](https://nextjs.org/docs/app/guides/mdx) -- @next/mdx はファイルベース MDX 向け。DB からの動的コンテンツには不向き
- **調査結果**:
  - `react-markdown` v10: Server Component 内で直接使用可能。React 19 対応。ESM only（`next.config.ts` で対応可）
  - `remark-gfm`: テーブル、取り消し線、タスクリスト、オートリンクを追加
  - `@next/mdx`: ファイルベース MDX 向け。DB から動的取得するコンテンツには不適
  - `next-mdx-remote`: メンテナンス状況に懸念。過剰な機能
- **確定**: `react-markdown` + `remark-gfm` を採用。Server Component との親和性が高く、設定が簡潔

### シンタックスハイライトの選定（確定）

- **背景**: 要件 2.8 により、コードブロックにシンタックスハイライトが必要
- **参照ソース**:
  - [rehype-pretty-code 公式](https://rehype-pretty.pages.dev/) -- Shiki ベース
  - [rehype-pretty-code npm](https://www.npmjs.com/package/rehype-pretty-code) -- v0.14.1, Shiki ^1.0.0 対応
  - [@shikijs/rehype](https://shiki.matsu.io/packages/rehype) -- Shiki 公式の rehype 統合
- **調査結果**:
  - `rehype-pretty-code` (v0.14.1): Shiki ベース。VS Code テーマエコシステム。サーバーサイドで完結。行ハイライト・単語ハイライト対応。Unstyled（data 属性ベースのカスタムスタイリング）
  - `@shikijs/rehype`: Shiki 公式の rehype 統合。Transformer ベースの拡張。`rehype-pretty-code` よりシンプルだがカスタマイズ性が劣る
  - `rehype-highlight` (highlight.js): 軽量だが VS Code テーマ非対応。`github-dark` テーマの再現度が低い
- **確定**: `rehype-pretty-code` を採用。`github-dark` テーマでデザインリファレンスのコードブロックスタイル（bg=#1E293B）と整合

### ToC スクロール追従の実装方式

- **背景**: 要件 2.6, 2.7 により、サイドバー目次にスクロール追従アクティブハイライトが必要
- **参照ソース**:
  - [Intersection Observer API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- **調査結果**:
  - Intersection Observer API を使用した自前実装が最も柔軟かつ軽量
  - `rootMargin: '0px 0px -70% 0px'` で画面上部 30% での検出が推奨
  - Client Component として分離し、Server Component で生成した見出しリストを props で渡すパターンが App Router と整合
  - 外部ライブラリ不要。Intersection Observer の直接利用で十分
- **設計への影響**: ToC コンポーネントを Client Component として実装。見出し抽出はサーバーサイドで行い、ToC データとして渡す

### Supabase RLS によるロール別アクセス制御

- **背景**: 要件 5.1-5.3 により、`contents` テーブルにロール別の RLS ポリシーが必要
- **参照ソース**:
  - [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
  - [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- **調査結果**:
  - RLS 有効化後、ポリシーが存在しないロール/操作はデフォルトで拒否される
  - `profiles` テーブルの `role` カラムを `auth.uid()` で参照し、`user` と `super_admin` のみ許可するポリシーを作成
  - Manager ロールには明示的にポリシーを作成しないことで SELECT を拒否
  - `content_progress` テーブルは `user_id = auth.uid()` の条件で SELECT/INSERT のみ許可
- **設計への影響**: RLS ポリシー設計を Data Models セクションに反映

### graduation_date カラムの状態

- **背景**: requirements.md 2.5 および 5.4 で `graduation_date` ベースの受講期間チェックが要求されている
- **調査結果**:
  - `20260224111315_user_management_schema_update.sql` で `graduation_date` カラムが `profiles` テーブルから DROP されている
  - しかし PRD（`docs/prd.md`）および steering（`product.md`, `tech.md`, `structure.md`）では `graduation_date` ベースのアクセス制御が記載されている
  - app-shell spec の `AppShellUser` インターフェースにも `graduationDate: string | null` が定義されている
  - 現在の `database.ts` 型定義および `AppShellUser` 実装（`lib/types/app-shell.ts`）には `graduation_date` / `graduationDate` は含まれていない
- **設計への影響**: 本機能の DB マイグレーションで `graduation_date` カラムを `profiles` テーブルに再追加する。app-shell spec の HardStopBanner 機能とも整合する

### 既存コードベースパターンの分析

- **Server Action パターン**: `reports/actions.ts` を確認。`ActionResult` 型（`{ success: boolean; message: string } | null`）、`createClient()` による認証チェック、`revalidatePath` によるキャッシュ無効化のパターンが確立されている
- **Admin Client パターン**: `lib/supabase/admin.ts` の `createAdminClient()` で service_role キーによる RLS バイパスが可能。同期 API で使用する
- **App Shell**: `(authenticated)/layout.tsx` で `AppShellLayout` を使用。`profiles` テーブルから `full_name, role, avatar_url, current_term` を取得している
- **Middleware**: `middleware.ts` で認証チェック + `profiles.full_name` 取得のパターンが確立。ここに `graduation_date` チェックを追加する
- **型定義**: `database.ts` で手動定義（将来的に自動生成へ移行予定）。contents / content_progress テーブルの型を追加する

### URL スキーマとコンテンツ階層

- **背景**: requirements.md 1.5 では `/contents/{genre}/{tutorial}/{chapter}/{section}` だが、デザイン確定仕様で genre は URL から除外
- **確定仕様**: `/contents/{tutorial}/{chapter}/{section}` （genre なし）
- **設計への影響**: DB には `genre` カラムを保持（同期 API とフィルタリングに必要）。URL からは除外し、ジャンル選択はプルダウン UI で管理

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク / 制限 | 備考 |
|-----------|------|------|-------------|------|
| Server Component + Client Island | SC でデータ取得・Markdown 変換、CC は読了ボタン・ToC 追従・ジャンルプルダウンのみ | Next.js App Router の推奨パターン。最小限のクライアントバンドル | CC/SC の境界設計に注意が必要 | 既存の App Shell パターンと整合。**採用** |
| 全 Client Component | CSR でデータ取得・レンダリング | 実装が単純 | 初期表示遅延、SEO 不利、バンドル肥大化 | 不採用 |
| Static Generation (ISR) | ビルド時に静的生成 | 最速表示 | 同期 API との整合が複雑。revalidate 管理が煩雑 | コンテンツ更新頻度を考慮すると過剰 |

## 設計判断

### 判断: react-markdown によるサーバーサイドレンダリング

- **背景**: DB に格納された Markdown 原文をリクエスト時にサーバーサイドで HTML 変換する必要がある
- **検討した選択肢**:
  1. `react-markdown` + rehype プラグイン -- Server Component 内で直接レンダリング
  2. `unified` パイプライン直接使用 -- `remark-parse` > `remark-rehype` > `rehype-stringify` で HTML 文字列生成後 `dangerouslySetInnerHTML`
  3. `next-mdx-remote` -- MDX として処理
- **選定アプローチ**: `react-markdown` + `remark-gfm` + `rehype-pretty-code`
- **理由**: React コンポーネントとしてネイティブに統合できる。Server Component 対応。`dangerouslySetInnerHTML` を避けられるため XSS リスクが低減。カスタムコンポーネントでスタイリングが容易
- **トレードオフ**: unified 直接利用に比べてパフォーマンスは若干劣る可能性があるが、開発効率と安全性で優位

### 判断: ジャンル選択の状態管理（URL searchParams）

- **背景**: ジャンルプルダウンの選択状態をどこで管理するか
- **検討した選択肢**:
  1. URL searchParams（`?genre=engineering`）-- Server Component で参照可能
  2. Client Component のローカルステート -- SC で参照不可
  3. Cookie -- Middleware で参照可能だが過剰
- **選定アプローチ**: URL searchParams
- **理由**: Server Component でジャンル値を直接参照でき、SSR 時にフィルタリング済みデータを返却できる。ブックマーク・共有が可能。`router.push` でジャンル変更時にページ全体を再レンダリングせず、Server Component の部分的な再描画で済む

### 判断: 同期 API のトランザクション設計

- **背景**: 要件 4.3 により、UPSERT 処理はトランザクション内で実行する必要がある
- **検討した選択肢**:
  1. Supabase `rpc()` で PostgreSQL 関数を呼び出す
  2. Admin クライアントで個別 UPSERT を順次実行し、エラー時にリカバリ
- **選定アプローチ**: 両方のアプローチを許容。実装時に決定
- **理由**: Supabase JS クライアントは明示的なトランザクション API を提供しない。`rpc()` が信頼性で優位だが、PostgreSQL 関数の管理コストがある。個別 UPSERT は実装が簡潔だが、途中エラー時のリカバリが複雑
- **フォローアップ**: 実装タスクで具体的なアプローチを決定する

## リスク & 対策

- **graduation_date カラムの再追加**: 過去のマイグレーションで DROP されているため、新規マイグレーションで再追加が必要。app-shell spec との整合を確認済み
- **Markdown 内の画像パス解決**: Supabase Storage の URL 構造に依存。同期 API 側で画像パスを Supabase Storage URL に書き換える必要がある
- **大量コンテンツの同期パフォーマンス**: 初回フル同期時にタイムアウトの可能性。初期実装ではフル同期とし、パフォーマンス問題発生時に差分同期に移行
- **react-markdown + rehype-pretty-code のバンドルサイズ**: サーバーサイドのみの依存のため、クライアントバンドルには影響しない。ただし、サーバーサイドのコールドスタート時間に若干の影響がある可能性

## 参照

- [react-markdown GitHub](https://github.com/remarkjs/react-markdown) -- Markdown レンダリングライブラリ
- [react-markdown npm](https://www.npmjs.com/package/react-markdown) -- npm パッケージ情報
- [remark-gfm npm](https://www.npmjs.com/package/remark-gfm) -- GFM 拡張プラグイン
- [rehype-pretty-code 公式](https://rehype-pretty.pages.dev/) -- Shiki ベースのシンタックスハイライト
- [rehype-pretty-code npm](https://www.npmjs.com/package/rehype-pretty-code) -- npm パッケージ情報
- [@shikijs/rehype](https://shiki.matsu.io/packages/rehype) -- Shiki 公式 rehype 統合
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- Row Level Security の公式ドキュメント
- [Next.js MDX Guide](https://nextjs.org/docs/app/guides/mdx) -- MDX 統合ガイド
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) -- スクロール検出 API
