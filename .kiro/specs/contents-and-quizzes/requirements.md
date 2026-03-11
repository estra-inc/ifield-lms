# 要件定義書: 教材・演習（Contents）

## はじめに

本仕様は、LMS（社内研修学習管理システム）における「教材コンテンツ」機能の要件を定義する。

GitHub上でDocs-as-Code方式により管理されたカリキュラムコンテンツ（Markdown教材）を、LMS側で受講生が一覧・閲覧できるようにする機能を実現する。

本機能のスコープは以下の通り:
- **カリキュラム一覧・閲覧**: GitHubから同期されたコンテンツの階層的なブラウジングと教材の閲覧
- **学習進捗管理**: セクション単位の読了記録と進捗率表示（`content_progress`テーブル）
- **同期API**: GitHub Actionsから呼び出されるコンテンツ同期エンドポイント
- **アクセス制御**: ロールベースのコンテンツアクセス制御

**スコープ外（将来実装）**: 確認クイズ（出題・回答・採点・履歴）、模擬案件（Mock Projects）、日報、コーチング予約、ダッシュボード。これらは別仕様で扱う。

### 仕様決定事項

要件検討で確定した仕様判断を以下に記録する。

| # | 項目 | 決定 |
|---|------|------|
| Q1 | コンテンツ公開方式 | 全コンテンツを最初から公開。段階的解放なし |
| Q2 | Markdownレンダリング | Markdown原文を`body`に保存し、Server Componentで表示時にサーバーサイド変換 |
| Q3 | 目次（ToC） | サイドバーに目次を表示し、スクロール追従するアクティブハイライト付き |
| Q4 | 同期トリガー | GitHub Actions Webhookのみ（`main`ブランチPush時） |
| Q5 | 既読・進捗管理 | セクション最下部の読了ボタンで「既読」記録。`content_progress`テーブルで管理。進捗率を表示 |
| Q6 | キーワード検索 | 不要（階層ナビゲーションで十分） |
| Q7 | クイズ機能 | 本specのスコープ外。将来の別specで実装 |

---

## 要件

### 1. カリキュラム一覧表示

**目的:** User（受講生）として、カリキュラムの教材をジャンル・チュートリアル・チャプターの階層構造で一覧表示できること。それにより、学習したい教材を効率的に見つけてアクセスできる。

#### 受け入れ基準

1. When ユーザーが教材一覧ページにアクセスした時, the LMS shall GitHubから同期済みの全ジャンル一覧を`order`カラム順に表示する
2. When ユーザーがジャンルを選択した時, the LMS shall 当該ジャンル配下のチュートリアル一覧をカード形式で表示する
3. When ユーザーがチュートリアルを選択した時, the LMS shall 当該チュートリアル配下のチャプター一覧をセクション構成とともに表示する
4. The LMS shall `contents`テーブルの`status = 'active'`のコンテンツのみを一覧に表示する（`archived`は非表示）
5. The LMS shall URLスラッグを`/contents/{genre}/{tutorial}/{chapter}/{section}`の階層パスで構成する（GitHubリポジトリのディレクトリ構造に準拠）
6. The LMS shall 全コンテンツを最初から公開し、ユーザーが自由にアクセスできるようにする（段階的解放なし）
7. The LMS shall 各チュートリアルカードにチャプター数と学習進捗率（読了セクション数 / 全セクション数）を表示する
8. The LMS shall チュートリアル一覧をジャンル別にグループ化して表示する

### 2. 教材コンテンツ閲覧

**目的:** User（受講生）として、GitHubから同期されたMarkdown教材を読みやすい形式で閲覧できること。それにより、体系的に学習を進められる。

#### 受け入れ基準

