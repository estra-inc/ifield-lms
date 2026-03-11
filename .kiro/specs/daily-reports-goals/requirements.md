# 要件定義書: 日報・学習目標

## はじめに

本仕様は、社内LMSにおける日報・学習目標管理機能を定義する。受講生（User）が日々の学習時間と内容を記録し、月次・週次の学習目標を設定する機能、および Manager が日報に「いいね」リアクションを行うモチベーション管理機能を対象範囲とする。Super Admin は全ユーザーの日報を閲覧できる。

対象テーブル: `daily_reports`、`monthly_goals`、`weekly_goals`。全テーブルに Supabase RLS を適用する。

**スコープ外**: ダッシュボード上の進捗サマリーウィジェット（ダッシュボード仕様で扱う）、コーチング予約、教材閲覧、模擬案件。

## 要件

### 1. 日報入力・編集・削除

**目的:** User（受講生）として、日々の学習時間と学習内容を記録・修正・削除したい。それにより、学習の習慣化と振り返りが可能になる。

#### 受け入れ基準

1. The Daily Reports Module shall 日報入力フォームに学習時間（`actual_hours`、数値）と学習内容（`content`、テキスト）の入力フィールドを提供する
2. The Daily Reports Module shall 日報入力フォームに対象日付の選択フィールドを提供する
3. When User が日報入力フォームを送信した際, the Daily Reports Module shall `daily_reports` テーブルに新しいレコードを作成する
4. The Daily Reports Module shall 1日に複数回の日報入力を許可する（同一日に複数レコードを作成できる）
5. The Daily Reports Module shall 過去の日付を対象日として選択し日報を入力することを許可する
6. When User が日報入力フォームを送信した際, the Daily Reports Module shall 学習時間が 0 より大きい正の数値であることをバリデーションする
7. When User が日報入力フォームを送信した際, the Daily Reports Module shall 学習内容が空でないことをバリデーションする
8. When User が日報入力フォームを送信した際, the Daily Reports Module shall 対象日付が未来の日付でないことをバリデーションする
9. If 日報の保存中にサーバーエラーが発生した場合, then the Daily Reports Module shall ユーザーにエラーメッセージを表示し、再送信を可能にする
10. While 日報送信処理中, the Daily Reports Module shall 送信ボタンをローディング状態にし、二重送信を防止する
11. The Daily Reports Module shall User に対して自身の日報を編集できるダイアログを提供する（学習時間・学習内容・対象日付を変更可能）
12. When User が日報を編集した際, the Daily Reports Module shall 所有者（`user_id`）が本人であることをサーバーサイドで検証したうえで更新する
13. The Daily Reports Module shall User に対して自身の日報を削除できる機能を提供する（確認ダイアログ付き）
14. When User が日報を削除した際, the Daily Reports Module shall 所有者（`user_id`）が本人であることをサーバーサイドで検証したうえで削除する

### 2. 日報閲覧（User）

**目的:** User（受講生）として、自分が入力した日報の履歴を閲覧したい。それにより、学習の振り返りや進捗の確認ができる。

#### 受け入れ基準

1. The Daily Reports Module shall User に対して自身の日報一覧を日付の降順で表示する
2. The Daily Reports Module shall 各日報エントリに対象日付、学習時間、学習内容、Manager からの「いいね」状態を表示する
3. The Daily Reports Module shall 同一日に複数の日報がある場合、日ごとの合計学習時間（SUM）を表示する
4. The Daily Reports Module shall User に対して他ユーザーの日報を表示しない
5. Where 日報に Manager からの「いいね」がある場合, the Daily Reports Module shall 「いいね」を受けたことを視覚的に示す表示を行う

### 3. 月次学習目標設定

**目的:** User（受講生）として、月ごとの学習目標時間を設定したい。それにより、計画的な学習ペースを維持できる。

#### 受け入れ基準

