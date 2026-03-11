# Requirements Document

## Project Description (Input)
模擬案件（Mock Projects）機能。受講生向けの模擬案件一覧閲覧、案件詳細の確認（Lock/Unlock）、成果物（GitHub URL）の提出フローを提供する。案件マスタはGitHubからJSON形式で同期される。着手ボタン押下で要件が開示され、GitHub URLを提出できる。排他制御として、受講生は同時に1案件のみ着手可能（直近submissionがgradedで終了）。詳細ページはタブ構成（案件要件/タスク管理/成果物提出/提出履歴）。タスク管理はカンバンボード形式。ジャンルフィルタリング対応。今回のスコープは受講生側の閲覧・提出フローに限定し、採点・スキルレポートは次回以降とする。

## Introduction

本仕様書は、LMS（社内研修学習管理システム）における「模擬案件（Mock Projects）」機能のうち、受講生（User）側の閲覧・提出フローに関する要件を定義する。

### スコープ

**対象:**
- 模擬案件一覧ページ（ジャンルフィルタリング対応）
- 模擬案件詳細ページ（Lock/Unlock状態管理、タブ構成）
- 着手（Start）操作
- 成果物（GitHub URL）提出
- 排他制御（1案件制限 + 採点中の提出制限）
- タスク管理（カンバンボード）
- ターム自動移行（基礎 -> 実践）
- 模擬案件データの同期（既存API統合）

**対象外（次回以降のスコープ）:**
- Super Admin向け採点機能（手動graded変更権限を除く）
- スキルレポート閲覧機能
- Super Admin向けarchive警告UI（着手済みユーザー数の表示）

### 設計決定事項

以下はTBDとして議論し確定した設計判断の一覧。各Requirementの受入基準に反映済み。

| ID | 決定 | 備考 |
|---|---|---|
| TBD-1-1 | タイトル + 概要 + 着手状況を表示 | project_assignments/submissionsとJOINして導出 |
| TBD-1-2 | orderキーを持たせてキー順 | mock_projectsにorder列を定義 |
| TBD-1-3 | ジャンルドロップダウン | mock_projectsにgenre追加、GenreSelectパターン |
| TBD-2-1 | 初回着手時のみ確認ダイアログ | current_term === '基礎' の場合にターム移行警告を含む確認ダイアログ表示 |
| TBD-2-2 | タイトル + 概要（description）を表示 | mock_projectsにdescriptionカラムを追加 |
| TBD-4-1 | トースト通知 | 着手完了後に「実践タームに移行しました」トースト表示 |
| TBD-5-1 | 詳細ページに留まる + トースト | 提出完了後は同じ詳細ページで提出状態セクションが更新される。成功トーストも表示 |
| TBD-5-2 | 常に再提出可能 | grading中でなければ新submissionレコードを作成可能。合格/不合格ステータスは持たない |
| TBD-5-3 | 形式チェックのみ | `https://github.com/` で始まる正規表現バリデーション |
| TBD-6-1 | ユーザー横断で制限 | いずれかの案件でgrading中なら全案件で提出不可 |
| TBD-6-2 | 二重防御（フロント非活性 + サーバー409） | ページロード時チェック + API層ガードの併用 |
| TBD-6-3 | 1案件ずつ順にこなすフロー | graded で次の着手可能、rejected は解除しない |
| TBD-6-4 | Super Admin手動graded権限 | 長期rejected異常系のブロック解除用 |
| TBD-7-1 | 全件リスト + 5件ページネーション | 詳細ページ内に提出履歴を全件表示、5件/ページ |
| TBD-7-2 | 4状態: submitted / grading / graded / rejected | 合否ステータスは持たない。得点の高低はステータスと無関係。採点機能実装時に再度見直し |
| TBD-7-3 | startedのみ | assignmentsは着手記録のみ。提出状態はsubmissions側で管理 |
| TBD-9-1 | 既存API（/api/admin/sync-curriculums）に統合 | contents/quizzesと同じエンドポイントでmock_projectsも処理 |
| TBD-9-2 | 着手済みは閲覧のみ+提出不可 | grading中の提出は採点プロセス継続。着手済み未提出も提出不可。次回スコープでarchive前の警告UI追加 |
| TBD-10-1 | 4タブ構成 | 案件要件 / タスク管理 / 成果物提出 / 提出履歴 |
| TBD-11-1 | 4カラムカンバン | バックログ / ToDo / 進行中 / 完了 |
| TBD-11-2 | 受講生 + Super Admin 編集可能 | Managerは編集不可 |
| 追加 | mock_projectsにversion_idを追加 | contentsテーブルと同じくcontent_versionsでバージョン管理 |