1. When ユーザーが教材セクションページにアクセスした時, the LMS shall `contents`テーブルの`body`カラムに格納されたMarkdown原文をServer Componentでサーバーサイド変換しHTMLとしてレンダリング表示する
2. The LMS shall 教材内の画像リンク（Supabase Storageに同期済みのURL）を正しく表示する
3. When ユーザーが教材セクションを閲覧している時, the LMS shall 当該チャプター内のセクション間ナビゲーション（前へ/次へ）を提供する
4. The LMS shall 現在閲覧中のセクションの位置をパンくずリストで表示する（ジャンル > チュートリアル > チャプター > セクション）
5. While ユーザーの受講期間が終了している（`graduation_date`が過去日付の）場合, the LMS shall 教材閲覧ページへのアクセスをブロックしダッシュボードへリダイレクトする
6. The LMS shall 教材セクションページのサイドバーに目次（Table of Contents）を表示する。目次はMarkdownの見出しタグ（h2, h3等）から自動生成する
7. The LMS shall 目次にスクロール追従するアクティブハイライトを適用し、現在表示中のセクション見出しを視覚的に強調する
8. The LMS shall Markdownのコードブロックにシンタックスハイライトを適用する

### 3. 学習進捗管理（読了記録）

**目的:** User（受講生）として、教材セクションの学習完了を記録し進捗状況を把握できること。それにより、学習の達成感を得ながら体系的に学習を進められる。

#### 受け入れ基準

1. The LMS shall 教材セクションページの最下部に「読了」ボタンを配置する
2. When ユーザーが読了ボタンを押下した時, the LMS shall `content_progress`テーブルに当該セクションの読了記録を作成する
3. When 読了記録が作成された時, the LMS shall 「おめでとうございます」モーダルを表示する
4. The LMS shall 読了モーダル内に「教材一覧に戻る」ボタンと「次のセクションに進む」ボタンを提供する
5. When 次のセクションが存在しない（チャプター最終セクション）場合, the LMS shall モーダル内の「次のセクションに進む」ボタンを「チャプター一覧に戻る」ボタンに置き換える
6. The LMS shall 既に読了済みのセクションでは読了ボタンを「読了済み」状態で表示し、再度押下しても重複記録しない
7. The LMS shall チャプター一覧画面で各セクションの読了状態（チェックマーク等）を表示する
8. The LMS shall チュートリアル一覧画面で進捗率（読了セクション数 / 全セクション数）をプログレスバーで表示する
9. The LMS shall User が自身の `content_progress` レコードのみを SELECT / INSERT できる RLS ポリシーを適用する

### 4. コンテンツ同期API

**目的:** System として、GitHub ActionsからPush時に教材コンテンツを自動同期できるAPIを提供すること。それにより、コンテンツ管理者がGitHubでの編集内容をLMSに反映できる。

#### 受け入れ基準

1. The LMS shall `POST /api/admin/sync-curriculums`エンドポイントを提供する
2. When 同期APIがリクエストを受信した時, the LMS shall リクエストヘッダーのAPIキー（Secret）を検証し、不一致の場合は`401 Unauthorized`を返却する
3. When 有効なAPIキーで同期リクエストを受信した時, the LMS shall トランザクション内で以下のUPSERT処理を実行する: 新規コンテンツの作成、既存コンテンツの更新、リポジトリから削除されたコンテンツの論理削除（`status = 'archived'`）
4. The LMS shall 同期リクエストのペイロードに含まれるMarkdown本文（Frontmatter含む）をパースし、`contents`テーブルの`slug_path`, `title`, `body`, `genre`, `tutorial`, `chapter`, `section`, `order`カラムにマッピングする
5. If 同期処理中にデータベースエラーが発生した場合, the LMS shall トランザクション全体をロールバックし、エラー詳細をレスポンスボディに含む`500 Internal Server Error`を返却する
6. When 同期処理が成功した時, the LMS shall 作成・更新・アーカイブの件数サマリーを含む`200 OK`レスポンスを返却する
7. The LMS shall GitHub Actions Webhookのみを同期トリガーとする（`main`ブランチへのPush時）

