# 要件定義書: 演習問題（Quiz）

## はじめに

本仕様は、LMS（社内研修学習管理システム）における「演習問題（Quiz）」機能の要件を定義する。

教材セクションに紐づく演習問題（選択式・複数選択式）をGitHubからJSON形式で同期し、受講生が教材学習後にクイズを実施できるようにする。即座に自動採点・結果表示を行い、`quiz_logs`テーブルに履歴を記録する。何度でも再チャレンジ可能。

本機能のスコープは以下の通り:
- **クイズデータの同期**: GitHubリポジトリから演習問題JSONを既存の同期APIで取り込む
- **クイズ出題・回答UI**: セクションに紐づく演習問題の出題画面と回答インターフェース
- **即時自動採点・結果表示**: クライアントサイドでの即時採点とフィードバック表示（選択肢ランダムシャッフル対応）
- **履歴管理**: `quiz_logs`テーブルへの回答履歴の記録と過去の成績閲覧
- **導線**: セクションページからの直接遷移 + 教材一覧「演習問題」タブの両方

**スコープ外**: 記述式問題、制限時間、合格ラインによるコンテンツロック、Super Admin向けクイズ管理画面（将来検討）。

### 仕様決定事項

要件検討で確定した仕様判断を以下に記録する。

| # | 項目 | 決定 |
|---|------|------|
| Q1 | クイズの紐づき単位 | セクション単位（1セクション = 0〜N クイズ）。クイズJSON側で `genre`, `tutorial`, `chapter`, `section`, `slug` を指定。同一セクションに複数クイズ可 |
| Q2 | 問題形式 | 単一選択（Radio）と複数選択（Checkbox）の2種類 |
| Q3 | 採点タイミング | 全問回答後に一括送信 → 即時採点（クライアントサイド判定） |
| Q4 | 再チャレンジ | 何度でも可能。最新スコアと過去の全履歴を保持 |
| Q5 | 同期方法 | 既存の同期API（`POST /api/admin/sync-curriculums`）を拡張してクイズJSONも同期 |
| Q6 | バージョン管理 | `contents`テーブルと同様に`version_id`で管理。active バージョンのクイズのみ受講生に公開 |
| Q7 | 複数選択の採点方式 | 完全一致のみ正解（全選択肢が一致して初めて正解） |
| Q8 | 正解の表示タイミング | 全問送信後に一括で正解/不正解 + 解説を表示 |
| Q9 | 合格ライン | 設定なし（スコアのみ表示、何度でもチャレンジ可）。将来追加可能 |
| Q10 | クイズへの導線 | セクションページからの直接遷移 + 教材一覧「演習問題」タブの両方 |
| Q11 | 選択肢のシャッフル | 出題ごとに選択肢の順番をランダムにシャッフル |
| Q12 | GitHubクイズJSONスキーマ | 下記「確定クイズJSONスキーマ」の通り |

### 確定クイズJSONスキーマ

GitHubリポジトリ上のクイズファイル配置例:
```
curriculums/
└── {ジャンル}/
    └── {チュートリアル}/
        └── {チャプター}/
            ├── 01_intro.md
            ├── 02_basics.md
            └── _quiz.json    ← チャプター内に配置。section フィールドで所属セクションを指定
```

確定JSONスキーマ:
```json
{
  "genre": "engineering",
  "tutorial": "tutorial-1",
  "chapter": "chapter-1",
  "section": "1-1-1",
  "slug": "js-basics",
  "title": "JavaScript基礎 確認テスト",
  "questions": [
    {
      "id": "q1",
      "type": "single",
      "text": "JavaScriptで変数を宣言するキーワードはどれですか？",
      "options": [
        { "id": "a", "text": "var" },
        { "id": "b", "text": "let" },
        { "id": "c", "text": "const" },
        { "id": "d", "text": "上記すべて" }
      ],
      "correct": "d",
      "explanation": "var, let, const はいずれもJavaScriptで変数を宣言するために使用できます。"
    },
    {
      "id": "q2",
      "type": "multiple",
      "text": "次のうち、JavaScriptのプリミティブ型はどれですか？（複数選択）",
      "options": [
        { "id": "a", "text": "string" },
        { "id": "b", "text": "array" },
        { "id": "c", "text": "number" },
        { "id": "d", "text": "boolean" }
      ],
      "correct": ["a", "c", "d"],
      "explanation": "string, number, boolean はプリミティブ型です。array はオブジェクト型です。"
    }
  ]
}
```

> **注記**: クイズJSONには `genre`, `tutorial`, `chapter`, `section` の全階層を明示的に指定する（ディレクトリ構造からの自動推定は行わない）。1チャプターに複数セクションのクイズがある場合、`_quiz.json` ではなく `_quiz_{section-slug}.json`（例: `_quiz_1-1-1.json`）として配置する。

