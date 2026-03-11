# 演習問題（Quiz）設定ガイド

本ドキュメントは、教材リポジトリに演習問題（クイズ）を追加し、LMS に同期するための手順を説明します。

## アーキテクチャ概要

```
教材リポジトリ (GitHub)
  │  exercises/ ディレクトリにクイズ JSON を作成
  │  main ブランチへ Push
  ▼
GitHub Actions (sync-contents.yml)
  │  curriculums/ と exercises/ を解析
  │  .md ファイル + クイズ JSON を収集
  ▼
POST /api/admin/sync-curriculums
  │  x-api-key 認証
  │  contents → contents テーブル
  │  quizzes  → quizzes テーブル (sync_quiz_data RPC)
  ▼
LMS (Supabase)
  │  active バージョンのクイズのみ公開
  ▼
受講生がブラウザでクイズを実施
```

クイズデータは教材コンテンツと同じ同期 API で一括送信されます。クイズのみの追加・更新でも教材と一緒に同期されるため、別の API 呼び出しは不要です。

## 教材リポジトリの構成

教材（`.md` ファイル）とクイズ（`.json` ファイル）はそれぞれ独立したトップレベルディレクトリで管理します。

- **`curriculums/`** — 教材コンテンツのみ（Markdown ファイル）
- **`exercises/`** — 演習問題のみ（クイズ JSON ファイル）

### 全体構成例

```
your-curriculum-repo/
├── .github/
│   └── workflows/
│       └── sync-contents.yml                          ← 同期ワークフロー
│
├── curriculums/                                       ← 教材コンテンツ（.md のみ）
│   ├── engineering/
│   │   ├── tutorial-1: プログラミング基礎/
│   │   │   ├── chapter-1: HTML・CSS入門/
│   │   │   │   ├── 1-1-1_HTMLの基本構造.md
│   │   │   │   ├── 1-1-2_CSSセレクタ.md
│   │   │   │   └── 1-1-3_レスポンシブデザイン.md
│   │   │   │
│   │   │   ├── chapter-2: JavaScript基礎/
│   │   │   │   ├── 1-2-1_変数とデータ型.md
│   │   │   │   └── 1-2-2_関数とスコープ.md
│   │   │   │
│   │   │   └── chapter-3: 開発ツール/
│   │   │       ├── 1-3-1_Gitの基本.md
│   │   │       └── 1-3-2_VSCodeの使い方.md
│   │   │
│   │   └── tutorial-10: webフレームワークLaravel.../
│   │       └── chapter-1: Laravelにおける認証/
│   │           ├── 10-1-1_LaravelFortifyとは.md
│   │           ├── 10-1-2_ログイン画面の実装.md
│   │           └── 10-1-3_メール認証.md
│   │
│   └── design/
│       └── tutorial-1: UI設計入門/
│           └── chapter-1: デザイン原則/
│               └── 1-1-1_色彩理論.md
│
└── exercises/                                         ← 演習問題（.json のみ）
    ├── engineering/                                    ← ジャンル
    │   ├── tutorial-1/                                ← チュートリアル（スラグのみ）
    │   │   ├── chapter-1/                             ← チャプター（スラグのみ）
    │   │   │   ├── 1-1-1.json                         ← セクション 1-1-1 のクイズ
    │   │   │   └── 1-1-2.json                         ← セクション 1-1-2 のクイズ
    │   │   │
    │   │   └── chapter-2/
    │   │       └── 1-2-1.json
    │   │
    │   └── tutorial-10/
    │       └── chapter-1/
    │           └── 10-1-1.json
    │
    └── design/
        └── tutorial-1/
            └── chapter-1/
                └── 1-1-1.json
```

### ディレクトリの違い

| | `curriculums/` | `exercises/` |
|--|----------------|--------------|
| 格納するもの | 教材 Markdown ファイル | クイズ JSON ファイル |
| ディレクトリ命名 | `tutorial-1: タイトル名` | `tutorial-1`（スラグのみ） |
| ファイル命名 | `1-1-1_HTMLの基本構造.md` | `1-1-1.json` |

> **ポイント**: `exercises/` のディレクトリ名にはタイトルは不要です（スラグのみ）。クイズ JSON 内に genre / tutorial / chapter / section を明示的に記述するため、ディレクトリ構造は人間がファイルを探しやすくするための整理用です。

