# Implementation Plan

> **技術選定確定**: react-markdown + remark-gfm (GFM対応), rehype-pretty-code / Shiki (github-dark), フラットテーブル (content_type識別子), Markdown AST (ToC抽出)。ジャンルプルダウン + デフォルトジャンル設定 (profiles.default_genre)。

## タスク一覧

- [x] 1. データベーススキーマとアクセス制御の構築
- [x] 1.1 `contents` テーブルと `content_progress` テーブルの作成
  - Supabase マイグレーションファイルを作成し、`contents` テーブルを新設する
  - カラム: `id`(UUID PK), `slug_path`(TEXT UNIQUE NOT NULL), `title`(TEXT NOT NULL), `body`(TEXT), `genre`(TEXT NOT NULL), `tutorial`(TEXT NOT NULL), `chapter`(TEXT), `section`(TEXT), `content_type`(TEXT NOT NULL), `order`(INTEGER NOT NULL DEFAULT 0), `status`(TEXT NOT NULL DEFAULT 'active'), `metadata`(JSONB), `created_at`(TIMESTAMPTZ), `updated_at`(TIMESTAMPTZ)
  - `content_type` の CHECK 制約: `'genre'`, `'tutorial'`, `'chapter'`, `'section'`
  - `status` の CHECK 制約: `'active'`, `'archived'`
  - インデックス: `slug_path`(UNIQUE), `(content_type, status, order)`, `(genre, content_type, status, order)`, `(tutorial, content_type, order)`, `(tutorial, chapter, content_type, order)`
  - 同一マイグレーション内で `content_progress` テーブルを新設する
  - カラム: `id`(UUID PK), `user_id`(UUID FK -> auth.users.id NOT NULL), `content_id`(UUID FK -> contents.id NOT NULL), `completed_at`(TIMESTAMPTZ DEFAULT now()), `created_at`(TIMESTAMPTZ DEFAULT now())
  - UNIQUE 制約: `(user_id, content_id)` で同一ユーザー・同一コンテンツの重複読了を防止
  - インデックス: `user_id`
  - _Requirements: 1.4, 3.2, 3.6, 4.4_

- [x] 1.2 `profiles` テーブルへのカラム追加
  - `graduation_date`(DATE, nullable) カラムを再追加するマイグレーションを作成する（過去のマイグレーションで DROP 済み）
  - `default_genre`(TEXT, nullable) カラムを追加する。NULL の場合は `'engineering'` をデフォルトとして扱う
  - _Requirements: 2.5, 5.4_

- [x] 1.3 RLS ポリシーの設定
  - `contents` テーブルに RLS を有効化する
  - `user` ロールと `super_admin` ロールに対して `status = 'active'` のレコードのみ SELECT を許可するポリシーを作成する
  - `super_admin` ロールに対して全ステータスのレコードを SELECT できる追加ポリシーを作成する
  - `manager` ロールにはポリシーを作成せず、デフォルト拒否でコンテンツ流出を防止する
  - `content_progress` テーブルに RLS を有効化し、`user_id = auth.uid()` の条件で SELECT / INSERT ポリシーを作成する
  - _Requirements: 3.9, 5.1, 5.2, 5.3_

- [x] 1.4 TypeScript 型定義の追加
  - `database.ts` に `contents` テーブルの型定義（Row / Insert / Update / Relationships）を追加する
  - `database.ts` に `content_progress` テーブルの型定義（Row / Insert / Update / Relationships）を追加する
  - `profiles` テーブルの既存型定義に `graduation_date: string | null` と `default_genre: string | null` を追加する
  - _Requirements: 1.4, 3.2_

- [x] 2. Middleware の受講期間チェック拡張
  - 既存 Middleware の `profiles` クエリに `graduation_date` カラムを追加する
  - 認証済みユーザーが `/contents/*` パスにアクセスした際、`graduation_date` が過去日付であればダッシュボードへリダイレクトする
  - `/contents` パス以外ではチェックをスキップし、既存の処理フローに影響を与えない
  - `graduation_date` が NULL の場合はアクセスを許可する（期間未設定 = 制限なし）
  - _Requirements: 2.5, 5.4_

- [x] 3. コンテンツ同期 API の実装
- [x] 3.1 同期エンドポイントの基本構造と認証
  - `POST /api/admin/sync-curriculums` の Route Handler を作成する
  - `x-api-key` ヘッダーを環境変数 `SYNC_API_KEY` と照合し、不一致で 401 を返却する
  - リクエストボディのバリデーション（`contents` 配列の存在チェック、各アイテムの必須フィールド検証）を実装し、不正ペイロードは 400 を返却する
  - `.env.local` に `SYNC_API_KEY` 環境変数を追加する
  - _Requirements: 4.1, 4.2, 5.5_