### データモデル補足

**mock_projects テーブル（確定カラム）:**
- `id`, `slug`, `title`, `description`（概要）, `requirements`（要件全文）, `evaluation_items`（jsonb）, `genre`（'engineering' | 'design'）, `order`（並び順キー）, `status`（active/archived）, `version_id`（content_versionsへのFK）, `created_at`, `updated_at`

**project_assignments テーブル:**
- `id`, `user_id`, `project_id`（mock_projectsへのFK）, `status`（startedのみ）, `created_at`

**project_submissions テーブル:**
- `id`, `assignment_id`（project_assignmentsへのFK）, `github_url`, `status`（submitted/grading/graded/rejected）, `score`（採点スコア）, `result_data`（jsonb、採点詳細）, `created_at`, `updated_at`

**project_tasks テーブル（新規）:**
- `id`, `assignment_id`（project_assignmentsへのFK）, `title`（必須）, `description`（任意）, `status`（backlog/todo/in_progress/done）, `order`（並び順）, `created_by`（usersへのFK）, `created_at`, `updated_at`

## Requirements

### Requirement 1: 模擬案件一覧表示

**Objective:** 受講生として、模擬案件の一覧を確認したい。利用可能な案件を把握し、取り組む案件を選択できるようにするため。

#### Acceptance Criteria

1. When 受講生が模擬案件一覧ページにアクセスする, the LMS shall activeステータスの全模擬案件をorder列の昇順でリスト表示する
2. The LMS shall 各案件のタイトル、概要（description）、および受講生自身の着手状況（未着手/着手済み/提出済み/採点中/採点完了/差し戻し）をバッジで表示する
3. The LMS shall 着手状況をproject_assignmentsおよびproject_submissionsから導出する（未着手 = assignment未作成、着手済み = assignment有+submission無、それ以降 = 直近submissionのステータスに準拠）
4. When 受講生が一覧の案件をクリックする, the LMS shall 該当案件の詳細ページへ遷移する
5. While 模擬案件が存在しない状態, the LMS shall 案件が登録されていない旨の空状態メッセージを表示する
6. While 案件がarchivedかつ受講生が着手済みである場合, the LMS shall 当該案件を一覧に表示する（閲覧のみ可能であることを示す）
7. While 案件がarchivedかつ受講生が未着手である場合, the LMS shall 当該案件を一覧に表示しない
8. The LMS shall ジャンルドロップダウン（GenreSelect）を表示し、engineering/designでフィルタリングを可能にする
9. The LMS shall URL searchParams `?genre=` でフィルタ状態を管理し、未指定時は `profiles.default_genre` をフォールバック値として使用する
10. The LMS shall 各カードにdescription（概要文）をタイトル下に表示する

---

### Requirement 2: 模擬案件詳細 - Lock状態

**Objective:** 受講生として、未着手の案件詳細を確認したい。案件のタイトルと概要を確認し、着手するかどうかを判断できるようにするため。

#### Acceptance Criteria

1. While 受講生がその案件に未着手の状態, when 案件詳細ページにアクセスする, the LMS shall 案件タイトルと概要（description）を表示し、要件（requirements）は非表示にする
2. While 案件がLock状態, the LMS shall 「着手する」ボタンをアクティブな状態で表示する
3. While 案件がLock状態, the LMS shall GitHub URL提出フォームを表示しない
4. While 受講生のcurrent_termが「基礎」の状態, when 「着手する」ボタンを押下する, the LMS shall 確認ダイアログを表示し、ターム移行（基礎→実践）が発生する旨を警告する
5. While 受講生のcurrent_termが既に「実践」の状態, when 「着手する」ボタンを押下する, the LMS shall 確認ダイアログなしで即座に着手処理を実行する
6. While 他の案件が進行中（受講生の直近submissionがgradedでない案件が存在する）の場合, the LMS shall 「着手する」ボタンを非活性にし「他の案件が進行中のため着手できません」の警告を表示する
7. While 案件がLock状態, the LMS shall タブバーを表示しない

---

### Requirement 3: 模擬案件詳細 - Unlock状態（着手操作）

**Objective:** 受講生として、案件に着手して要件を確認したい。案件の要件全文を閲覧し、成果物の作成に取り掛かれるようにするため。

#### Acceptance Criteria