### 配置パターン

| パターン | ファイル名 | 説明 |
|---------|-----------|------|
| セクションに1つのクイズ | `{section-slug}.json` | 最も一般的なパターン |
| 同一セクションに複数クイズ | `{section-slug}_{識別子}.json` | 1つのセクションに複数のクイズを紐づける場合。JSON 内の `slug` で識別 |
| クイズなし | （ファイルなし） | すべてのセクションにクイズが必須ではない |

**例:**

```
exercises/engineering/tutorial-1/chapter-1/
├── 1-1-1.json                   ← セクション 1-1-1 の単一クイズ
├── 1-1-2_basics.json            ← セクション 1-1-2 のクイズ（slug: basics）
└── 1-1-2_advanced.json          ← セクション 1-1-2 のクイズ（slug: advanced）
```

### クイズの追加手順

#### 1. 対象セクションのスラグを確認する

クイズを紐づけたいセクションの `.md` ファイル名からスラグを特定します。

```
curriculums/engineering/tutorial-1: .../chapter-1: .../
  └── 1-1-1_HTMLの基本構造.md
       ~~~~~
       ↑ これがセクションスラグ = "1-1-1"
```

#### 2. 所属するジャンル・チュートリアル・チャプターのスラグを確認する

```
curriculums/
└── engineering/                          ← genre = "engineering"
    └── tutorial-1: プログラミング基礎/    ← tutorial = "tutorial-1"
        └── chapter-1: HTML・CSS入門/     ← chapter = "chapter-1"
            └── 1-1-1_HTMLの基本構造.md   ← section = "1-1-1"
```

#### 3. `exercises/` 内に対応するディレクトリを作成する

ジャンル → チュートリアル → チャプターの順でディレクトリを作成します。ディレクトリ名はスラグのみ（タイトル不要）です。

```bash
mkdir -p exercises/engineering/tutorial-1/chapter-1
```

#### 4. クイズ JSON ファイルを作成する

```bash
cat > exercises/engineering/tutorial-1/chapter-1/1-1-1.json << 'EOF'
{
  "genre": "engineering",
  "tutorial": "tutorial-1",
  "chapter": "chapter-1",
  "section": "1-1-1",
  "slug": "html-basics",
  "title": "HTML基本構造 確認テスト",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "HTMLドキュメントのルート要素はどれですか？",
      "options": [
        { "id": "a", "text": "<html>" },
        { "id": "b", "text": "<head>" },
        { "id": "c", "text": "<body>" },
        { "id": "d", "text": "<div>" }
      ],
      "correct": "a",
      "explanation": "<html>要素はHTMLドキュメント全体を囲むルート要素です。"
    }
  ]
}
EOF
```

#### 5. コミットして Push する

```bash
git add exercises/engineering/tutorial-1/chapter-1/1-1-1.json
git commit -m "add: HTML基本構造の確認テスト"
git push origin main
```

Push すると GitHub Actions が自動で同期を実行します。管理画面でバージョンを承認すると受講生に公開されます。

## クイズ JSON ファイルの仕様

### ファイル命名規則

| パターン | 用途 | 例 |
|---------|------|-----|
| `{section-slug}.json` | セクションにクイズが1つの場合 | `1-1-1.json`, `10-1-1.json` |
| `{section-slug}_{識別子}.json` | 同一セクションに複数のクイズがある場合 | `1-1-2_basics.json`, `1-1-2_advanced.json` |

> **注意**: `exercises/` ディレクトリ内の `.json` ファイルがクイズとして認識されます。`.json` 以外のファイルはスキップされます。

### JSON スキーマ