1. The Daily Reports Module shall User に対して月次目標時間（`target_hours`）の入力フィールドを提供する
2. The Daily Reports Module shall 月次目標の対象月（`year_month`）をドロップダウンセレクターで指定できる機能を提供する
3. When User が月次目標を設定した際, the Daily Reports Module shall `monthly_goals` テーブルに対象月のレコードを作成する
4. When 既に対象月の月次目標が存在する場合に User が目標を設定した際, the Daily Reports Module shall 既存のレコードを更新する（UPSERT 動作）
5. When User が月次目標を設定した際, the Daily Reports Module shall 目標時間が 0 より大きい正の数値であることをバリデーションする
6. The Daily Reports Module shall 現在の月次目標時間と、その月の日報の合計学習時間を並べて表示する
7. The Daily Reports Module shall 月次目標に対する達成率（%）を計算して表示する
8. The Daily Reports Module shall 月セレクターの選択肢をアカウント作成月から今月+12ヶ月先までの範囲で提供する
9. When User が今月以外の月を表示している場合, the Daily Reports Module shall 「今月」ボタンを表示し、現在月に即座に戻れるようにする
10. When User が月を切り替えた際, the Daily Reports Module shall URL パラメータ（`month`）を更新し、他のパラメータ（`week` 等）を保持する

### 4. 週次学習目標設定

**目的:** User（受講生）として、週ごとの学習目標時間を設定したい。それにより、週単位での学習計画と進捗管理ができる。

#### 受け入れ基準

1. The Daily Reports Module shall User に対して週次目標時間（`target_hours`）の入力フィールドを提供する
2. The Daily Reports Module shall 週次目標の対象期間（`start_date`、`end_date`）をドロップダウンセレクターで指定できる機能を提供する（UI が月曜〜日曜の期間を保証するため、サーバーサイドでの曜日バリデーションは不要）
3. When User が週次目標を設定した際, the Daily Reports Module shall `weekly_goals` テーブルに対象週のレコードを作成する
4. When 既に対象週の週次目標が存在する場合に User が目標を設定した際, the Daily Reports Module shall 既存のレコードを更新する（UPSERT 動作）
5. When User が週次目標を設定した際, the Daily Reports Module shall 目標時間が 0 より大きい正の数値であることをバリデーションする
6. The Daily Reports Module shall 現在の週次目標時間と、その週の日報の合計学習時間を並べて表示する
7. The Daily Reports Module shall 週次目標に対する達成率（%）を計算して表示する
8. The Daily Reports Module shall 週セレクターの選択肢をアカウント作成週から今週+12週先までの範囲で提供する
9. When User が今週以外の週を表示している場合, the Daily Reports Module shall 「今週」ボタンを表示し、現在週に即座に戻れるようにする
10. When User が週を切り替えた際, the Daily Reports Module shall URL パラメータ（`week`）を更新し、他のパラメータ（`month` 等）を保持する
11. When 選択中の週に目標が未設定の場合, the Daily Reports Module shall 前週の目標時間を入力フィールドのデフォルト値として表示する
12. When 選択中の週が属する月に月次目標が設定されている場合, the Daily Reports Module shall 月次目標から算出した参考週次目標時間（月次目標 × 7 / 月の日数）を表示する

### 5. 日報リアクション（Manager）

**目的:** Manager として、受講生の日報に「いいね」リアクションを行いたい。それにより、受講生のモチベーションを高め、学習の継続を支援できる。

#### 受け入れ基準

1. The Daily Reports Module shall Manager に対して担当ユーザーの日報フィードを表示する
2. The Daily Reports Module shall 各日報エントリに「いいね」ボタンを表示する（Manager のみ）
3. When Manager が「いいね」ボタンを押下した際, the Daily Reports Module shall `daily_reports` テーブルの `liked_by_manager` を `true` に更新する
4. When Manager が「いいね」済みの日報に対して再度ボタンを押下した際, the Daily Reports Module shall 「いいね」を取り消し `liked_by_manager` を `false` に更新する（トグル動作）
5. The Daily Reports Module shall Manager に対して「いいね」の状態（済/未済）を視覚的に区別して表示する
6. The Daily Reports Module shall User に対して「いいね」ボタンを表示しない