- [x] 3.2 コンテンツ UPSERT とアーカイブ処理
  - `createAdminClient()` を使用して RLS をバイパスし、同期処理を実行する
  - ペイロードの各コンテンツアイテムを `slug_path` をキーにして `contents` テーブルへ UPSERT する
  - ペイロードに含まれない既存 `active` コンテンツを `archived` に論理削除する
  - 処理全体をトランザクションとして実行し、途中でエラーが発生した場合は全体をロールバックする
  - 成功時に作成・更新・アーカイブの件数サマリーを含む 200 レスポンスを返却する
  - エラー時は 500 レスポンスでエラー詳細を返却する
  - _Requirements: 4.3, 4.4, 4.5, 4.6_
  - _Contracts: SyncCurriculumsRoute API_

- [x] 4. Markdown レンダリングと目次抽出の実装
- [x] 4.1 (P) Markdown レンダラーの構築
  - `react-markdown` + `remark-gfm` を使用して GitHub Flavored Markdown をサーバーサイドで React ノードに変換するレンダラーを実装する
  - `rehype-pretty-code`（Shiki / `github-dark` テーマ）でコードブロックにシンタックスハイライトを適用する
  - GFM 拡張（テーブル、取り消し線、タスクリスト、オートリンク）が正しくレンダリングされることを確認する
  - 画像リンク（Supabase Storage URL）を正しく解決して表示する
  - デザインリファレンスのタイポグラフィ（h2: Sora 18px/600, 本文: IBM Plex Mono 14px, コードブロック: bg=#1E293B）に準拠するカスタムコンポーネントスタイルを適用する
  - _Requirements: 2.1, 2.2, 2.8_
  - _Contracts: MarkdownRenderer Service_

- [x] 4.2 (P) 目次（ToC）データの抽出
  - remark カスタムプラグインで Markdown AST から h2 / h3 見出しノードを抽出し、ToC データ（id, text, level）の配列を生成する
  - 見出し ID をスラッグ化してアンカーリンクに使用する。重複時はサフィックスを付与して一意性を保証する
  - Markdown レンダラーと統合し、コンテンツと ToC データを一括で返却する `MarkdownRenderResult` インターフェースを実現する
  - _Requirements: 2.6_
  - _Contracts: MarkdownRenderer Service_

- [x] 5. 教材一覧ページの実装
- [x] 5.1 教材一覧 Server Component ページの構築
  - `contents` テーブルから `status = 'active'` かつ `content_type = 'tutorial'` のレコードを `order` 順に取得するデータ取得ロジックを実装する
  - `content_progress` テーブルからユーザーの進捗データを集計し、チュートリアルごとの進捗率（読了セクション数 / 全セクション数）を算出する
  - ジャンルプルダウンの選択値を URL searchParams（`?genre=engineering`）で管理し、Server Component でデータフィルタリングする
  - 初回アクセス時は `profiles.default_genre` の値またはデフォルト値（`"engineering"`）を使用する
  - App Shell レイアウト内にページを配置し、`loading.tsx` で Skeleton UI を提供する
  - _Requirements: 1.1, 1.4, 1.6, 7.1, 7.3, 7.4_
  - _Contracts: ContentsListPage State_

- [x] 5.2 進捗サマリーカードの実装
  - 選択中のジャンルに連動した進捗データを表示する3カード構成を実装する
  - ジャンル進捗カード: ジャンル内完了セクション数 / ジャンル内全セクション数のパーセンテージ表示。ラベルに「{ジャンル名} 進捗」を表示
  - 完了チュートリアルカード: ジャンル内完了チュートリアル数 / ジャンル内全チュートリアル数を表示
  - 学習中カード: 現在学習中のチュートリアルとセクション情報を表示し、該当セクションへの「続きから学習する」直接リンクを生成する
  - ジャンル切替時にカードの集計値が再計算されること
  - デザインリファレンスの進捗サマリー統計行（3カード等高, bg=#FFFFFF, radius=8, border=#E5E7EB）に準拠する
  - _Requirements: 1.7, 3.8_

