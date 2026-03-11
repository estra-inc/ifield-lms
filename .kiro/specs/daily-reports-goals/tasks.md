# Implementation Plan

- [x] 1. データベーススキーマの作成
- [x] 1.1 `daily_reports` テーブルの作成
  - `daily_reports` テーブルを CREATE TABLE で作成する（id, user_id, report_date, actual_hours, content, liked_by_manager, created_at, updated_at）
  - `actual_hours > 0` および `content <> ''` の CHECK 制約を設定する
  - `user_id` への外部キー制約（profiles テーブル参照、ON DELETE CASCADE）を設定する
  - RLS パフォーマンス用の `user_id` インデックスと、日付降順表示用の複合インデックス `(user_id, report_date DESC)` を作成する
  - `ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY` で RLS を有効化する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1_

- [x] 1.2 `monthly_goals` テーブルの作成
  - `monthly_goals` テーブルを CREATE TABLE で作成する（id, user_id, year_month, target_hours, created_at, updated_at）
  - `year_month` カラムに正規表現チェック `'^\d{4}-\d{2}$'` と `target_hours > 0` の CHECK 制約を設定する
  - `(user_id, year_month)` の複合 UNIQUE 制約を設定する（UPSERT 動作の基盤）
  - `user_id` インデックスを作成し、RLS を有効化する
  - _Requirements: 3.3, 3.4, 7.2_

- [x] 1.3 `weekly_goals` テーブルの作成
  - `weekly_goals` テーブルを CREATE TABLE で作成する（id, user_id, start_date, end_date, target_hours, created_at, updated_at）
  - `target_hours > 0` および `end_date > start_date` の CHECK 制約を設定する
  - `(user_id, start_date)` の複合 UNIQUE 制約を設定する（UPSERT 動作の基盤）
  - `user_id` インデックスを作成し、RLS を有効化する
  - _Requirements: 4.3, 4.4, 7.3_

- [x] 2. RLS ポリシーの設定
- [x] 2.1 `daily_reports` テーブルの RLS ポリシー作成
  - User が自身のレコードのみを SELECT できるポリシーを作成する（`(select auth.uid()) = user_id`）
  - User が自身のレコードのみを INSERT できるポリシーを作成する
  - Manager / Super Admin が全レコードを SELECT できるポリシーを作成する（profiles テーブルの role を参照するサブクエリ）
  - Manager が `liked_by_manager` を UPDATE できるポリシーを作成する（カラムレベル制御は Server Action 側で担保）
  - ~~User の DELETE を明示的に許可しないことを確認する（DELETE ポリシーを作成しない）~~ → タスク 14.5 で User の UPDATE / DELETE ポリシーを追加済み
  - 全ポリシーで `(select auth.uid())` ラッパーを使用してパフォーマンスを最適化する
  - _Requirements: 7.1, 7.4, 7.7, 7.8, 7.10_

- [x] 2.2 `monthly_goals` テーブルの RLS ポリシー作成
  - User が自身のレコードのみを SELECT / INSERT / UPDATE できるポリシーを作成する
  - Manager / Super Admin が全レコードを SELECT できるポリシーを作成する
  - _Requirements: 7.2, 7.5, 7.9_

- [x] 2.3 (P) `weekly_goals` テーブルの RLS ポリシー作成
  - User が自身のレコードのみを SELECT / INSERT / UPDATE できるポリシーを作成する
  - Manager / Super Admin が全レコードを SELECT できるポリシーを作成する
  - `monthly_goals` と同一パターンのポリシーを適用する
  - _Requirements: 7.3, 7.6, 7.9_

- [x] 3. TypeScript 型定義の追加
- [x] 3.1 (P) データベース型定義の拡張
  - `lib/types/database.ts` の `Database.public.Tables` に `daily_reports`、`monthly_goals`、`weekly_goals` の Row / Insert / Update / Relationships 型を追加する
  - 既存の型定義パターン（snake_case カラム名）に準拠する
  - _Requirements: 9.6_