### 6. 日報閲覧（Manager / Super Admin）

**目的:** Manager および Super Admin として、ユーザーの日報と進捗を閲覧したい。それにより、受講生の学習状況を把握し、適切なサポートを提供できる。

#### 受け入れ基準

1. The Daily Reports Module shall Manager に対してユーザーの日報一覧を日付の降順で表示する
2. The Daily Reports Module shall Super Admin に対して全ユーザーの日報一覧を日付の降順で表示する
3. The Daily Reports Module shall Manager / Super Admin に対してユーザーごとの月次目標・週次目標と実績の進捗状況を表示する
4. The Daily Reports Module shall Manager / Super Admin に対してユーザーごとの日次合計学習時間（SUM 集計）を表示する
5. The Daily Reports Module shall Manager / Super Admin に対してユーザー名で日報をフィルタリングする機能を提供する

### 7. アクセス制御（RLS）

**目的:** システムとして、日報・学習目標データに対するアクセスをロールに基づいて制御したい。それにより、データの機密性と整合性を保証できる。

#### 受け入れ基準

1. The Daily Reports Module shall `daily_reports` テーブルに RLS を有効化する
2. The Daily Reports Module shall `monthly_goals` テーブルに RLS を有効化する
3. The Daily Reports Module shall `weekly_goals` テーブルに RLS を有効化する
4. The Daily Reports Module shall User に対して自身の `daily_reports` レコードのみの SELECT / INSERT / UPDATE / DELETE を許可する RLS ポリシーを適用する
5. The Daily Reports Module shall User に対して自身の `monthly_goals` レコードのみの SELECT / INSERT / UPDATE を許可する RLS ポリシーを適用する
6. The Daily Reports Module shall User に対して自身の `weekly_goals` レコードのみの SELECT / INSERT / UPDATE を許可する RLS ポリシーを適用する
7. The Daily Reports Module shall Manager に対して全ユーザーの `daily_reports` レコードの SELECT を許可する RLS ポリシーを適用する
8. The Daily Reports Module shall Manager に対して `daily_reports` の `liked_by_manager` カラムの UPDATE を許可する RLS ポリシーを適用する
9. The Daily Reports Module shall Super Admin に対して全ユーザーの `daily_reports`、`monthly_goals`、`weekly_goals` レコードの SELECT を許可する RLS ポリシーを適用する
10. ~~The Daily Reports Module shall User に対して自身の `daily_reports` レコードの DELETE を許可しない~~ → **変更**: User は自身の `daily_reports` レコードの UPDATE / DELETE が許可される（要件 1.11-1.14 参照）

### 8. 学習進捗集計

**目的:** User として、自身の学習進捗をわかりやすく把握したい。それにより、目標達成に向けた学習ペースを調整できる。

#### 受け入れ基準

1. The Daily Reports Module shall 日次の合計学習時間を `daily_reports` の `actual_hours` の SUM で計算する
2. The Daily Reports Module shall 当月の合計学習時間を月次目標の達成率とともに表示する
3. The Daily Reports Module shall 当週の合計学習時間を週次目標の達成率とともに表示する
4. When 月次目標または週次目標が未設定の場合, the Daily Reports Module shall 目標未設定であることを表示し、目標設定を促すメッセージを表示する

### 9. 学習時間推移チャート

**目的:** User として、日々の学習時間の推移を視覚的に把握したい。それにより、学習ペースの変化を認識し、目標達成に向けた調整ができる。

#### 受け入れ基準