- [x] 5.3 チュートリアルカードグリッドの実装
  - チュートリアルカードをフラットにグリッド表示する（ジャンル別グループ化なし、3カード/行）
  - 各カードにタイトル、チャプター数・セクション数、進捗率をプログレスバー付きで表示する
  - 進捗状態に応じたバリエーション: 未着手（#6B7280）、進行中（#00B0EC）、完了（#22C55E）
  - デザインリファレンスのカードスタイル（gap=16, padding=20, radius=8, border=#E5E7EB）に準拠する
  - _Requirements: 1.2, 1.7, 3.8_
  - _Contracts: TutorialCard_

- [x] 5.4 タブ UI とジャンルプルダウンの実装
  - 「教材」「演習問題」のタブ切替 UI を実装する
  - 「演習問題」タブは disabled 状態で「Coming Soon」を表示する（将来実装のプレースホルダー）
  - タブ行の右側にジャンル選択プルダウン（エンジニアリング / デザイン）を配置する
  - プルダウンの選択に応じて URL searchParams を更新し、チュートリアルカードをフィルタリングする
  - デザインリファレンスのタブスタイル（Active: border-bottom 2px #00B0EC, Sora 14px/600）に準拠する
  - _Requirements: 1.1, 1.8, 7.2_

- [x] 5.5 デフォルトジャンル設定の Server Action 実装
  - ジャンルプルダウン変更時にユーザーの `default_genre` を更新する `updateDefaultGenre` Server Action を実装する
  - 認証チェックを行い、`profiles.default_genre` を指定値に UPDATE する
  - 非同期で呼び出し UI をブロックしない。既存の `ActionResult` パターンに準拠する
  - 次回以降のアクセス時に更新後のジャンルが初期値として反映される
  - _Requirements: 1.8_
  - _Contracts: updateDefaultGenre Service_

- [x] 6. 教材詳細ページの実装
- [x] 6.1 教材セクション詳細 Server Component ページの構築
  - Dynamic Route `[tutorial]/[chapter]/[section]` の3セグメントで URL パラメータを受け取る
  - `slug_path` を構築して `contents` テーブルから該当セクションのレコードを取得する。存在しないコンテンツへのアクセス時は `notFound()` を返却する
  - Markdown レンダラーで本文を HTML に変換し、ToC データを抽出する
  - `content_progress` テーブルから当該セクションの読了状態を取得する
  - 同一チャプター内の前後セクション情報を取得する
  - メインコンテンツ + サイドバー ToC のレイアウトを構築する。`loading.tsx` で Skeleton UI を提供する
  - _Requirements: 2.1, 7.1, 7.3, 7.4_
  - _Contracts: ContentDetailPage State_

- [x] 6.2 パンくずリストの実装
  - `教材 / {tutorial.title} / {chapter.title} / {section.title}` のパンくずリストを Server Component で実装する
  - 各階層がリンクとして機能し、対応するページに遷移できるようにする
  - デザインリファレンスのセパレータ（" / "）・カラー（リンク: #00B0EC, 現在地: #1A1A1A）に準拠する
  - _Requirements: 2.4_
  - _Contracts: ContentBreadcrumb_

- [x] 6.3 サイドバー目次とスクロール追従の実装
  - Server Component で ToC データをサイドバーにリスト表示する静的部分を構築する
  - Client Component で Intersection Observer API を使用した見出し検出・アクティブハイライト機能を実装する
  - `rootMargin: '0px 0px -70% 0px'` で画面上部 30% の見出しを検出する
  - クリックで該当箇所にスムーススクロールする
  - `useEffect` 内で IntersectionObserver を初期化し、クリーンアップで disconnect する
  - デザインリファレンスの ToC スタイル（アクティブ: bg=#EFF9FE, left-border 3px #00B0EC, w=240）に準拠する
  - _Requirements: 2.6, 2.7_
  - _Contracts: TableOfContents, TableOfContentsClient State_

- [x] 6.4 セクション間ナビゲーションの実装
  - 同一チャプター内の前後セクションへの「前へ」「次へ」ナビゲーションボタンを実装する
  - **読了済みのセクションでのみ表示**し、未読了のセクションでは非表示にする
  - 最初のセクションでは「前へ」を非表示、最後のセクションでは「次へ」を非表示にする
  - デザインリファレンスのボタンスタイル（前へ: outline border=#E5E7EB, 次へ: filled bg=#00B0EC）に準拠する
  - _Requirements: 2.3_
  - _Contracts: SectionNavigation_