```json
{
  "genre": "engineering",
  "tutorial": "tutorial-10",
  "chapter": "chapter-1",
  "section": "10-1-1",
  "slug": "fortify-basics",
  "title": "Laravel Fortify 確認テスト",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "Laravel Fortifyの主な役割はどれですか？",
      "options": [
        { "id": "a", "text": "データベースマイグレーション" },
        { "id": "b", "text": "認証バックエンドの実装" },
        { "id": "c", "text": "フロントエンドのUI構築" },
        { "id": "d", "text": "APIレート制限" }
      ],
      "correct": "b",
      "explanation": "Laravel FortifyはHeadlessな認証バックエンドパッケージで、ログイン・登録・パスワードリセットなどの認証機能を提供します。"
    },
    {
      "id": "q2",
      "type": "multiple",
      "text": "Fortifyが提供する認証機能はどれですか？（複数選択）",
      "options": [
        { "id": "a", "text": "ログイン" },
        { "id": "b", "text": "GraphQLクエリ" },
        { "id": "c", "text": "パスワードリセット" },
        { "id": "d", "text": "メール認証" }
      ],
      "correct": ["a", "c", "d"],
      "explanation": "Fortifyはログイン、パスワードリセット、メール認証などの認証機能を提供します。GraphQLは別パッケージの機能です。"
    }
  ]
}
```

### フィールド説明

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `genre` | `string` | Yes | ジャンルのスラグ（例: `engineering`）。教材リポジトリの第1階層ディレクトリ名 |
| `tutorial` | `string` | Yes | チュートリアルのスラグ（例: `tutorial-10`）。第2階層の `: ` 前の部分 |
| `chapter` | `string` | Yes | チャプターのスラグ（例: `chapter-1`）。第3階層の `: ` 前の部分 |
| `section` | `string` | Yes | セクションのスラグ（例: `10-1-1`）。`.md` ファイル名の `_` 前の部分 |
| `slug` | `string` | Yes | クイズの識別子（例: `fortify-basics`）。同一セクション内でユニーク。URL パラメータにも使用される |
| `title` | `string` | Yes | クイズのタイトル（UI に表示される） |
| `questions` | `array` | Yes | 問題の配列（1問以上） |
| `questions[].id` | `string` | Yes | 問題の一意ID（クイズ内で重複不可） |
| `questions[].type` | `"single"` \| `"multiple"` | Yes | `single`: 単一選択（Radio）、`multiple`: 複数選択（Checkbox） |
| `questions[].text` | `string` | Yes | 問題文 |
| `questions[].options` | `array` | Yes | 選択肢の配列（2つ以上） |
| `questions[].options[].id` | `string` | Yes | 選択肢の一意ID（問題内で重複不可） |
| `questions[].options[].text` | `string` | Yes | 選択肢のテキスト |
| `questions[].correct` | `string` \| `string[]` | Yes | 正解の選択肢ID。`single` の場合は文字列、`multiple` の場合は文字列の配列 |
| `questions[].explanation` | `string` | Yes | 解説テキスト（採点後に表示される） |

### 階層フィールドの対応関係

クイズ JSON の `genre`, `tutorial`, `chapter`, `section` は、教材リポジトリ（`curriculums/`）のディレクトリ構造・ファイル名のスラグと一致させます。

```
curriculums/
└── engineering/                              ← "genre": "engineering"
    └── tutorial-10: webフレームワーク.../     ← "tutorial": "tutorial-10"
        └── chapter-1: Laravelにおける認証/   ← "chapter": "chapter-1"
            └── 10-1-1_LaravelFortifyとは.md  ← "section": "10-1-1"

exercises/
└── engineering/tutorial-10/chapter-1/
    └── 10-1-1.json                           ← 上記セクションに紐づくクイズ
```

> **重要**: `genre`, `tutorial`, `chapter`, `section` の値はディレクトリ構造からの自動推定ではなく、JSON 内に明示的に記述します。紐づけ先の教材が正しいことをクイズ作成者が意図的に指定する設計です。

## 演習問題のナビゲーションと出題順序

### 「次の演習問題へ」ナビゲーション

受講生がクイズを採点した後、同じジャンル内に次のクイズがあれば「次の演習問題へ」ボタンが表示されます。これにより受講生はクイズ一覧に戻ることなく連続してクイズに取り組めます。

### 出題順序

同ジャンル内のクイズは以下の優先順位でソートされ、この順序で「次の演習問題へ」が決定されます。

```
1. tutorial（昇順）  例: tutorial-1 → tutorial-2 → tutorial-10
2. chapter （昇順）  例: chapter-1 → chapter-2 → chapter-3
3. section （昇順）  例: 1-1-1 → 1-1-2 → 1-2-1
4. slug    （昇順）  例: basics → advanced
```

**例: engineering ジャンルのクイズ順序**

