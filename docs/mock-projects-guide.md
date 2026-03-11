# 模擬案件（Mock Projects）管理ガイド

本ドキュメントは、GitHub リポジトリで管理される模擬案件データを LMS に同期する仕組みと、案件の作成・編集・削除の手順を説明します。

## アーキテクチャ概要

```
教材リポジトリ (GitHub)
  │  mock-projects/ ディレクトリに JSON ファイルを配置
  │  main ブランチへ Push
  ▼
GitHub Actions (sync-contents.yml)
  │  JSON ファイルを解析して mock_projects 配列を構築
  │  contents/quizzes と一緒に同期 API へ送信
  ▼
POST /api/admin/sync-curriculums
  │  x-api-key 認証
  │  sync_mock_project_data RPC で UPSERT
  ▼
LMS (Supabase mock_projects テーブル)
  │  ペイロードにない案件は status='archived' に論理削除
  ▼
受講生がブラウザで模擬案件を閲覧・着手・提出
```

模擬案件は教材（contents）・演習問題（quizzes）と同じ **Docs as Code** パターンを採用しています。案件データは GitHub リポジトリで JSON ファイルとして管理し、GitHub Actions で LMS に自動同期されます。

## JSON ファイルの構造

教材リポジトリの `mock-projects/` ディレクトリ配下に、ジャンル別サブディレクトリを作成し、案件ごとの JSON ファイルを配置します。`curriculums/` や `exercises/` と同じジャンル分割パターンです。

```
教材リポジトリ/
├── curriculums/          # 教材（既存）
│   ├── engineering/
│   └── design/
├── exercises/            # 演習問題（既存）
│   ├── engineering/
│   └── design/
└── mock-projects/        # 模擬案件
    ├── engineering/      # エンジニアリング系案件
    │   ├── laravel-api.json
    │   └── react-dashboard.json
    └── design/           # デザイン系案件
        └── figma-design-system.json
```

ジャンルサブディレクトリ名（`engineering` / `design`）は JSON 内の `genre` フィールドと一致させてください。

### JSON スキーマ

```json
{
  "slug": "laravel-api",
  "title": "Laravel REST API 開発",
  "description": "Laravelを使用してREST APIを開発する実践案件。認証、CRUD、テストの実装を行う。",
  "requirements": "## 要件\n\n### 1. ユーザー認証\n- Laravel Fortify を使用...\n\n### 2. CRUD API\n- /api/posts エンドポイント...",
  "evaluation_items": [
    {
      "id": "eval-001",
      "category": "バックエンド実装",
      "criteria": "ユーザー認証が正しく実装されている",
      "weight": 20
    },
    {
      "id": "eval-002",
      "category": "バックエンド実装",
      "criteria": "CRUD 操作が RESTful に設計されている",
      "weight": 30
    },
    {
      "id": "eval-003",
      "category": "テスト",
      "criteria": "ユニットテストが記述されている",
      "weight": 25
    },
    {
      "id": "eval-004",
      "category": "コード品質",
      "criteria": "コードが読みやすく整理されている",
      "weight": 25
    }
  ],
  "genre": "engineering",
  "order": 1,
  "status": "active"
}
```

### フィールド一覧

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `slug` | string | **必須** | 一意な識別子。URL にも使用される（例: `/projects/laravel-api`） |
| `title` | string | **必須** | 案件タイトル。一覧・詳細ページに表示される |
| `description` | string | 任意 | 概要文。一覧カードと詳細ページのヘッダーに表示される |
| `requirements` | string | 任意 | 要件全文（Markdown）。着手後「案件要件」タブに表示される。Lock 状態では非表示 |
| `evaluation_items` | array | 任意 | 採点項目。将来の採点機能で使用（現時点では格納のみ） |
| `genre` | string | **必須** | `"engineering"` または `"design"` のいずれか |
| `order` | number | **必須** | 一覧での表示順（昇順） |
| `status` | string | 任意 | `"active"`（デフォルト）または `"archived"` |

### evaluation_items の構造

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 評価項目の一意 ID |
| `category` | string | カテゴリ名（例: バックエンド実装、テスト） |
| `criteria` | string | 評価基準の説明 |
| `weight` | number | 配点（全項目の合計が 100 になるよう設計推奨） |

## 案件の作成

1. 教材リポジトリの `mock-projects/<genre>/` に新しい JSON ファイルを作成する
2. ジャンルに応じて `engineering/` または `design/` サブディレクトリに配置する
3. 上記スキーマに従ってフィールドを記述する（`genre` フィールドはディレクトリ名と一致させる）
4. `slug` は他の案件と重複しないようにする
5. `order` で一覧での表示順を指定する（既存案件の `order` を確認して調整）
6. `main` ブランチにプッシュする → GitHub Actions が自動同期