- [x] 3.2 (P) フロントエンド用ドメイン型の定義
  - `lib/types/daily-reports.ts` を新規作成し、フロントエンド用の camelCase 型を定義する
  - `DailyReportEntry`（日報エントリ）、`DateGroup`（日付グループ）、`ReportFeedItem`（Manager 向けフィードアイテム）、`AdminReportRow`（管理テーブル行）、`LearningMetrics`（学習進捗メトリクス）の各インターフェースを定義する
  - 既存の `lib/types/` ディレクトリの命名規約に従う
  - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2, 6.3, 6.4, 8.1, 8.2, 8.3_

- [x] 4. Zod バリデーションスキーマの定義
- [x] 4.1 (P) 日報バリデーションスキーマの作成
  - `lib/validations/daily-reports.ts` を新規作成し、`dailyReportSchema` を定義する
  - `report_date`（ISO 8601 日付文字列、未来日不可の `.refine()` チェック付き）、`actual_hours`（`.positive()` + `.refine(v => v % 0.5 === 0)` で 0.5 時間刻みを保証）、`content`（1 文字以上の非空文字列）の 3 フィールドを検証する
  - 日本語のエラーメッセージを設定する
  - クライアントサイドとサーバーサイドの双方で使用可能にする
  - _Requirements: 1.6, 1.7, 1.8_

- [x] 4.2 (P) 目標バリデーションスキーマの作成
  - `lib/validations/goals.ts` を新規作成し、`monthlyGoalSchema` と `weeklyGoalSchema` を定義する
  - 月次目標: `year_month`（"YYYY-MM" 形式の正規表現チェック）、`target_hours`（`.positive()`）
  - 週次目標: `start_date`（ISO 8601、月曜日チェックの `.refine()`）、`end_date`（ISO 8601、日曜日チェック）、`target_hours`（`.positive()`）
  - 日本語のエラーメッセージを設定する
  - _Requirements: 3.5, 4.5_

- [x] 5. 日報の Server Actions 実装
- [x] 5.1 日報作成 Server Action の実装
  - `app/(authenticated)/reports/actions.ts` を新規作成し、`createDailyReport` Server Action を実装する
  - `ActionResult` 型の返却パターンを既存の `admin/users/actions.ts` から踏襲する
  - サーバーサイドで `auth.getUser()` からユーザー ID を取得する（クライアントからの `user_id` 指定は不可）
  - `dailyReportSchema` でサーバーサイドバリデーションを実行する
  - Supabase クライアントで `daily_reports` テーブルへの INSERT を実行する
  - 成功時に `revalidatePath("/reports")` でキャッシュを無効化する
  - エラー時は `ActionResult(success: false)` でエラーメッセージを返す
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 9.2_

- [x] 5.2 いいねトグル Server Action の実装
  - 同ファイルに `toggleLike` Server Action を実装する
  - Manager ロールであることをサーバーサイドで検証する（profiles テーブルの role を確認）
  - `daily_reports` テーブルの `liked_by_manager` カラムのみを反転 UPDATE する（他カラムの更新を防止）
  - 成功時に `revalidatePath` でキャッシュを無効化する
  - _Requirements: 5.3, 5.4_

- [x] 6. 目標の Server Actions 実装
- [x] 6.1 (P) 月次目標 UPSERT Server Action の実装
  - `app/(authenticated)/goals/actions.ts` を新規作成し、`upsertMonthlyGoal` Server Action を実装する
  - サーバーサイドで `auth.getUser()` からユーザー ID を取得する
  - `monthlyGoalSchema` でサーバーサイドバリデーションを実行する
  - Supabase SDK の `.upsert()` メソッドに `onConflict: 'user_id,year_month'` を指定して UPSERT を実行する
  - 成功時に `revalidatePath("/goals")` でキャッシュを無効化する
  - _Requirements: 3.3, 3.4, 3.5, 9.2_

- [x] 6.2 (P) 週次目標 UPSERT Server Action の実装
  - 同ファイルに `upsertWeeklyGoal` Server Action を実装する
  - `weeklyGoalSchema` でサーバーサイドバリデーションを実行する
  - Supabase SDK の `.upsert()` メソッドに `onConflict: 'user_id,start_date'` を指定して UPSERT を実行する
  - `start_date` が月曜日であることのバリデーションを含める
  - 成功時に `revalidatePath("/goals")` でキャッシュを無効化する
  - _Requirements: 4.3, 4.4, 4.5, 9.2_