- [x] 7. 読了記録と進捗管理の実装
- [x] 7.1 `markAsRead` Server Action の実装
  - `auth.getUser()` で認証チェックを行い、未認証の場合はエラーを返却する
  - `content_progress` テーブルで既存レコードを確認し、未読了の場合のみ INSERT する
  - 既に読了済みの場合は `alreadyCompleted: true` を返却し、重複記録を防止する
  - 次のセクションの有無と、存在する場合はそのパス情報を返却する
  - 成功時に `revalidatePath('/contents')` でキャッシュを無効化する
  - 既存の Server Action パターン（`ActionResult` 型）に準拠する
  - _Requirements: 3.2, 3.6, 3.9_
  - _Contracts: markAsRead Service_

- [x] 7.2 読了ボタン Client Component の実装
  - 未読了状態: 「読了する」ボタンを表示し、クリックで `markAsRead` Server Action を呼び出す
  - 読了済み状態: 「読了済み」として disabled 表示する（再押下しても重複記録しない）
  - Server Action の実行中はローディング状態を表示する（`useActionState` / `useTransition` を使用）
  - Server Action 完了後、おめでとうモーダルを表示する
  - デザインリファレンスの読了ボタンスタイル（未読了: bg=#00B0EC, 読了済み: bg=#F3F4F6, text=#22C55E, circle-check icon）に準拠する
  - _Requirements: 3.1, 3.2, 3.6_
  - _Contracts: ReadCompleteButton State_

- [x] 7.3 おめでとうモーダルの実装
  - 読了完了時に「おめでとうございます!」メッセージを表示するモーダルダイアログを実装する
  - モーダル内に「教材一覧に戻る」ボタンと「次のセクションに進む」ボタンを配置する
  - チャプター最終セクション（次のセクションが存在しない場合）は「次のセクションに進む」を「チャプター一覧に戻る」に置き換える
  - shadcn/ui の Dialog コンポーネントをベースに実装する
  - デザインリファレンスのモーダルスタイル（w=440, radius=12, padding=32, shadow: 0 8 40 rgba(0,0,0,0.3)）に準拠する
  - _Requirements: 3.3, 3.4, 3.5_
  - _Contracts: CongratulationsModal_

- [x] 7.4 チャプター一覧での読了チェックマーク表示
  - チュートリアル選択後のチャプター詳細画面で各セクションの読了状態をチェックマーク等のアイコンで表示する
  - `content_progress` テーブルからユーザーの当該チャプター内セクションの読了状態を一括取得する
  - _Requirements: 3.7_

- [x] 8. Super Admin コンテンツ管理画面の実装
- [x] 8.1 (P) コンテンツ管理一覧ページの構築
  - 全コンテンツ（`active` + `archived`）を一覧表示する管理画面を実装する
  - 各コンテンツのステータス（`active`/`archived`）、最終同期日時（`updated_at`）を表示する
  - `slug_path`、ジャンル、チュートリアル、チャプター、セクションの階層情報を表示する
  - 既存の admin ページパターン（ユーザー管理画面）に準拠したレイアウトとする
  - `loading.tsx` で Skeleton UI を提供する
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 8.2 (P) コンテンツ詳細の表示
  - Super Admin がコンテンツ詳細を閲覧できる画面を構築する
  - User 向けの教材詳細ページの Markdown レンダリングを共有し、Super Admin の場合は管理情報（ステータス、slug_path、同期日時等）を追加表示する
  - RLS ポリシーにより Super Admin は全ステータスのコンテンツを閲覧可能
  - _Requirements: 6.3, 6.4_

- [x] 9. App Shell 拡張
- [x] 9.1 (P) ヘッダーへの検索バープレースホルダー配置
  - AppHeader コンポーネントを拡張し、ヘッダー中央にセマンティック検索バーの UI プレースホルダーを配置する
  - User ロールのみ表示し、検索機能は未実装（disabled / 入力不可状態）
  - デザインリファレンスの検索バースタイル（w=600, h=36, bg=#F3F4F6, radius=8, search icon + placeholder テキスト）に準拠する
  - _Requirements: 7.2_

- [x] 9.2 (P) サイドバーナビゲーションの更新
  - User ロールのサイドバーに「教材・演習」メニュー項目を追加し、`/contents` にリンクする
  - Super Admin ロールのサイドバーに「コンテンツ管理」メニュー項目を追加し、`/admin/contents` にリンクする
  - 現在のパスに応じたアクティブ状態のハイライトを適用する
  - _Requirements: 7.1_

