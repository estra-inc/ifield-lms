# 要件定義書: コンテンツ同期ワークフロー（content-sync-workflow）

## 概要

教材リポジトリ（GitHub）の `main` ブランチへの Push をトリガーに、GitHub Actions ワークフローが教材ディレクトリを解析し、LMS の同期 API（`POST /api/admin/sync-curriculums`）へ UPSERT リクエストを送信する。教材ファイルの修正は不要で、ディレクトリ名・ファイル名の命名規則からメタデータを自動抽出する。

## 前提条件

- LMS アプリケーションに `POST /api/admin/sync-curriculums` エンドポイントが実装済み（contents-and-quizzes spec）
- 教材リポジトリは LMS リポジトリとは別リポジトリで管理される
- 同期 API は `x-api-key` ヘッダーによる認証を使用する
- **教材ファイルの修正は不要**: 既存の命名規則・ディレクトリ構造をそのまま使用できる設計とする

## 要件

### REQ-1: トリガー条件

- **REQ-1.1**: `main` ブランチへの Push 時に自動実行される
- **REQ-1.2**: `workflow_dispatch` による手動実行もサポートする
- **REQ-1.3**: 全量同期として実行する（冪等性を前提とする）

### REQ-2: 教材リポジトリのディレクトリ構造

教材リポジトリは以下の4階層構造を前提とする:

```
curriculums/
└── engineering/                                                       # genre
    ├── tutorial-10: webフレームワークLaravelの実践的に使いこなそう🛠️/  # tutorial
    │   ├── chapter-1: Laravelにおける認証/                            # chapter
    │   │   ├── 10-1-1_LaravelFortifyとは.md                           # section
    │   │   └── 10-1-2_ログイン画面の実装.md
    │   └── chapter-2: データベース設計/
    │       └── 10-2-1_マイグレーション.md
    └── tutorial-11: API開発の基礎/
        └── ...
```

- **REQ-2.1**: `curriculums/` ディレクトリをルートとする
- **REQ-2.2**: 第1階層がジャンル（例: `engineering`, `design`）
- **REQ-2.3**: 第2階層がチュートリアル。命名規則: `tutorial-<N>: <タイトル>`
- **REQ-2.4**: 第3階層がチャプター。命名規則: `chapter-<N>: <タイトル>`
- **REQ-2.5**: 第4階層がセクション（Markdown ファイル）。命名規則: `<T>-<C>-<S>_<タイトル>.md`

### REQ-3: タイトル抽出ルール

教材ファイルやディレクトリの命名規則からタイトルを自動抽出する。フロントマター等の追記は不要。

- **REQ-3.1**: **genre**: ディレクトリ名をタイトルとして使用
- **REQ-3.2**: **tutorial / chapter**: ディレクトリ名の `: ` 以降をタイトルとして抽出（例: `tutorial-10: webフレームワーク...` → "webフレームワーク..."）
- **REQ-3.3**: **section**: 以下の優先順位で解決
  1. フロントマターの `title` フィールド（存在する場合のみ）
  2. Markdown 本文の最初の `# 見出し`
  3. ファイル名の `_` 以降（拡張子除去、例: `10-1-1_LaravelFortifyとは.md` → "LaravelFortifyとは"）

### REQ-4: 表示順序（order）抽出ルール

- **REQ-4.1**: **genre**: 0（固定）
- **REQ-4.2**: **tutorial**: `tutorial-<N>` の N（例: `tutorial-10` → order: 10）
- **REQ-4.3**: **chapter**: `chapter-<N>` の N（例: `chapter-1` → order: 1）
- **REQ-4.4**: **section**: ファイル名プレフィックス `<T>-<C>-<S>` の末尾の数字 S（例: `10-1-1` → order: 1, `10-1-2` → order: 2）
- **REQ-4.5**: フロントマターに `order` が存在する場合はそちらを優先する

### REQ-5: slug_path 生成ルール

URL に使用するスラグパスを生成する。日本語タイトル部分は含めず、識別子部分のみ使用する。

- **REQ-5.1**: **genre**: ディレクトリ名をそのまま使用（例: `engineering`）
- **REQ-5.2**: **tutorial**: `: ` より前の部分を使用（例: `tutorial-10`）
- **REQ-5.3**: **chapter**: `: ` より前の部分を使用（例: `chapter-1`）
- **REQ-5.4**: **section**: `_` より前の部分を使用（例: `10-1-1`）
- **REQ-5.5**: 各階層をスラッシュで結合（例: `engineering/tutorial-10/chapter-1/10-1-1`）

### REQ-6: 同期 API 呼び出し

- **REQ-6.1**: 解析したコンテンツを JSON ペイロードとして `POST /api/admin/sync-curriculums` に送信する
- **REQ-6.2**: `x-api-key` ヘッダーに `SYNC_API_KEY` シークレットをセットする
- **REQ-6.3**: API のレスポンスからサマリー（created / updated / archived）と内訳（genre / tutorial / chapter / section 件数）をログ出力する
- **REQ-6.4**: API がエラーレスポンスを返した場合、ワークフローを失敗ステータスで終了する

### REQ-7: セキュリティ

- **REQ-7.1**: `SYNC_API_KEY` は GitHub Repository Secrets に保存する
- **REQ-7.2**: `LMS_BASE_URL` は GitHub Repository Secrets に保存する
- **REQ-7.3**: ワークフローファイルにシークレット値をハードコードしない

### REQ-8: エラーハンドリング

- **REQ-8.1**: Markdown のパースエラー時はそのファイルをスキップし、警告ログを出力する
- **REQ-8.2**: `curriculums/` ディレクトリが存在しない場合、エラーで終了する
- **REQ-8.3**: 同期対象コンテンツが 0 件の場合、警告を出力してスキップする（API は呼び出さない）

### REQ-9: ローカル開発サポート

- **REQ-9.1**: ローカル開発用の同期スクリプト（`scripts/sync-contents-local.mjs`）を提供する
- **REQ-9.2**: `lms-fe/.env.local` から `SYNC_API_KEY` を自動読み込みする
- **REQ-9.3**: デフォルトの送信先は `http://localhost:3000`。`LMS_BASE_URL` 環境変数で変更可能
- **REQ-9.4**: GitHub Actions ワークフローと同一の解析ロジックを使用する

## 備考

- 本ワークフローは **教材リポジトリ側** に配置するが、LMS リポジトリにもテンプレートとしてワークフローファイルとローカル同期スクリプトを提供する
- 同期は全量同期（ペイロードに含まれないコンテンツは archived になる）であるため、差分同期の仕組みは不要
- フロントマターは後方互換のためサポートするが、必須ではない