1. When 受講生がLock状態の案件で「着手する」ボタンを押下する（確認ダイアログがある場合は承認後）, the LMS shall project_assignmentsテーブルにstatus='started'で該当ユーザーと案件の紐付けレコードを作成する
2. When 着手操作が完了する, the LMS shall タブ構成の詳細ページを表示し、案件要件タブをデフォルトで表示する
3. When 着手操作が完了する, the LMS shall 「成果物提出」タブ内にGitHub URL提出フォームを表示する
4. While 受講生が既に着手済みの案件, when 案件詳細ページに再アクセスする, the LMS shall タブ構成の詳細ページを表示する（Unlock状態を維持する）
5. If 着手操作中にサーバーエラーが発生する, the LMS shall エラーメッセージを表示し、Lock状態を維持する

---

### Requirement 4: ターム自動移行

**Objective:** 受講生として、模擬案件に着手した際にタームが自動的に実践に移行してほしい。手動でのターム変更操作を不要とし、学習フローをシームレスにするため。

#### Acceptance Criteria

1. When 受講生が任意の模擬案件の「着手する」ボタンを押下する and 受講生のcurrent_termが「基礎」である, the LMS shall 受講生のcurrent_termを「実践」に自動更新する
2. When 受講生のcurrent_termが既に「実践」である, the LMS shall ターム更新処理をスキップし、着手処理のみを実行する
3. The LMS shall ターム移行とproject_assignmentsの作成を同一トランザクション内で処理する
4. When ターム移行が発生した場合, the LMS shall 「実践タームに移行しました」のトースト通知を表示する

---

### Requirement 5: 成果物提出（GitHub URL）

**Objective:** 受講生として、模擬案件の成果物としてGitHubリポジトリのURLを提出したい。完成した成果物を評価に回せるようにするため。

#### Acceptance Criteria

1. While 案件がUnlock状態かつarchivedでない, the LMS shall 「成果物提出」タブ内にGitHub URLの入力フィールドと「提出する」ボタンを表示する
2. While 案件がUnlock状態かつarchivedである, the LMS shall 提出フォームを非表示にし「この案件はアーカイブされたため提出できません」のメッセージを表示する
3. When 受講生がGitHub URLを入力して「提出する」ボタンを押下する, the LMS shall project_submissionsテーブルにstatus='submitted'で提出レコードを作成する
4. When 提出が成功する, the LMS shall 同じ詳細ページに留まり、提出状態セクションを更新し、成功トーストを表示する
5. The LMS shall 入力されたURLが `https://github.com/` で始まる有効な形式であることを正規表現でバリデーションする
6. If 無効なURL形式が入力される, the LMS shall バリデーションエラーメッセージを表示し、提出を受け付けない
7. If 提出処理中にサーバーエラーが発生する, the LMS shall エラーメッセージを表示し、再試行を促す
8. The LMS shall grading中でなければ同一案件への再提出を常に受け付ける（新しいsubmissionレコードを作成する）

---

### Requirement 6: 排他制御（1案件制限 + 採点中の提出制限）

**Objective:** 受講生として、システムの整合性が保たれた状態で案件の着手・提出操作を行いたい。1案件ずつ順にこなすフローにより、学習の集中と評価プロセスの混乱を防ぐため。

#### Acceptance Criteria

1. The LMS shall 受講生は同時に1案件のみ着手可能とする
2. The LMS shall 案件の着手中状態を、直近submissionが `graded` になることで終了とする
3. While 受講生の直近submissionが `rejected` の状態, the LMS shall 着手中状態を解除しない（再提出→graded が必要）
4. While 受講生が提出のない（着手のみ）案件を持つ状態, the LMS shall 当該案件を着手中として扱う
5. While 受講生が着手中の案件で `grading` 状態のsubmissionを持つ状態, the LMS shall 同一案件への再提出も不可とする
6. The LMS shall 排他制御を二重防御で実装する（フロントエンド側のボタン非活性 + サーバーサイドのHTTP 409エラー）
7. The LMS shall Super Adminが任意のsubmissionを `graded` に手動変更可能とする（長期rejected等の異常系のブロック解除用）

---

### Requirement 7: 提出状態の表示

**Objective:** 受講生として、自分の提出状態を確認したい。案件ごとの進行状況を把握できるようにするため。

#### Acceptance Criteria

1. While 案件がUnlock状態, the LMS shall 「提出履歴」タブ内に提出履歴を表示し、過去の全提出を5件ごとのページネーション付きリストで表示する
2. The LMS shall 各提出について、ステータスバッジ（submitted/grading/graded/rejected）、GitHub URL、提出日時を表示する
3. While 提出が存在しない場合, the LMS shall 「まだ提出がありません」の空状態メッセージを表示する

#### ステータス定義

**project_submissions.status（4状態）:**

| ステータス | 意味 | 遷移元 |
|-----------|------|--------|
| `submitted` | 提出済み（採点待ち） | 初期状態 |
| `grading` | 採点中 | submitted |
| `graded` | 採点完了（正常に採点が完了。得点の高低はステータスと無関係） | grading |
| `rejected` | 差し戻し（再提出要求） | grading |