```bash
# 例: エンジニアリング系の新しい案件を作成して同期
cd my-curriculum-repo
cat > mock-projects/engineering/nextjs-blog.json << 'EOF'
{
  "slug": "nextjs-blog",
  "title": "Next.js ブログアプリ開発",
  "description": "Next.js App Router を使用してブログアプリを開発する実践案件。",
  "requirements": "## 要件\n\n1. 記事一覧ページ\n2. 記事詳細ページ\n3. Markdown レンダリング",
  "evaluation_items": [],
  "genre": "engineering",
  "order": 3,
  "status": "active"
}
EOF

git add mock-projects/engineering/nextjs-blog.json
git commit -m "Add Next.js blog mock project"
git push origin main
```

## 案件の編集

1. 既存の JSON ファイルを編集する
2. `slug` は変更しない（slug をキーとして UPSERT されるため、変更すると別案件として扱われる）
3. `main` にプッシュ → 自動同期で更新される

**注意**: 既に受講生が着手済みの案件でも、`title`、`description`、`requirements`、`evaluation_items` の編集は安全に反映されます。`assignment` や `submission` のデータには影響しません。

## 案件の削除（アーカイブ）

案件は**物理削除されません**。以下の2つの方法でアーカイブ（論理削除）されます。

### 方法 A: JSON ファイルを削除する（推奨）

`mock-projects/<genre>/` から JSON ファイルを削除してプッシュすると、同期 RPC が自動的に `status='archived'` に設定します。

```bash
git rm mock-projects/engineering/old-project.json
git commit -m "Archive old-project mock project"
git push origin main
```

### 方法 B: JSON 内の status を変更する

```json
{
  "slug": "old-project",
  "status": "archived",
  ...
}
```

### アーカイブ時の動作

- **着手済みの受講生**: 一覧に表示され、閲覧のみ可能（新規提出不可）
- **未着手の受講生**: 一覧に表示されない
- **採点中の提出がある場合**: 採点プロセスは中断されず完了まで継続

## ジャンルとフィルタリング

案件は `genre` フィールドで分類されます。

| genre | 対象 |
|---|---|
| `engineering` | エンジニアリング系の案件（API 開発、フロントエンド等） |
| `design` | デザイン系の案件（UI デザイン、デザインシステム等） |

受講生は一覧ページのジャンルドロップダウンでフィルタリングできます。未指定時はプロファイルの `default_genre` がフォールバック値として使用されます。

## ローカル開発での同期

開発時は GitHub Actions を経由せずにローカルで同期テストが可能です。

```bash
# LMS の開発サーバーを起動しておく
cd i-field/lms-fe && npm run dev

# 別ターミナルで同期スクリプトを実行
cd i-field
node scripts/sync-contents-local.mjs ../my-curriculum-repo
```

**前提条件:**

- `lms-fe/.env.local` に `SYNC_API_KEY` が設定されていること
- 教材リポジトリに `mock-projects/engineering/` および `mock-projects/design/` ディレクトリが存在すること

**注意**: 現在のローカル同期スクリプト（`sync-contents-local.mjs`）は `curriculums/` と `exercises/` のみを走査しています。`mock-projects/` の収集ロジックを追加する必要があります（後述の「TODO」参照）。

## 同期 API の直接呼び出し（curl）

デバッグやテスト時に API を直接呼び出すことも可能です。

```bash
curl -X POST http://localhost:3000/api/admin/sync-curriculums \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_SYNC_API_KEY" \
  -d '{
    "contents": [
      {
        "slug_path": "engineering",
        "title": "Engineering",
        "genre": "engineering",
        "tutorial": "engineering",
        "content_type": "genre"
      }
    ],
    "mock_projects": [
      {
        "slug": "test-project",
        "title": "テスト案件",
        "description": "テスト用の案件です",
        "requirements": "## 要件\n\n1. テスト要件",
        "genre": "engineering",
        "order": 1,
        "status": "active"
      }
    ],
    "commit_hash": "abc123"
  }'
```

**注意**: `contents` 配列は必須（最低1件）。`mock_projects` は任意フィールドです。

## 排他制御と受講生フロー

案件管理者が知っておくべき受講生側の制約:

| ルール | 説明 |
|---|---|
| **1案件制限** | 受講生は同時に1案件のみ着手可能。直近 submission が `graded` になると次の案件に着手できる |
| **rejected での継続** | `rejected` は着手中を解除しない。再提出 → `graded` が必要 |
| **grading 中の提出制限** | `grading` 中は同一案件への再提出も不可 |
| **ブロック解除** | Super Admin が任意の submission を `graded` に手動変更することで、長期ブロック状態を解除可能 |

## TODO（未実装）

以下は現時点で未実装の項目です:

1. **Super Admin 向け採点 UI**: 採点機能とスキルレポートは次回スコープ
2. **Super Admin 向け archive 警告 UI**: 着手済みユーザー数の表示

## データベーステーブル参照

```
mock_projects         - 案件マスタ（同期 API で管理）
project_assignments   - 受講生の着手記録（user_id + project_id のユニーク制約）
project_submissions   - 成果物提出（GitHub URL + ステータス）
project_tasks         - カンバンタスク（受講生が自由に管理）
```