- [x] 7. User 向け日報入力ページの実装（Screen 1）
- [x] 7.1 日報入力フォームコンポーネントの作成
  - `app/(authenticated)/reports/_components/daily-report-form.tsx` を Client Component として作成する
  - 対象日付（date input）、学習時間（number input、`step="0.5"`）、学習内容（textarea）の 3 フィールドを配置する
  - `useActionState` で `createDailyReport` Server Action と連携する
  - クライアントサイドで `dailyReportSchema.safeParse()` によるリアルタイムバリデーションを実行し、エラーをフィールド直下に表示する
  - 送信中はボタンをローディング状態にし、二重送信を防止する
  - 送信成功時にトースト表示と `/reports/list` へ `router.push` で遷移する。失敗時にエラーメッセージ表示と再送信可能状態を維持する
  - _Requirements: 1.1, 1.2, 1.6, 1.7, 1.8, 1.9, 1.10, 9.3, 9.4, 9.6_

- [x] 7.2 メトリクスカード行コンポーネントの作成
  - `app/(authenticated)/reports/_components/metrics-row.tsx` を Server Component として作成する
  - 今月・今週・本日の学習時間を 3 枚のメトリクスカードで横並び表示する
  - 月次・週次の目標時間が設定されている場合、プログレスバーと達成率（%）を表示する
  - 目標未設定時は「目標未設定」バッジを表示し、目標設定ページ（`/goals`）へのリンクを提供する
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7.3 日報入力ページの組み立て
  - `app/(authenticated)/reports/page.tsx` を Server Component として作成する
  - Supabase クライアントで当月・当週・本日の日報データと目標データをフェッチし、進捗メトリクスを計算する
  - MetricsRow と DailyReportForm を配置する
  - `loading.tsx` でローディング状態を表示する
  - _Requirements: 1.1, 1.2, 8.1, 8.2, 8.3, 8.4, 9.1, 9.5, 9.6_

- [x] 8. User 向け日報一覧ページの実装（Screen 2）
- [x] 8.1 日報エントリカードコンポーネントの作成
  - `app/(authenticated)/reports/_components/report-entry-card.tsx` を Server Component として作成する
  - 各エントリに学習時間、学習内容、いいね状態を表示する
  - いいね済みの場合はハートアイコンを赤色で表示し、未いいねの場合はグレーで表示する
  - _Requirements: 2.2, 2.5_

- [x] 8.2 日報一覧コンポーネントの作成
  - `app/(authenticated)/reports/_components/user-report-list.tsx` を Server Component として作成する
  - 日報データを日付ごとにグループ化するユーティリティロジックを実装する
  - 各日付グループのヘッダーに日付と合計学習時間（SUM）を表示する
  - グループ内に各エントリカードを降順で配置する
  - _Requirements: 2.1, 2.3_

- [x] 8.3 日報一覧ページの組み立て
  - `app/(authenticated)/reports/list/page.tsx` を Server Component として作成する
  - Supabase クライアントで自身の日報データを日付降順でフェッチする（RLS により自動的に自身のデータのみ取得）
  - cursor-based ページネーションを実装する（`?cursor=` パラメータで `created_at` ベース、20 件ずつ取得）
  - snake_case から camelCase への変換を行い、UserReportList に渡す
  - 「もっと見る」ボタンまたは自動ロードで次ページを取得する Client Component を実装する
  - `loading.tsx` でローディング状態を表示する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.1, 9.5, 9.6_

- [x] 9. User 向け学習目標ページの実装（Screen 3）
- [x] 9.1 月次目標カードコンポーネントの作成
  - `app/(authenticated)/goals/_components/monthly-goal-card.tsx` を Client Component として作成する
  - 月次目標の進捗セクション（実績時間 / 目標時間、プログレスバー、達成率）を表示する
  - 目標時間の入力フォームを配置し、`useActionState` で `upsertMonthlyGoal` と連携する
  - 目標未設定時は目標設定を促すメッセージを表示する
  - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 9.3_