> **注意:** 合格/不合格のステータスは持たない。採点結果の良否はscoreおよびresult_dataで判断する。ステータスはあくまで「採点プロセスの進行状態」を表す。本定義は採点機能実装時に再度見直す。

**project_assignments.status:**
- `started` のみ。着手記録としてのみ使用し、提出状態の管理はproject_submissions側で行う。

---

### Requirement 8: アクセス制御とセキュリティ

**Objective:** 受講生として、認証済みの状態でのみ模擬案件にアクセスしたい。未認証ユーザーによる不正アクセスを防止し、データの安全性を確保するため。

#### Acceptance Criteria

1. If 未認証ユーザーが模擬案件ページにアクセスする, the LMS shall ログインページにリダイレクトする
2. The LMS shall mock_projects、project_assignments、project_submissions、project_tasksテーブルにSupabase RLSを適用する
3. The LMS shall 受講生が自身のproject_assignments、project_submissions、project_tasksのみを参照・作成できるようRLSポリシーを設定する
4. While 受講期間が終了している（graduation_dateを過ぎている）状態, when 受講生が模擬案件ページにアクセスする, the LMS shall ダッシュボードにリダイレクトする（Hard Stop）
5. The LMS shall Managerロールのユーザーがmock_projectsテーブルにアクセスできないようRLSで制御する

---

### Requirement 9: 模擬案件データの同期

**Objective:** システムとして、GitHubで管理される模擬案件マスタデータをLMSに同期したい。コンテンツ管理のDocs as Codeアーキテクチャを維持しつつ、受講生に最新の案件を提供するため。

#### Acceptance Criteria

1. The LMS shall mock_projectsテーブルにGitHubから同期された案件データ（slug, title, description, requirements, evaluation_items, genre, order, status）を格納する
2. The LMS shall mock_projectsテーブルにversion_idカラムを持ち、content_versionsテーブルと同じバージョン管理アーキテクチャを適用する
3. When 既存の同期API（`/api/admin/sync-curriculums`）が模擬案件データを含むペイロードを受信する, the LMS shall 既存案件の更新（UPSERT）および新規案件の作成を行う
4. When 同期元リポジトリから案件が削除される, the LMS shall 該当案件のstatusを'archived'に設定する（論理削除）
5. While 案件がarchivedかつ受講生が着手済みの場合, the LMS shall 案件の閲覧は許可するが新規提出は受け付けない
6. While 案件がarchivedかつgrading中の提出が存在する場合, the LMS shall 採点プロセスを中断せず完了まで継続させる（archiveは進行中の評価に影響しない）
7. While 案件がarchivedかつ受講生が未着手の場合, the LMS shall 一覧から当該案件を非表示にする
8. The LMS shall 同期データに `genre` フィールドを含め、mock_projectsテーブルに格納する

---

### Requirement 10: 詳細ページタブ構成

**Objective:** 受講生として、案件の詳細情報を整理されたタブ構成で閲覧したい。案件要件、タスク管理、成果物提出、提出履歴をそれぞれ独立した画面で操作できるようにするため。

#### Acceptance Criteria

1. While 案件がUnlock状態, the LMS shall 詳細ページに4つのタブ（案件要件 / タスク管理 / 成果物提出 / 提出履歴）を表示する
2. The LMS shall URL searchParams `?tab=` でアクティブタブを管理し、デフォルトは「案件要件」タブとする
3. While 案件がLock状態, the LMS shall タブバーを表示しない
4. When 受講生がタブを切り替える, the LMS shall URL searchParamsを更新し、対応するタブコンテンツを表示する

---

### Requirement 11: タスク管理（カンバンボード）

**Objective:** 受講生として、模擬案件の作業をタスクに分解して管理したい。カンバンボード形式で進捗を可視化し、計画的に案件に取り組めるようにするため。

#### Acceptance Criteria

1. While 案件がUnlock状態, the LMS shall 「タスク管理」タブ内に4カラム（バックログ / ToDo / 進行中 / 完了）のカンバンボードを表示する
2. The LMS shall 受講生およびSuper Adminがタスクの作成・編集・削除を可能とする（Managerロールは編集不可）
3. The LMS shall 各タスクにタイトル（必須）と説明（任意）を持たせる
4. The LMS shall ドラッグ&ドロップまたはステータス変更によりタスクをカラム間で移動可能とする
5. The LMS shall タスク状態をsubmission状態と独立させる（タスクが未完了でも成果物の提出は可能）
6. While 案件がLock状態, the LMS shall タスク管理タブを非表示にする
