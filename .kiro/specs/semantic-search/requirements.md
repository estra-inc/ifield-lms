# Requirements Document

## Project Description (Input)
semantic-search: PostgreSQL pg_trgm を使用した教材あいまい検索機能。ヘッダーの検索バーから教材コンテンツをキーワードで検索し、関連セクションに直接ナビゲーションできる。

## Introduction

本ドキュメントは、LMS教材の検索機能に関する要件を定義する。ユーザーがキーワードで教材を検索し、関連するセクションへ直接ナビゲーションできる体験を提供する。検索UIはCmd+K / Ctrl+KのキーボードショートカットでCommand Palette風のモーダルを開く形式とする。バックエンドではPostgreSQL pg_trgm（トライグラム）拡張によるあいまい一致検索と重み付けスコアリングを活用する。外部API依存なし・完全無料で運用可能。

## 技術方針

### 採用技術: PostgreSQL pg_trgm
- PostgreSQL組み込みのトライグラム検索拡張
- タイトル（高重み）と本文（低重み）の複合スコアリング
- GINインデックスによる高速検索
- 外部API不要、Supabase内で完結

### 不採用とした技術
- **OpenAI Embedding + pgvector**: APIコスト発生（月額は微小だが外部依存が増える）
- **ローカルEmbeddingモデル**: Vercelサーバーレスのコールドスタート問題（3-5秒）、モデルサイズ制約
- **クライアントサイドEmbedding**: 初回モデルロード30-100MB、低スペック端末での動作懸念

### 将来の拡張パス
pg_trgmで精度不足を感じた場合、検索API層のみ差し替えてOpenAI EmbeddingやローカルEmbeddingに移行可能。UIやフロント設計は変更不要。

---

## Requirements

### Requirement 1: 検索インデックスの設定

**Objective:** システム運用者として、教材コンテンツに対してpg_trgmベースの検索インデックスが設定されることで、高速なあいまい検索が可能になる。

#### Acceptance Criteria
1. The LMSシステム shall PostgreSQLにpg_trgm拡張を有効化する（`CREATE EXTENSION IF NOT EXISTS pg_trgm`）。
2. The LMSシステム shall contentsテーブルのtitleカラムにGINインデックス（pg_trgm用）を作成する。
3. The LMSシステム shall contentsテーブルのbodyカラムにGINインデックス（pg_trgm用）を作成する。
4. The LMSシステム shall 検索対象をcontent_type='section'かつactiveバージョンのコンテンツに限定する。
5. When コンテンツ同期によって教材が作成・更新・削除された場合, the LMSシステム shall pg_trgmインデックスが自動的に更新される（PostgreSQLの標準動作）。

---

### Requirement 2: 検索UIの表示とインタラクション

**Objective:** User（受講生）として、ヘッダーの検索バーやキーボードショートカットから素早く検索モーダルを開き、キーワードで教材を検索したい。それにより、目的の教材セクションに最短経路でたどり着ける。

#### Acceptance Criteria
1. The LMSシステム shall ヘッダーに検索バートリガーコンポーネントを表示する。
2. The LMSシステム shall 検索バーにキーボードショートカット（⌘K / Ctrl+K）のヒントバッジを表示する。
3. When ユーザーがヘッダーの検索バーをクリックした場合, the LMSシステム shall Command Palette風の検索モーダルをオーバーレイ表示する。
4. When ユーザーがCmd+K（macOS）またはCtrl+K（Windows/Linux）を押下した場合, the LMSシステム shall 検索モーダルをオーバーレイ表示する。
5. When 検索モーダルが開いた場合, the LMSシステム shall テキスト入力フィールドに自動的にフォーカスを移動する。
6. When 検索モーダルが開いた状態でユーザーがEscキーを押下した場合, the LMSシステム shall 検索モーダルを閉じる。
7. When 検索モーダルが開いた状態でユーザーがモーダル外の背景領域をクリックした場合, the LMSシステム shall 検索モーダルを閉じる。
8. The LMSシステム shall 検索モーダルのフッターにキーボード操作ヒント（↑↓ ナビゲーション、Enter 選択、Esc 閉じる）を表示する。

---

### Requirement 3: 検索の実行

**Objective:** User（受講生）として、検索モーダルにキーワードを入力すると、タイトルや本文にあいまい一致する教材セクションが一覧表示される。それにより、完全一致でなくても目的のコンテンツを見つけることができる。

#### Acceptance Criteria
1. When ユーザーが検索モーダルのテキスト入力フィールドに2文字以上の検索クエリを入力した場合, the LMSシステム shall 300msのデバウンス後にpg_trgmによるあいまい検索を実行する。
2. The LMSシステム shall タイトル一致を高重み（×3）、本文一致を低重み（×1）として複合スコアを算出し、スコアの降順で結果を返却する。
3. The LMSシステム shall 検索結果を最大5件まで表示する。
4. The LMSシステム shall 検索対象をcontent_type='section'かつactiveバージョンのコンテンツに限定する。
5. While 検索クエリが空、空白文字のみ、または1文字の場合, the LMSシステム shall 検索を実行せず、初期状態（プレースホルダーメッセージ）を表示する。
6. While 検索が実行中の場合, the LMSシステム shall ローディングインジケーター（スケルトンUI）を表示する。
7. When 検索結果が0件だった場合, the LMSシステム shall 「検索結果が見つかりませんでした」旨のメッセージと再検索の案内を表示する。
8. If 検索APIへのリクエストが失敗した場合, the LMSシステム shall エラーメッセージを表示する。

---

### Requirement 4: 検索結果の表示

**Objective:** User（受講生）として、検索結果からコンテンツのタイトルや所属パス（ジャンル > チュートリアル > チャプター）が一目で分かるようにしたい。それにより、目的のセクションを正確に識別できる。