- [x] 9.2 週次目標カードコンポーネントの作成
  - `app/(authenticated)/goals/_components/weekly-goal-card.tsx` を Client Component として作成する
  - 週次目標の進捗セクション（実績時間 / 目標時間、プログレスバー、達成率）を表示する
  - 週セレクター（ドロップダウン）で任意の週を選択可能にする。デフォルトは今週（月曜〜日曜）。過去の週の振り返り目標設定も可能
  - 週を切り替えると対応する目標と実績データを再フェッチする
  - 目標時間の入力フォームを配置し、`useActionState` で `upsertWeeklyGoal` と連携する
  - 目標未設定時は目標設定を促すメッセージを表示する
  - _Requirements: 4.1, 4.2, 4.5, 4.6, 4.7, 9.3_

- [x] 9.3 学習目標ページの組み立て
  - `app/(authenticated)/goals/page.tsx` を Server Component として作成する
  - Supabase クライアントで当月・当週の目標データと日報の合計学習時間をフェッチする
  - MonthlyGoalCard と WeeklyGoalCard を左右 2 カラムレイアウトで配置する
  - `loading.tsx` でローディング状態を表示する
  - _Requirements: 3.1, 3.6, 3.7, 4.1, 4.6, 4.7, 8.2, 8.3, 9.1, 9.5, 9.6_

- [x] 10. Manager 向け日報フィードページの実装（Screen 4）
- [x] 10.1 フィードカードコンポーネントの作成
  - `app/(authenticated)/manager/reports/_components/feed-card.tsx` を Client Component として作成する
  - ユーザー名、アバター（姓の頭文字イニシャル + ユーザー別固定色）、日付、学習時間、学習内容を表示する
  - いいねトグルボタンを配置し、`toggleLike` Server Action を呼び出す（Manager のみ表示）
  - いいね済みカードは背景色を変更し、ボタンを赤背景 + 塗りハートに変える。未いいねカードは outline + 線ハートにする
  - User ロールおよび Super Admin ロールの場合はいいねボタンを表示しない（Manager のみトグル可能）
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 10.2 フィードリストとページの組み立て
  - `app/(authenticated)/manager/reports/_components/feed-list.tsx` でフィードカードのリスト表示を実装する
  - `app/(authenticated)/manager/reports/page.tsx` を Server Component として作成する
  - Supabase クライアントで全ユーザーの日報データを日付降順でフェッチし、profiles テーブルと結合してユーザー情報を取得する
  - cursor-based ページネーションを実装する（`?cursor=` パラメータ、20 件ずつ取得）
  - 「もっと見る」ボタンで次ページを取得する Client Component を実装する
  - `loading.tsx` でローディング状態を表示する
  - _Requirements: 5.1, 6.1, 9.1, 9.5, 9.6_

- [x] 11. Manager / Super Admin 向け日報テーブルページの実装（Screen 5）
- [x] 11.1 管理テーブルコンポーネントの作成
  - `app/(authenticated)/manager/reports/_components/admin-report-table.tsx` を Server Component として作成する
  - shadcn/ui Table で日報データを表示する（カラム: ユーザー、日付、学習時間、学習内容、いいね状態、月次進捗）
  - 月次進捗バーの色分けを実装する（80%+ green, 50-79% primary, 30-49% yellow, <30% red）
  - いいねカラムにハートアイコン（赤=済み、グレー=未済）を表示する
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 11.2 検索フィルタコンポーネントの作成
  - `app/(authenticated)/manager/reports/_components/report-search-filter.tsx` を Client Component として作成する
  - `useRouter` + `useSearchParams` でユーザー名検索の URL クエリパラメータを更新する
  - デバウンス付きテキスト入力で `?search=` パラメータを管理する
  - 既存の `admin/users/_components/user-filters.tsx` のパターンを踏襲する
  - _Requirements: 6.5_