---

## 要件

### 1. クイズデータの同期

**目的:** System として、GitHub ActionsからPush時に演習問題データを教材コンテンツと一緒に自動同期できること。それにより、コンテンツ管理者がGitHubでクイズを管理し、LMSに反映できる。

#### 受け入れ基準

1. The LMS shall 既存の同期API（`POST /api/admin/sync-curriculums`）でクイズデータも受け取れるようにペイロードを拡張する
2. When 同期APIがクイズデータを含むリクエストを受信した時, the LMS shall `quizzes`テーブルにクイズデータをUPSERTする
3. The LMS shall クイズデータを`quizzes`テーブルの`questions`カラム（JSONB型）に格納する
4. The LMS shall クイズを`version_id`で管理し、`contents`テーブルと同じバージョン管理の仕組みを適用する
5. The LMS shall クイズをセクション単位で紐づける（`genre`, `tutorial`, `chapter`, `section` カラムで識別）
6. The LMS shall クイズJSONの`section`フィールドから所属セクションを特定し、`quizzes.section`カラムに格納する
7. When リポジトリからクイズファイルが削除された場合, the LMS shall 該当クイズの`status`を`archived`に更新する

### 2. クイズデータベーススキーマ

**目的:** System として、クイズデータと回答履歴を適切なテーブル構造で永続化すること。それにより、データの整合性を保ちながら効率的なクエリが可能になる。

#### 受け入れ基準

1. The LMS shall `quizzes`テーブルを以下のカラムで作成する: `id`(UUID), `genre`(TEXT), `tutorial`(TEXT), `chapter`(TEXT), `section`(TEXT), `slug`(TEXT), `title`(TEXT), `questions`(JSONB), `status`(TEXT), `version_id`(UUID), `created_at`, `updated_at`
2. The LMS shall `quiz_logs`テーブルを以下のカラムで作成する: `id`(UUID), `user_id`(UUID), `quiz_id`(UUID), `score`(INTEGER), `total_questions`(INTEGER), `answers`(JSONB), `created_at`
3. The LMS shall `quizzes`テーブルに`(genre, tutorial, chapter, section, slug, version_id)`のユニーク制約を適用する
4. The LMS shall `quiz_logs`テーブルの`user_id`に`auth.users`への外部キー制約を、`quiz_id`に`quizzes`への外部キー制約を適用する
5. The LMS shall `quizzes`テーブルにRLS（Row Level Security）を適用し、User・Super Adminロールのみactive版のSELECTを許可する（Managerロールはアクセス不可）
6. The LMS shall `quiz_logs`テーブルにRLSを適用し、Userは自身のレコードのみSELECT/INSERT可能とする

### 3. クイズ出題・回答UI

**目的:** User（受講生）として、教材セクションに紐づく演習問題を解答できるUIを利用すること。それにより、学習内容の理解度を自己確認できる。

#### 受け入れ基準

1. The LMS shall セクション詳細ページの読了ボタン付近に「演習問題に挑戦」ボタンを配置する（クイズが存在するセクションのみ）
2. When ユーザーが「演習問題に挑戦」ボタンをクリックした時, the LMS shall クイズ解答ページ（`/contents/{tutorial}/{chapter}/{section}/quiz?genre={genre}`）に遷移する
3. The LMS shall 教材一覧ページの「演習問題」タブで全クイズの一覧を表示し、各クイズからクイズ解答ページに遷移できるようにする
4. The LMS shall クイズ解答ページに設問文、選択肢（単一選択: Radio、複数選択: Checkbox）、および「回答を送信」ボタンを表示する
5. The LMS shall 単一選択問題（`type: "single"`）ではRadioボタンで1つのみ選択可能とする
6. The LMS shall 複数選択問題（`type: "multiple"`）ではCheckboxで複数選択可能とし、問題文に「（複数選択）」と明示する
7. The LMS shall 出題時に選択肢の順番をランダムにシャッフルする（同一クイズでも実施ごとに異なる順序）
8. The LMS shall 全問に回答するまで「回答を送信」ボタンをdisabled状態にする
9. The LMS shall 設問番号（Q1, Q2, ...）を各設問に表示する
10. While ユーザーの受講期間が終了している場合, the LMS shall クイズページへのアクセスをブロックしダッシュボードへリダイレクトする（既存Middleware活用）

### 4. 即時採点・結果表示

**目的:** User（受講生）として、回答送信後に即座に採点結果とフィードバックを確認できること。それにより、自分の理解度を把握し、弱点を把握して復習できる。

