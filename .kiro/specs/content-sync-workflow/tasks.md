# 実装タスク: コンテンツ同期ワークフロー（content-sync-workflow）

- [x] 1. コンテンツ解析エンジンの実装
- [x] 1.1 (P) ディレクトリ名・ファイル名のメタデータ抽出ロジックを実装する
  - ディレクトリ名の `: ` セパレータでスラグとタイトルを分離する関数を作成する
  - セクションファイル名の `_` セパレータでプレフィックスとタイトルを分離する関数を作成する
  - 各階層（genre, tutorial, chapter, section）に応じた order 値の抽出ルールを実装する
  - フロントマターの `order` が存在する場合はそちらを優先する仕組みを組み込む
  - 各階層に応じた slug_path の生成ルール（識別子部分のみ使用）を実装する
  - slug_path を階層スラッシュで結合する処理を実装する
  - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Contracts: ContentParser Service_

- [x] 1.2 (P) セクションファイルのタイトル解決ロジックを実装する
  - YAML フロントマターの簡易パーサー（正規表現ベース、外部ライブラリ不使用）を作成する
  - Markdown 本文から最初の `# 見出し` を抽出する関数を作成する
  - タイトル解決の優先順位（フロントマター `title` > `# 見出し` > ファイル名）に従う統合ロジックを実装する
  - _Requirements: 3.3_
  - _Contracts: ContentParser Service_

- [x] 2. コンテンツ収集機能の実装
- [x] 2.1 教材リポジトリの 4 階層ディレクトリ構造を走査してコンテンツを収集する
  - `curriculums/` をルートとした genre > tutorial > chapter > section の 4 階層再帰走査を実装する
  - 各階層で ContentParser を使用してメタデータ（タイトル、order、slug_path）を抽出する
  - セクションファイル（`.md`）の本文読み込みとコンテンツアイテムへの変換を行う
  - `_index.md` ファイルのスキップ処理を組み込む
  - パースエラー発生時は当該ファイルをスキップし、警告ログを出力して続行する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1_
  - _Contracts: ContentCollector Service_

- [x] 3. GitHub Actions ワークフローの実装
- [x] 3.1 同期ワークフローファイルを作成する
  - `main` ブランチへの Push および `workflow_dispatch` による手動実行の両トリガーを設定する
  - Node.js インラインスクリプトとして ContentParser・ContentCollector ロジックを内包する
  - `curriculums/` ディレクトリの存在確認を行い、不在時はエラーで終了する
  - 解析したコンテンツが 0 件の場合は警告を出力して API 呼び出しをスキップする
  - `GITHUB_SHA` と `git log` からコミットハッシュ・コミットメッセージを取得してペイロードに含める
  - _Requirements: 1.1, 1.2, 1.3, 8.2, 8.3_
  - _Contracts: SyncWorkflow Batch_

- [x] 3.2 同期 API への送信とレスポンス処理を実装する
  - 解析結果を JSON ペイロードとして `POST /api/admin/sync-curriculums` に送信する
  - `x-api-key` ヘッダーに `SYNC_API_KEY` シークレットをセットする
  - `SYNC_API_KEY` と `LMS_BASE_URL` は GitHub Repository Secrets から環境変数として注入する（ハードコード禁止）
  - API レスポンスからサマリー（created / archived）と内訳をログ出力する
  - API がエラーレスポンスを返した場合、ワークフローを失敗ステータスで終了する
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3_

- [x] 4. ローカル開発用同期スクリプトの実装
- [x] 4.1 ローカル同期スクリプトを作成する
  - `scripts/sync-contents-local.mjs`（ESM モジュール）として配置する
  - コマンドライン引数で教材リポジトリのルートディレクトリを受け取る
  - `lms-fe/.env.local` から `SYNC_API_KEY` を自動読み込みする簡易 dotenv 実装を組み込む
  - デフォルトの送信先を `http://localhost:3000` とし、`LMS_BASE_URL` 環境変数で変更可能にする
  - GitHub Actions ワークフローと同一の解析ロジック（ContentParser / ContentCollector）を使用する
  - git コミットハッシュ・コミットメッセージを教材リポジトリから取得してペイロードに含める
  - 引数不足・ディレクトリ不在・API キー未設定の各エラーケースで適切なメッセージを出力して終了する
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 6.1, 6.2, 6.3, 6.4, 8.2, 8.3_
  - _Contracts: LocalSyncScript Batch_