1. The Daily Reports Module shall 学習目標ページに月次/週次タブ切替の学習時間折れ線グラフを表示する
2. The Daily Reports Module shall 月次タブで選択月の各日の学習時間をプロットする
3. The Daily Reports Module shall 週次タブで選択週の各曜日の学習時間をプロットする
4. The Daily Reports Module shall チャート上に日次目標ライン（月次目標÷月の日数、または週次目標÷7）を破線で表示する
5. When 表示中の期間に目標が未設定の場合, the Daily Reports Module shall 直近の過去の目標にフォールバックして目標ラインを表示する
6. The Daily Reports Module shall 前後ナビゲーションボタンで月/週を切り替えられるようにする
7. The Daily Reports Module shall アカウント作成日より前の期間への「前へ」ナビゲーションを無効化する
8. When User が現在の期間以外を表示している場合, the Daily Reports Module shall 「今日」ボタンを表示し、現在期間に即座に戻れるようにする
9. The Daily Reports Module shall 今日の日付をハイライトして視覚的に区別する
10. The Daily Reports Module shall チャートの月/週ナビゲーションと目標カードの月/週選択を独立したURL パラメータ（`chartMonth`、`chartWeek`）で管理する

### 10. UI 共通要件

**目的:** 全ユーザーとして、日報・学習目標関連ページで一貫した UI 体験を得たい。それにより、直感的で使いやすい操作が可能になる。

#### 受け入れ基準

1. The Daily Reports Module shall App Shell（サイドバー・ヘッダー）内のレイアウトとして表示する
2. The Daily Reports Module shall フォーム送信に Next.js Server Actions を使用する
3. The Daily Reports Module shall 全フォームにおいてクライアントサイドバリデーションをリアルタイムで実行し、エラーメッセージをフィールド直下に表示する
4. The Daily Reports Module shall デザインシステム（`designs/design-system.pen`）のデザイントークンに準拠したスタイルを適用する
5. While データ読み込み中, the Daily Reports Module shall ローディング状態を表示する
6. The Daily Reports Module shall Server Components をデフォルトとし、インタラクティブな部分のみ Client Component として実装する

## トレーサビリティマトリクス

| 要件ID | PRDセクション | 根拠 |
|--------|-------------|------|
| 1 (日報入力・編集・削除) | SS4.5 日報・学習目標、SS6.1 daily_reports | 学習時間と内容を入力・編集・削除。1日複数回可、過去日入力可 |
| 2 (日報閲覧 User) | SS4.5、SS3 RBAC (User: 自身のデータのみ) | User は自身のデータのみ閲覧 |
| 3 (月次目標設定) | SS4.5 今月の目標時間、SS6.1 monthly_goals | 月セレクターによる任意月の目標設定と進捗表示。アカウント作成月〜12ヶ月先 |
| 4 (週次目標設定) | SS4.5 今週の目標時間、SS6.1 weekly_goals | 週セレクターによる任意週の目標設定と進捗表示。前週目標デフォルト値、月次目標からの参考値 |
| 5 (日報リアクション) | SS4.5 Manager日報リアクション、SS3 RBAC | Manager 専用の「いいね」機能 |
| 6 (日報閲覧 Manager/SA) | SS3 RBAC、SS5 サイトマップ | Manager / Super Admin のユーザー進捗閲覧 |
| 7 (アクセス制御 RLS) | SS7 権限分離 (RLS)、SS3 RBAC | 全テーブルに Supabase RLS 適用、ロール別アクセス制御。User の日報 UPDATE/DELETE を許可 |
| 8 (学習進捗集計) | SS4.5 日次 SUM 集計 | 日報の SUM 集計と目標達成率の表示 |
| 9 (学習時間推移チャート) | SS4.5 学習進捗の可視化 | 月次/週次の学習時間折れ線グラフ。目標ライン、期間ナビゲーション、今日ハイライト |
| 10 (UI 共通要件) | SS5 サイトマップ、steering/tech.md | App Shell 統合、Server Actions、デザインシステム準拠 |