- [x] 10. 結合テストとエンドツーエンド検証
- [x] 10.1 教材閲覧フローの結合検証
  - 教材一覧ページ -> チュートリアルカード -> セクション閲覧の画面遷移が正常に動作することを確認する
  - パンくずリストから各階層への遷移が正常に機能することを確認する
  - セクション間ナビゲーション（前へ/次へ）が正しいリンク先に遷移することを確認する
  - 存在しないパスへのアクセスで 404 が表示されることを確認する
  - ジャンルプルダウン切替でカード一覧がフィルタリングされることを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.8, 2.1, 2.3, 2.4_

- [x] 10.2 読了・進捗フローの結合検証
  - 読了ボタン押下 -> `content_progress` INSERT -> おめでとうモーダル表示 -> 次のセクション遷移の一連のフローを検証する
  - 読了操作後にチュートリアル一覧の進捗率が更新されることを確認する
  - 読了済みセクションで「読了済み」状態が正しく表示されることを確認する
  - チャプター一覧での読了チェックマークが反映されることを確認する
  - チャプター最終セクションでモーダルのボタンテキストが「チャプター一覧に戻る」に切り替わることを確認する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [x] 10.3 アクセス制御の結合検証
  - 受講期間切れユーザーが `/contents/*` にアクセスした際にダッシュボードへリダイレクトされることを確認する
  - Manager ロールのユーザーがコンテンツテーブルからデータを取得できないことを確認する（RLS 拒否）
  - Super Admin が全ステータスのコンテンツを閲覧できることを確認する
  - 同期 API に無効な API キーでリクエストした際に 401 が返却されることを確認する
  - `graduation_date` が NULL のユーザーがアクセスを許可されることを確認する
  - _Requirements: 2.5, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10.4 同期 API の結合検証
  - 有効な API キーで同期リクエストを送信し、コンテンツが正しく UPSERT されることを確認する
  - ペイロードに含まれないコンテンツが `archived` に論理削除されることを確認する
  - 不正ペイロードに対して 400 が返却されることを確認する
  - エラー発生時にトランザクション全体がロールバックされることを確認する
  - 成功レスポンスに作成・更新・アーカイブの件数サマリーが含まれることを確認する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

## 要件カバレッジマトリクス

| 要件ID | タスク |
|--------|-------|
| 1.1 | 5.1, 5.4, 10.1 |
| 1.2 | 5.3, 10.1 |
| 1.3 | 10.1 |
| 1.4 | 1.1, 1.4, 5.1 |
| 1.5 | 10.1 |
| 1.6 | 5.1 |
| 1.7 | 5.2, 5.3 |
| 1.8 | 5.4, 5.5, 10.1 |
| 2.1 | 4.1, 6.1, 10.1 |
| 2.2 | 4.1 |
| 2.3 | 6.4, 10.1 |
| 2.4 | 6.2, 10.1 |
| 2.5 | 1.2, 2, 10.3 |
| 2.6 | 4.2, 6.3 |
| 2.7 | 6.3 |
| 2.8 | 4.1 |
| 3.1 | 7.2, 10.2 |
| 3.2 | 1.1, 7.1, 7.2, 10.2 |
| 3.3 | 7.3, 10.2 |
| 3.4 | 7.3, 10.2 |
| 3.5 | 7.3, 10.2 |
| 3.6 | 1.1, 7.1, 7.2, 10.2 |
| 3.7 | 7.4, 10.2 |
| 3.8 | 5.2, 5.3, 10.2 |
| 3.9 | 1.3, 7.1 |
| 4.1 | 3.1, 10.4 |
| 4.2 | 3.1, 10.3, 10.4 |
| 4.3 | 3.2, 10.4 |
| 4.4 | 1.1, 3.2, 10.4 |
| 4.5 | 3.2, 10.4 |
| 4.6 | 3.2, 10.4 |
| 4.7 | 3.1 |
| 5.1 | 1.3, 10.3 |
| 5.2 | 1.3, 10.3 |
| 5.3 | 1.3, 10.3 |
| 5.4 | 1.2, 2, 10.3 |
| 5.5 | 3.1, 10.3 |
| 6.1 | 8.1 |
| 6.2 | 8.1 |
| 6.3 | 8.1, 8.2 |
| 6.4 | 8.2 |
| 7.1 | 5.1, 6.1, 9.2 |
| 7.2 | 5.4, 9.1 |
| 7.3 | 5.1, 6.1 |
| 7.4 | 5.1, 6.1 |