#### Acceptance Criteria
1. The LMSシステム shall 各検索結果にコンテンツのタイトル（title）を表示する。
2. The LMSシステム shall 各検索結果にコンテンツの階層パスをパンくず形式（例: Engineering › プログラミング基礎 › JavaScript入門）で表示する。
3. The LMSシステム shall 各検索結果にコンテンツ本文の冒頭100文字をスニペットとして表示する。
4. The LMSシステム shall 各検索結果にファイルアイコンを表示する。
5. The LMSシステム shall 各検索結果にスコアをカラーバッジで表示する（高スコア=緑、中スコア=黄）。
6. When キーボードの上下矢印キーが押下された場合, the LMSシステム shall 検索結果リスト内のフォーカスを上下に移動し、フォーカスされた項目をハイライト表示する。
7. When フォーカスされた検索結果がある状態でEnterキーが押下された場合, the LMSシステム shall フォーカスされた検索結果のコンテンツページに遷移する。

---

### Requirement 5: 検索結果からのナビゲーション

**Objective:** User（受講生）として、検索結果をクリックまたはキーボードで選択すると、該当するコンテンツページに直接遷移できる。それにより、検索から閲覧までの動線がシームレスになる。

#### Acceptance Criteria
1. When ユーザーが検索結果の項目をクリックした場合, the LMSシステム shall 該当コンテンツのセクションページ（`/contents/{tutorial}/{chapter}/{section}?genre={genre}`）に遷移する。
2. When コンテンツページへの遷移が完了した場合, the LMSシステム shall 検索モーダルを閉じる。
3. The LMSシステム shall 遷移先URLにgenreクエリパラメータを含め、ジャンルコンテキストを維持する。

---

### Requirement 6: 検索API

**Objective:** フロントエンドから検索クエリを受け取り、pg_trgmによるあいまい検索を実行して結果を返却するAPIエンドポイントを提供する。

#### Acceptance Criteria
1. The LMSシステム shall 検索用のNext.js API Routeエンドポイント（`/api/search`）を提供する。
2. When 認証済みユーザーが検索APIにリクエストを送信した場合, the LMSシステム shall pg_trgmのsimilarity関数を使用してタイトル・本文のあいまい検索を実行し、重み付けスコアとともに結果を返却する。
3. The LMSシステム shall 検索結果にコンテンツのID、タイトル、階層パス情報（genre, tutorial, chapter, section）、本文冒頭100文字（snippet）、スコアを含める。
4. If 認証されていないユーザーが検索APIにアクセスした場合, the LMSシステム shall 401 Unauthorizedを返却する。
5. If 検索クエリが空または1文字の場合, the LMSシステム shall 400 Bad Requestを返却する。
6. The LMSシステム shall 検索APIのレスポンスを200ms以内に返却する（pg_trgm + GINインデックスによる高速検索）。

---

### Requirement 7: セキュリティとアクセス制御

**Objective:** 検索機能がLMSの既存のアクセス制御モデルに準拠し、権限のないユーザーにコンテンツが漏洩しないことを保証する。

#### Acceptance Criteria
1. The LMSシステム shall 検索APIへのアクセスを認証済みユーザーに限定する。
2. The LMSシステム shall 検索結果にstatusがactiveのバージョンに属するコンテンツのみを含める。
3. While ユーザーの受講期間（graduation_date）が過去日の場合, the LMSシステム shall 検索機能へのアクセスを制限する（既存のMiddlewareによるアクセス制御に準拠）。
4. The LMSシステム shall 検索クエリに対してSQLインジェクション対策を実施する（パラメータ化クエリの使用）。

---

### Requirement 8: パフォーマンス

**Objective:** 検索がユーザーにとって快適なレスポンス速度で動作すること。

#### Acceptance Criteria
1. The LMSシステム shall contentsテーブルのtitle, bodyカラムにGIN (gin_trgm_ops) インデックスを設定する。
2. The LMSシステム shall 検索APIのレスポンスを200ms以内で返却する。
3. The LMSシステム shall pg_trgmのsimilarity閾値を設定し、関連度の低い結果を除外する（閾値未満の場合でも最低1件は返却する）。

---

## 設計決定事項サマリー

以下は要件定義時に検討し、確定した設計判断の一覧。

| 項目 | 決定 | 理由 |
|---|---|---|
| 検索エンジン | pg_trgm（トライグラム） | 無料、外部依存なし、日本語と相性良好 |
| 検索対象 | content_type='section' のみ | セクション直接遷移が目的。tutorial/chapterは除外 |
| スコアリング | title×3 + body×1 の重み付け | タイトル一致を優先しつつ本文も考慮 |
| 最大表示件数 | 5件 | Command Palette UIに最適 |
| 類似度閾値 | あり + 最低1件保証 | 低品質除外 + 空振り防止 |
| デバウンス | 300ms | リアルタイムフィードバック |
| 最小文字数 | 2文字 | 日本語の最小意味単位に合致 |
| スニペット | 本文冒頭100文字 | 判断補助、低実装コスト |
| スコア表示 | カラーバッジ表示 | エンジニア向けLMS、視覚的に関連度を示す |
| ナビゲーション | セクションページ先頭に遷移 | シンプル、section単位検索のため |
| API実装 | Next.js API Route | 既存アーキテクチャと統一 |
| レート制限 | なし | 社内利用、受講生のみ |
| 目標レスポンス | 200ms以内 | pg_trgm + GINインデックスで容易に達成 |
| インデックス | GIN (gin_trgm_ops) | pg_trgm標準のインデックス方式 |
| キャッシュ | なし | 外部API呼び出しがないため不要 |