| # | tutorial | chapter | section | slug | ナビゲーション |
|---|----------|---------|---------|------|---------------|
| 1 | tutorial-1 | chapter-1 | 1-1-1 | html-basics | → 次の演習問題へ |
| 2 | tutorial-1 | chapter-1 | 1-1-2 | css-basics | → 次のセクションの演習へ |
| 3 | tutorial-1 | chapter-2 | 1-2-1 | js-variables | → 次のチャプターの演習へ ⚠️ |
| 4 | tutorial-1 | chapter-3 | 1-3-1 | git-basics | → 次のチュートリアルの演習へ ⚠️ |
| 5 | tutorial-10 | chapter-1 | 10-1-1 | fortify-basics | （最後のクイズ → ボタンなし） |

### 境界を跨ぐ場合のボタン表示

| 次のクイズとの関係 | ボタンテキスト | 確認ダイアログ |
|------------------|--------------|--------------|
| 同じセクション内 | 次の演習問題へ | なし |
| 同じチャプター・別セクション | 次のセクションの演習へ | なし |
| 同じチュートリアル・別チャプター | 次のチャプターの演習へ | あり（確認を求める） |
| 別チュートリアル | 次のチュートリアルの演習へ | あり（確認を求める） |
| 次のクイズなし（最後） | ボタン非表示 | — |

> **問題作成者への注意**: チュートリアルやチャプターを跨ぐ場合は確認ダイアログが表示されるため、受講生にとってはやや大きな遷移になります。連続して取り組ませたいクイズ群は、できるだけ同じチャプター内にまとめることを推奨します。

### クイズ作成時のチェックリスト（順序に関して）

- [ ] 同ジャンル内の既存クイズの `tutorial`, `chapter`, `section` を確認し、意図した順序に並ぶか確認する
- [ ] 連続して解かせたいクイズが同チャプター内に収まっているか確認する
- [ ] `slug` の値がアルファベット順で意図した出題順になるか確認する（例: `basics` → `advanced` ではなく `01-basics` → `02-advanced` とナンバリングする方法もある）

## 同期手順

### 自動同期（GitHub Actions）

教材リポジトリの `main` ブランチに Push するだけで自動同期されます。追加設定は不要です。

既存の `sync-contents.yml` ワークフローが `curriculums/` 内の教材ファイルと `exercises/` 内のクイズ JSON ファイルを自動検出・同期します。

### ローカル開発時の同期

```bash
# LMS の開発サーバーを起動
cd lms-fe && npm run dev

# 別ターミナルで同期を実行
node scripts/sync-contents-local.mjs <教材リポジトリのルートディレクトリ>
```

> **注意**: ローカルスクリプトの引数はリポジトリのルートディレクトリ（`curriculums/` と `exercises/` の親ディレクトリ）を指定します。

**出力例:**
```
📂 Scanning "/path/to/your-curriculum-repo"...
📦 Found 42 content items.
   Genres: 1, Tutorials: 5, Chapters: 12, Sections: 24
🧩 Found 3 quiz file(s).
🔖 Commit hash: abc1234...
🚀 Syncing to http://localhost:3000/api/admin/sync-curriculums...
✅ Sync completed!
   Contents - Created/Updated: 42, Archived: 0
   Quizzes  - Created/Updated: 3, Archived: 0
```

## 受講生向けの動線

クイズが同期されると、受講生は以下の経路でクイズにアクセスできます。

### 1. セクションページからの導線

セクション詳細ページ（教材閲覧ページ）の読了ボタン付近に「演習問題に挑戦」ボタンが自動表示されます。クイズが紐づいていないセクションにはボタンは表示されません。

```
/contents/{tutorial}/{chapter}/{section}?genre={genre}
  └── 「演習問題に挑戦」ボタン（クイズが1つの場合）
  │     └── /contents/{tutorial}/{chapter}/{section}/quiz?genre={genre}&slug={slug}
  └── 「演習問題に挑戦（N件）」ボタン（複数クイズの場合）
        └── /contents/{tutorial}/{chapter}/{section}/quiz?genre={genre}
              └── クイズ選択UI → &slug={slug} で個別クイズへ
```

### 2. 教材一覧の「演習問題」タブ

教材一覧ページの「演習問題」タブに全クイズの一覧が表示されます。各クイズから直接クイズ解答ページに遷移できます。