- [x] 11.3 管理テーブルページの組み立て
  - `app/(authenticated)/manager/reports/table/page.tsx` を Server Component として作成する
  - URL の `searchParams` からフィルタ条件を取得し、Supabase クエリに適用する
  - offset-based ページネーションを実装する（`?page=` パラメータ、20 件ずつ取得）。ページナビゲーション UI を含める
  - 日報データと profiles テーブルを結合してフェッチし、月次目標の進捗率を計算する
  - ReportSearchFilter と AdminReportTable を配置する
  - `loading.tsx` でローディング状態を表示する
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.5, 9.6_

- [x] 12. ナビゲーション設定の更新と統合
- [x] 12.1 ナビゲーション定義の拡張
  - `config/navigation.ts` の `NAVIGATION_MAP` に User ロール向けメニュー項目を追加する（「日報」: `/reports`、「学習目標」: `/goals`）
  - Manager ロール向けメニュー項目を追加する（「受講生の日報」: `/manager/reports`）
  - Super Admin ロール向けメニュー項目を追加する（「受講生の日報」: `/manager/reports`）
  - Lucide アイコン `FileText`（日報）、`Target`（学習目標）の import を追加する
  - _Requirements: 9.1_

- [x] 12.2 全画面の結合テストと動作確認
  - 日報入力 → 日報一覧への反映を確認する（User フロー）
  - 月次・週次目標の設定 → 進捗メトリクスの更新を確認する（User フロー）
  - Manager フィードでのいいねトグル → User 側でのいいね表示を確認する（Manager フロー）
  - Super Admin のテーブルビューでユーザー名フィルタリングの動作を確認する
  - RLS が正しく機能し、User が他ユーザーのデータにアクセスできないことを確認する
  - ナビゲーションメニューがロール別に正しく表示されることを確認する
  - _Requirements: 1.3, 2.4, 3.4, 4.4, 5.3, 5.4, 6.1, 6.2, 6.5, 7.4, 7.7, 7.9_

- [x]* 13. バリデーションスキーマの単体テスト
  - `dailyReportSchema` の正常値テスト（有効な日付、正の学習時間、非空の内容）
  - `dailyReportSchema` の境界値テスト（学習時間 0、空文字の内容、未来日の日付）
  - `monthlyGoalSchema` の正常値テスト（有効な "YYYY-MM" 形式、正の目標時間）と不正形式テスト
  - `weeklyGoalSchema` の正常値テスト（有効な日付範囲、正の目標時間）。**注意: 月曜日/日曜日の曜日チェックは UI が保証するため Zod スキーマからは削除済み**
  - 日報グループ化ユーティリティの単体テスト（複数日・同一日複数エントリ・空配列の処理）
  - _Requirements: 1.6, 1.7, 1.8, 3.5, 4.5, 8.1_

---

## 追加実装タスク（要件変更・追加による）

以下は初期計画後に追加された要件変更に伴う実装タスク。全て完了済み。

- [x] 14. 日報の編集・削除機能
- [x] 14.1 日報更新 Server Action の実装
  - `app/(authenticated)/reports/actions.ts` に `updateDailyReport` Server Action を追加する
  - FormData から `reportId` を受け取り、`dailyReportSchema` でバリデーション後に UPDATE を実行する
  - `.eq("user_id", user.id)` で所有者を二重検証する
  - _Requirements: 1.11, 1.12_

- [x] 14.2 日報削除 Server Action の実装
  - 同ファイルに `deleteDailyReport` Server Action を追加する
  - `.eq("user_id", user.id)` で所有者を二重検証する
  - _Requirements: 1.13, 1.14_

- [x] 14.3 日報編集ダイアログの作成
  - `app/(authenticated)/reports/_components/edit-report-dialog.tsx` を Client Component として作成する
  - DropdownMenu + Dialog の組み合わせで編集フォームを提供する
  - _Requirements: 1.11, 1.12_

- [x] 14.4 日報削除確認ダイアログの作成
  - `app/(authenticated)/reports/_components/delete-report-dialog.tsx` を Client Component として作成する
  - 確認メッセージ付きの削除ダイアログを提供する
  - _Requirements: 1.13, 1.14_

