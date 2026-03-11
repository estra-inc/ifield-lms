# 教材コンテンツ同期ガイド

本ドキュメントは、GitHub リポジトリで管理された教材 Markdown ファイルを LMS に自動同期する仕組みの使い方を説明します。

## アーキテクチャ概要

```
教材リポジトリ (GitHub)
  │  main ブランチへ Push
  ▼
GitHub Actions (sync-contents.yml)
  │  curriculums/ ディレクトリを解析
  │  ディレクトリ名・ファイル名から自動パース
  ▼
POST /api/admin/sync-curriculums
  │  x-api-key 認証
  │  contents テーブルへ UPSERT
  ▼
LMS (Supabase contents テーブル)
  │  ペイロードにないコンテンツは archived
  ▼
受講生がブラウザで教材を閲覧
```

## セットアップ手順

### 1. 教材リポジトリの構成

教材リポジトリは以下のディレクトリ構造・命名規則に準拠します。

```
your-curriculum-repo/
├── .github/
│   └── workflows/
│       └── sync-contents.yml       ← ワークフローファイル
└── curriculums/
    └── engineering/                                                         ← genre
        ├── tutorial-10: webフレームワークLaravelの実践的に使いこなそう🛠️/    ← tutorial
        │   ├── chapter-1: Laravelにおける認証/                              ← chapter
        │   │   ├── 10-1-1_LaravelFortifyとは.md                             ← section
        │   │   ├── 10-1-2_ログイン画面の実装.md
        │   │   └── 10-1-3_メール認証.md
        │   └── chapter-2: データベース設計/
        │       ├── 10-2-1_マイグレーション.md
        │       └── 10-2-2_Eloquentモデル.md
        └── tutorial-11: API開発の基礎/
            └── ...
```

**教材ファイルの修正は不要です。** ディレクトリ名・ファイル名からタイトルと表示順序を自動抽出します。

### 2. ワークフローファイルの配置

LMS リポジトリの `.github/workflows/sync-contents.yml` を教材リポジトリの `.github/workflows/` にコピーします。

### 3. GitHub Secrets の設定

教材リポジトリの **Settings > Secrets and variables > Actions** で以下を設定します。

| Secret 名 | 説明 | 例 |
|-----------|------|-----|
| `LMS_BASE_URL` | LMS アプリケーションのベース URL | `https://your-lms.vercel.app` |
| `SYNC_API_KEY` | 同期 API の認証キー（LMS の `SYNC_API_KEY` と同じ値） | `sk-sync-xxxxxxxxxxxx` |

> **重要**: LMS 側の `.env.local`（または Vercel 環境変数）にも `SYNC_API_KEY` が設定されている必要があります。

### 4. LMS 側の環境変数確認

```env
SYNC_API_KEY=sk-sync-xxxxxxxxxxxx
```

## 命名規則

### ディレクトリ構造と content_type

| 階層 | 命名パターン | content_type | 例 |
|------|------------|-------------|-----|
| 第1階層 | `<genre>` | `genre` | `engineering` |
| 第2階層 | `tutorial-<N>: <タイトル>` | `tutorial` | `tutorial-10: webフレームワークLaravelの実践的に使いこなそう🛠️` |
| 第3階層 | `chapter-<N>: <タイトル>` | `chapter` | `chapter-1: Laravelにおける認証` |
| 第4階層 | `<T>-<C>-<S>_<タイトル>.md` | `section` | `10-1-1_LaravelFortifyとは.md` |

### タイトルの抽出ルール

| 対象 | 抽出方法 | 例 |
|------|---------|-----|
| genre | ディレクトリ名をそのまま使用 | `engineering` → "Engineering" |
| tutorial | `: ` 以降の文字列 | `tutorial-10: webフレームワーク...` → "webフレームワークLaravelの実践的に使いこなそう🛠️" |
| chapter | `: ` 以降の文字列 | `chapter-1: Laravelにおける認証` → "Laravelにおける認証" |
| section | 優先順位: (1) フロントマター `title` → (2) 本文の最初の `# 見出し` → (3) `_` 以降の文字列 | `10-1-1_LaravelFortifyとは.md` → "LaravelFortifyとは" |

### 表示順序（order）の抽出ルール