#### 受け入れ基準

1. When ユーザーが「回答を送信」ボタンをクリックした時, the LMS shall クライアントサイドで即時に採点を行い、全問の結果を一括で表示する
2. The LMS shall 複数選択問題の採点は完全一致方式とする（ユーザーの選択が正解セットと完全に一致した場合のみ正解）
3. The LMS shall 採点結果として正答数/総問題数（例: 8/10）と正答率（例: 80%）を表示する
4. The LMS shall 各設問について正解/不正解をハイライトで視覚的に表示する（正解: 緑、不正解: 赤）
5. The LMS shall 不正解の設問では正しい選択肢を明示する
6. The LMS shall 各設問の解説テキスト（`explanation`）を採点後に表示する
7. The LMS shall 採点結果画面に「もう一度挑戦する」ボタンと「セクションに戻る」ボタンを表示する
8. When ユーザーが「もう一度挑戦する」ボタンをクリックした時, the LMS shall 回答をリセットして出題画面に戻る（選択肢は再シャッフルされる）

### 5. 回答履歴の保存と閲覧

**目的:** User（受講生）として、過去のクイズ回答履歴を閲覧できること。それにより、学習の進捗と成長を振り返ることができる。

#### 受け入れ基準

1. When 採点が完了した時, the LMS shall `quiz_logs`テーブルに回答データ（ユーザーID、クイズID、スコア、総問題数、各問の回答内容、合否）を記録する
2. The LMS shall 回答履歴をServer Action経由でサーバーサイドに保存する
3. The LMS shall セクション詳細ページで当該クイズの最新スコアを表示する（履歴がある場合）
4. The LMS shall クイズ解答ページの上部に過去の挑戦回数と最高スコアを表示する（履歴がある場合）
5. The LMS shall 教材一覧ページの「演習問題」タブで、全クイズの一覧と最新スコアを表示する

### 6. アクセス制御

**目的:** System として、ロールベースのアクセス制御をクイズ関連テーブルに適用すること。それにより、権限のないユーザーによるクイズデータへのアクセスを防止できる。

#### 受け入れ基準

1. The LMS shall `quizzes`テーブルにRLSを有効化し、User・Super Adminロールのみactive版のSELECTを許可する
2. The LMS shall Managerロールに対して`quizzes`テーブルのSELECT権限を拒否する（contentsテーブルと同様のポリシー）
3. The LMS shall `quiz_logs`テーブルにRLSを有効化し、UserロールはSELECTとINSERTを自身のレコードのみに制限する
4. The LMS shall Super Adminに対して`quiz_logs`テーブルの全レコードSELECTを許可する（将来の管理画面用）
5. The LMS shall クイズ同期はAdmin Client（RLSバイパス）を使用して実行する

### 7. UI共通要件

**目的:** 全ユーザーとして、クイズ関連ページで一貫したUI体験を得たい。それにより、直感的で使いやすい操作が可能になる。

#### 受け入れ基準

1. The LMS shall App Shell（サイドバー・ヘッダー）内のレイアウトとしてクイズページを表示する
2. The LMS shall デザインシステム（`designs/design-system.pen`）のデザイントークンに準拠したスタイルを適用する
3. While クイズデータ読み込み中, the LMS shall ローディング状態（Skeleton UI）を表示する
4. The LMS shall クイズ解答ページはClient Componentとして実装し、回答状態をクライアントサイドで管理する
5. The LMS shall パンくずリストでクイズページの位置を表示する（教材 > チュートリアル > チャプター > セクション > 演習問題）

---

## トレーサビリティマトリクス

| 要件ID | PRDセクション | 根拠 |
|--------|-------------|------|
| 1 (クイズデータ同期) | SS4.3 Docs as Code、SS6.2 quizzes テーブル | GitHub ActionsからのJSON同期。既存同期APIの拡張 |
| 2 (DBスキーマ) | SS6.2 quizzes/quiz_logs テーブル | PRD定義のテーブル構造。version_id による管理追加 |
| 3 (出題・回答UI) | SS4.4 演習問題 (Quiz) 実施、SS5 サイトマップ | 教材一覧→詳細→演習問題の画面遷移 |
| 4 (即時採点・結果表示) | SS4.4 演習問題 (Quiz) 実施 | 自動採点と結果フィードバック |
| 5 (回答履歴) | SS6.2 quiz_logs テーブル | 実施履歴の記録と閲覧 |
| 6 (アクセス制御) | SS7 権限分離、SS3 RBAC | RLS適用、Manager権限剥奪 |
| 7 (UI共通要件) | SS5 サイトマップ、steering/tech.md | App Shell統合、デザインシステム準拠 |