- [x] 14.5 RLS ポリシーの追加
  - `daily_reports` テーブルに User の UPDATE / DELETE ポリシーを追加する（`(select auth.uid()) = user_id`）
  - _Requirements: 7.4（変更）, 7.10（変更）_

- [x] 15. 学習時間推移チャートの実装
- [x] 15.1 折れ線グラフコンポーネントの作成
  - `app/(authenticated)/reports/_components/learning-hours-chart.tsx` を Client Component として作成する
  - 純粋な SVG で折れ線グラフを描画する（外部チャートライブラリ不使用）
  - 月次/週次タブ切替、前後ナビゲーション、「今日」ボタン、目標ライン（破線）を実装する
  - `accountCreatedAt` に基づく「前へ」ナビゲーションの範囲制限を実装する
  - _Requirements: 9.1-9.10_

- [x] 15.2 目標フォールバックロジックの実装
  - `app/(authenticated)/goals/page.tsx` でチャート表示期間に目標が未設定の場合、直近の過去の目標を取得するフォールバッククエリを実装する
  - _Requirements: 9.5_

- [x] 16. 月次目標カードの月ナビゲーション
- [x] 16.1 月セレクターの追加
  - `MonthlyGoalCard` に `availableMonths` prop と月セレクター（shadcn/ui Select）を追加する
  - `useSearchParams` で URL パラメータを保持しつつ `month` パラメータを更新する
  - _Requirements: 3.2, 3.8, 3.10_

- [x] 16.2 「今月」ボタンの追加
  - 今月以外を表示中のときに「今月」ボタンを表示し、`month` パラメータを削除して今月に戻す
  - _Requirements: 3.9_

- [x] 16.3 目標ページの月パラメータ対応
  - `app/(authenticated)/goals/page.tsx` の searchParams に `month` を追加し、選択月に応じてデータを動的にフェッチする
  - _Requirements: 3.2, 3.6, 3.8_

- [x] 17. 週次目標カードのUX強化
- [x] 17.1 「今週」ボタンの追加
  - 今週以外を表示中のときに「今週」ボタンを表示し、`week` パラメータを削除して今週に戻す
  - _Requirements: 4.9_

- [x] 17.2 URL パラメータ保持の修正
  - `handleWeekChange` を `useSearchParams` で他のパラメータ（`month` 等）を保持するよう修正する
  - _Requirements: 4.10_

- [x] 17.3 前週目標デフォルト値の実装
  - `goals/page.tsx` で前週の `weekly_goals` を取得し、`previousWeekTargetHours` prop として渡す
  - `defaultValue` のフォールバックチェーンを実装する（`currentGoal?.targetHours ?? previousWeekTargetHours ?? ""`）
  - _Requirements: 4.11_

- [x] 17.4 月次目標からの参考週次目標時間の実装
  - 選択中の週が属する月の月次目標を取得し、`suggestedWeeklyHours`（月次目標 × 7 / 月の日数）を算出する
  - WeeklyGoalCard にインフォボックスとして表示する
  - _Requirements: 4.12_

- [x] 18. 日付ユーティリティの整備
- [x] 18.1 `formatLocalDate` ユーティリティの作成
  - `lib/utils/week-helpers.ts` に `formatLocalDate()` を追加する
  - `toISOString()` の UTC 変換による JST 環境での日付ズレを回避する
  - プロジェクト内の全 `toISOString().split("T")[0]` パターンを `formatLocalDate()` に置換する

- [x] 18.2 `generateAvailableMonths` / `generateAvailableWeeks` のアカウント作成日対応
  - 引数を `count` から `createdAt` に変更し、アカウント作成月/週〜+12ヶ月/12週先の範囲で生成する
  - 降順ソート（新しい方が先）で返す

- [x] 19. weeklyGoalSchema バリデーション変更
  - `weeklyGoalSchema` から `start_date` の月曜日チェック `.refine()` と `end_date` の日曜日チェック `.refine()` を削除する
  - UI のドロップダウンセレクターが月曜〜日曜を保証するため、サーバーサイドの曜日バリデーションは不要
  - 関連するテストケースを更新する
  - _Requirements: 4.2, 4.5_