| 対象 | 抽出方法 | 例 |
|------|---------|-----|
| genre | 0（固定） | - |
| tutorial | `tutorial-<N>` の N | `tutorial-10` → order: 10 |
| chapter | `chapter-<N>` の N | `chapter-1` → order: 1 |
| section | `<T>-<C>-<S>` の S（末尾の数字） | `10-1-1` → order: 1, `10-1-2` → order: 2 |

### slug_path の生成ルール

URL に使用するスラグは、ディレクトリ名の `: ` より前の部分、セクション名の `_` より前の部分を使用します。

| 元のパス | slug_path |
|---------|-----------|
| `curriculums/engineering/` | `engineering` |
| `curriculums/engineering/tutorial-10: web.../` | `engineering/tutorial-10` |
| `curriculums/engineering/tutorial-10: .../chapter-1: .../` | `engineering/tutorial-10/chapter-1` |
| `curriculums/.../chapter-1: .../10-1-1_LaravelFortifyとは.md` | `engineering/tutorial-10/chapter-1/10-1-1` |

## 同期の仕組み

### 全量同期（冪等）

ワークフローは毎回 **全量同期** を行います。

- `curriculums/` 配下のすべてのディレクトリと `.md` ファイルを解析してペイロードを構築
- LMS の同期 API に全コンテンツを送信（`slug_path` をキーに UPSERT）
- ペイロードに含まれないが LMS に存在する `active` コンテンツは自動的に `archived` になる

つまり、教材リポジトリから `.md` ファイルやディレクトリを削除すると、次回の同期で LMS 側でもアーカイブされます。

### 同期タイミング

| トリガー | 説明 |
|---------|------|
| `main` ブランチへの Push | 自動実行 |
| GitHub Actions の手動実行 | `workflow_dispatch` で手動トリガー可能 |

## 運用

### 手動で同期を実行する（GitHub Actions）

1. 教材リポジトリの **Actions** タブを開く
2. 左メニューから **Sync Curriculum Contents** を選択
3. **Run workflow** ボタンをクリック
4. ブランチを `main` に指定して実行

### ローカル開発時の同期

GitHub Actions はクラウドで動作するため `localhost` にはアクセスできません。
ローカル開発時はプロジェクトに同梱されている専用スクリプトを使います。

**前提**: LMS の開発サーバーが起動していること（`npm run dev`）

```bash
# LMS リポジトリのルートで実行
node scripts/sync-contents-local.mjs <教材リポジトリのcurriculumsディレクトリへのパス>
```

**例:**
```bash
# 隣のディレクトリに教材リポジトリがある場合
node scripts/sync-contents-local.mjs ../my-curriculum-repo/curriculums
```

このスクリプトは以下のように動作します:
1. `lms-fe/.env.local` から `SYNC_API_KEY` を自動読み込み
2. 送信先はデフォルトで `http://localhost:3000`（`LMS_BASE_URL` 環境変数で変更可能）
3. GitHub Actions ワークフローと同じ解析ロジックで `curriculums/` を走査
4. ローカルの同期 API にリクエストを送信

```bash
# 送信先を変更する場合
LMS_BASE_URL=http://localhost:3001 node scripts/sync-contents-local.mjs ../curriculum-repo/curriculums
```

**出力例:**
```
📂 Scanning "/path/to/curriculums"...
📦 Found 42 content items.
   Genres: 1, Tutorials: 5, Chapters: 12, Sections: 24
🚀 Syncing to http://localhost:3000/api/admin/sync-curriculums...
✅ Sync completed!
   Created/Updated: 42
   Archived: 0
```

### トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| `API キーが無効です` | `SYNC_API_KEY` が未設定または不一致 | GitHub Secrets と LMS 環境変数の値を確認 |
| `Directory "curriculums" does not exist` | ディレクトリ名の typo | `curriculums/` が存在するか確認 |
| `No contents found` | `.md` ファイルが見つからない | 4階層構造（genre/tutorial/chapter/section.md）になっているか確認 |
| `Sync failed` | API 側のエラー | ログで API レスポンスを確認 |
| セクションのタイトルが期待通りでない | ファイル名にアンダースコアがない | `<数字>_<タイトル>.md` の命名規則に準拠しているか確認 |