```
/contents?tab=quizzes
  └── クイズ一覧
        └── /contents/{tutorial}/{chapter}/{section}/quiz?genre={genre}&slug={slug}
```

### 3. 採点後の「次の演習問題へ」ナビゲーション

クイズの採点結果画面から、次のクイズへ直接遷移できます。詳細は「演習問題のナビゲーションと出題順序」セクションを参照してください。

## 採点ルール

| ルール | 内容 |
|--------|------|
| 単一選択（single） | 選択した1つが正解と一致すれば正解 |
| 複数選択（multiple） | 選択したセットが正解セットと**完全一致**した場合のみ正解（部分点なし） |
| 選択肢の順番 | 出題ごとにランダムシャッフル |
| 合格ライン | なし（正答数と正答率のみ表示） |
| 再チャレンジ | 何度でも可能 |
| 履歴 | 全回答が `quiz_logs` テーブルに記録される |

## バージョン管理との連携

クイズは教材コンテンツと同じバージョン管理の仕組みを使います。

1. **Push** → `draft` バージョンとしてクイズデータが保存される
2. **管理画面で承認** → `active` に昇格し、受講生に公開される
3. **次の Push** → 既存の `draft` が上書きされる（`active` は影響なし）

つまり、クイズを追加・更新しても、管理画面で承認するまで受講生には表示されません。

## DB テーブル構造

### quizzes テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID | 主キー |
| `genre` | TEXT | ジャンル（例: `engineering`） |
| `tutorial` | TEXT | チュートリアル（例: `tutorial-10`） |
| `chapter` | TEXT | チャプター（例: `chapter-1`） |
| `section` | TEXT | セクション（例: `10-1-1`） |
| `slug` | TEXT | クイズ識別子（例: `fortify-basics`） |
| `title` | TEXT | クイズタイトル |
| `questions` | JSONB | 問題データ（上記 JSON スキーマの `questions` 配列） |
| `status` | TEXT | `active` / `archived` |
| `version_id` | UUID | コンテンツバージョンへの外部キー |
| `created_at` | TIMESTAMPTZ | 作成日時 |
| `updated_at` | TIMESTAMPTZ | 更新日時 |

**ユニーク制約**: `(genre, tutorial, chapter, section, slug, version_id)`

### quiz_logs テーブル

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID | 主キー |
| `user_id` | UUID | 回答者（auth.users への FK） |
| `quiz_id` | UUID | クイズ（quizzes への FK） |
| `score` | INTEGER | 正答数 |
| `total_questions` | INTEGER | 総問題数 |
| `answers` | JSONB | 各問の回答詳細 |
| `created_at` | TIMESTAMPTZ | 回答日時 |

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| クイズが同期されない | クイズファイルが `exercises/` ディレクトリ外にある | `exercises/{genre}/{tutorial}/{chapter}/` 配下に配置する |
| `Quiz file is missing required fields` | JSON に `genre`, `tutorial`, `chapter`, `section`, `slug`, `title`, `questions` のいずれかが不足 | ログに表示される不足フィールド名を確認して追加 |
| `Failed to parse quiz` | JSON 構文エラー | JSON バリデータでフォーマットを確認 |
| セクションページにボタンが表示されない | `section` フィールドが教材のスラグと不一致 | `.md` ファイル名のプレフィックス部分と `section` の値を一致させる |
| クイズが受講生に表示されない | バージョンが `draft` のまま | 管理画面でバージョンを承認して `active` に昇格 |
| `Quizzes - Created/Updated: 0` と表示される | `.json` ファイルが `exercises/` 配下にない | `exercises/{genre}/{tutorial}/{chapter}/` に配置する |
| 複数選択で部分正解なのに不正解になる | 仕様通り（完全一致方式） | 正解選択肢をすべて選択し、不正解選択肢を選択しない必要がある |
| `slug` の重複エラー | 同一セクション・バージョン内で `slug` が重複 | 各クイズの `slug` をセクション内でユニークにする |
| 「次の演習問題へ」が表示されない | 同ジャンル内で最後のクイズ | 仕様通り。次のクイズが存在しない場合はボタンは表示されない |
| 意図しない順序で「次の演習問題へ」が遷移する | `tutorial`, `chapter`, `section`, `slug` のソート順が意図と異なる | 各フィールドの値がアルファベット昇順で意図した順序になるか確認する |
