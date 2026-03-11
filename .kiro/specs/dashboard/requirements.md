# Requirements Document

## Introduction
ダッシュボード（`/dashboard`）の開発。User（受講生）向けに学習状況を一目で把握できるサマリーページを提供する。既存データ（content_progress, daily_reports, monthly_goals, weekly_goals, project_assignments, project_submissions, coaching_sessions, coaching_credits）を集約して表示する閲覧専用ページ。Manager / Super Admin 向けのダッシュボードは作成しない（既存の管理画面で業務が完結しているため）。`graduation_date`（受講期限）は運用上使用していないため、期限関連の表示は対象外。

---

## Requirements

### Requirement 1: ロールベースダッシュボード分岐
**Objective:** As a ユーザー（全ロール共通）, I want ログイン後のダッシュボードで自分に適した情報を見たい, so that 必要な情報に即座にアクセスできる

#### Acceptance Criteria
1. When User が `/dashboard` にアクセスした時, the ダッシュボードページ shall 学習サマリーダッシュボードを表示する
2. When Manager が `/dashboard` にアクセスした時, the ダッシュボードページ shall `/users`（受講生一覧）にリダイレクトする
3. When Super Admin が `/dashboard` にアクセスした時, the ダッシュボードページ shall `/admin/grading`（未採点一覧）にリダイレクトする
4. The ダッシュボードページ shall 全セクションを閲覧専用（データの作成・更新操作なし）で表示する

---

### Requirement 2: 学習進捗サマリー（目標達成率）
**Objective:** As a User（受講生）, I want 今月・今週の学習目標に対する達成率を確認したい, so that 学習ペースを把握できる

#### Acceptance Criteria
1. The User ダッシュボード shall 今月の学習目標達成率を表示する（`daily_reports.actual_hours` の当月合計 / `monthly_goals.target_hours`）
2. The User ダッシュボード shall 今週の学習目標達成率を表示する（`daily_reports.actual_hours` の当週合計 / `weekly_goals.target_hours`）
3. The User ダッシュボード shall 達成率をプログレスバーまたはパーセンテージで視覚的に表示する
4. If 月次目標が未設定の場合, the User ダッシュボード shall 目標達成率セクションに「目標未設定」と表示し、`/daily-reports` への設定リンクを提示する
5. If 週次目標が未設定の場合, the User ダッシュボード shall 週次達成率セクションに「目標未設定」と表示し、`/daily-reports` への設定リンクを提示する

---

### Requirement 3: 学習進捗サマリー（教材完了率）
**Objective:** As a User（受講生）, I want 教材の完了状況をチュートリアル単位で確認したい, so that どのチュートリアルが未完了か把握できる

#### Acceptance Criteria
1. The User ダッシュボード shall ユーザーの `default_genre` に対応するチュートリアル一覧を取得し、各チュートリアルの完了率を表示する
2. The User ダッシュボード shall 各チュートリアルの完了率を `content_progress` の完了セクション数 / 該当チュートリアルの全セクション数 で算出する
3. The User ダッシュボード shall 各チュートリアルの完了率をプログレスバーで表示する（チュートリアル名 + 完了率）
4. When ユーザーがチュートリアル名をクリックした時, the ダッシュボード shall `/contents/{genre}/{tutorial}` に遷移する
5. If 該当ジャンルに教材が存在しない場合, the User ダッシュボード shall 「教材なし」と表示する

---

### Requirement 4: 今日の日報
**Objective:** As a User（受講生）, I want 今日の日報の入力状況を確認したい, so that 日報入力の漏れを防げる

#### Acceptance Criteria
1. The User ダッシュボード shall 今日の日報が入力済みかどうかを判定する（`daily_reports` に `report_date = today` のレコードがあるか）
2. While 今日の日報が入力済みの場合, the User ダッシュボード shall 本日の学習時間と内容のサマリーを表示する
3. While 今日の日報が未入力の場合, the User ダッシュボード shall 「今日の日報を入力しましょう」のCTAを表示し、`/daily-reports` へのリンクを提示する
4. When ユーザーが日報セクションのリンクをクリックした時, the ダッシュボード shall `/daily-reports` ページに遷移する

---

### Requirement 5: コーチング情報
**Objective:** As a User（受講生）, I want 次回のコーチングセッション情報とクレジット残高を確認したい, so that 予約状況を把握できる

#### Acceptance Criteria
1. The User ダッシュボード shall コーチングクレジットの残高を表示する（`coaching_credits` の `amount` 合計）
2. While `coaching_sessions` に `status = 'scheduled'` かつ `session_date` が未来のセッションが存在する間, the User ダッシュボード shall 直近の次回セッションの日付・時間・ジャンルを表示する
3. If 予約済みセッションが存在しない場合, the User ダッシュボード shall 「予約なし」と表示し、`/coaching` へのリンクを提示する
4. When ユーザーがコーチングセクションのリンクをクリックした時, the ダッシュボード shall `/coaching` ページに遷移する

---

### Requirement 6: 模擬案件ステータス
**Objective:** As a User（受講生）, I want 進行中および直近完了の模擬案件のステータスを確認したい, so that 提出・再提出のタイミングを把握できる

#### Acceptance Criteria
1. The User ダッシュボード shall 進行中（着手済みかつ未完了）の模擬案件を表示する
2. The User ダッシュボード shall 直近の完了済み案件（最新3件まで）を表示する
3. The User ダッシュボード shall 各案件のタイトル・ステータス（着手中/提出済み/採点中/採点完了/差し戻し）を表示する
4. When ユーザーが案件名をクリックした時, the ダッシュボード shall `/projects/{slug}` に遷移する
5. If 着手済みの案件が存在しない場合, the User ダッシュボード shall 「進行中の案件なし」と表示し、`/projects` へのリンクを提示する

---

### Requirement 7: アカウント無効化時のバナー表示
**Objective:** As a 無効化された User（受講生）, I want 自分のアカウントが無効化されていることを認識したい, so that 状況を把握し管理者に連絡できる

#### Acceptance Criteria
1. While ユーザーのアカウントが無効化（deactivated）されている間, the ダッシュボード shall 画面上部に「アカウントが無効化されています。詳細は管理者にお問い合わせください。」のバナーを表示する
2. While ユーザーが無効化状態の間, the ダッシュボード shall ダッシュボードのデータ表示は通常通り行う（過去データの閲覧は可能）

---

## 対象外（スコープ外）

- Manager 向けダッシュボード（既存の `/users` ページで業務完結）
- Super Admin 向けダッシュボード（既存の `/admin/grading`, `/admin/users` で業務完結）
- `graduation_date`（受講期限）関連の表示（運用上未使用）
- 日報入力モーダル（`/daily-reports` ページへのリンクで代替）
- データの作成・更新操作（「いいね」含む）