### 5. コンテンツのアクセス制御

**目的:** System として、ロールと受講期間に基づいてコンテンツへのアクセスを制御すること。それにより、権限のないユーザーによるコンテンツ閲覧を防止できる。

#### 受け入れ基準

1. The LMS shall `contents`テーブルにRLS（Row Level Security）を適用する
2. The LMS shall `User`ロールおよび`Super Admin`ロールに対して`contents`テーブルの`SELECT`権限を付与する
3. The LMS shall `Manager`ロールに対して`contents`テーブルの`SELECT`権限を明示的に剥奪する（PRD: コンテンツ流出防止）
4. While ユーザーの受講期間が終了している場合, the LMS shall Next.js Middlewareで教材関連パス（`/contents/*`）へのアクセスを検知しダッシュボードへリダイレクトする
5. The LMS shall 同期API（`POST /api/admin/sync-curriculums`）をAPIキー認証で保護し、認証されたリクエストのみがコンテンツを変更できるようにする

### 6. Super Adminによるコンテンツ管理状態の確認

**目的:** Super Admin（スーパー管理者）として、同期されたコンテンツの状態を管理画面で確認できること。それにより、コンテンツの同期状況を把握し問題があれば対処できる。

#### 受け入れ基準

1. The LMS shall Super Adminがコンテンツ一覧（全ジャンル・全ステータス）を閲覧できる管理画面を提供する
2. The LMS shall 各コンテンツのステータス（`active`/`archived`）、最終同期日時を表示する
3. When Super Adminがコンテンツ詳細を閲覧した時, the LMS shall `slug_path`、ジャンル、チュートリアル、チャプター、セクション情報を表示する
4. The LMS shall Super Adminが教材コンテンツを閲覧できるようにする（PRD: Super Adminは教材閲覧可）

> **注記**: PRDの方針に基づき、LMS画面でのコンテンツ作成・編集機能は提供しない。コンテンツの作成・編集はGitHubリポジトリで行う。

### 7. UI 共通要件

**目的:** 全ユーザーとして、教材関連ページで一貫した UI 体験を得たい。それにより、直感的で使いやすい操作が可能になる。

#### 受け入れ基準

1. The LMS shall App Shell（サイドバー・ヘッダー）内のレイアウトとして教材ページを表示する
2. The LMS shall デザインシステム（`designs/design-system.pen`）のデザイントークンに準拠したスタイルを適用する
3. While データ読み込み中, the LMS shall ローディング状態を表示する
4. The LMS shall Server Components をデフォルトとし、インタラクティブな部分（読了ボタン、目次のスクロール追従）のみ Client Component として実装する

---

## トレーサビリティマトリクス

| 要件ID | PRDセクション | 根拠 |
|--------|-------------|------|
| 1 (カリキュラム一覧表示) | SS4.4 教材・演習、SS5 サイトマップ | ジャンル/チュートリアル/チャプター/セクションの階層構造。全公開方式 |
| 2 (教材コンテンツ閲覧) | SS4.4、SS6.1 contents テーブル | Markdown教材のサーバーサイドレンダリング、サイドバー目次、セクション間ナビゲーション |
| 3 (学習進捗管理) | SS4.4 学習進捗 | セクション単位の読了ボタン、`content_progress`テーブル、進捗率表示 |
| 4 (コンテンツ同期API) | SS4.4 Docs-as-Code、SS6.1 contents | GitHub Actions Webhook同期、UPSERT処理、論理削除 |
| 5 (アクセス制御) | SS7 権限分離、SS3 RBAC | RLS適用、Manager権限剥奪、受講期間チェック |
| 6 (SA コンテンツ管理) | SS3 RBAC、SS5 サイトマップ | Super Admin によるコンテンツ状態確認 |
| 7 (UI 共通要件) | SS5 サイトマップ、steering/tech.md | App Shell 統合、Server Components、デザインシステム準拠 |
