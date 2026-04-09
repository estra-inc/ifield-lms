# Implementation Plan

- [x] 1. データベーススキーマ拡張
- [x] 1.1 `profiles.slack_user_id` カラム追加マイグレーションファイルを作成する
  - `supabase/migrations/20260409170000_profiles_add_slack_user_id.sql` を新規作成する（**ルート** の `supabase/migrations/`。`lms-fe/supabase/migrations/` ではない）
  - `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slack_user_id text;` を記述する
  - カラムコメント（`COMMENT ON COLUMN`）で「Slack User ID（U または W で始まる文字列）。Super Admin のみ使用」と明記する
  - NOT NULL 制約・CHECK 制約・インデックスは付けない（後方互換性とアプリ層バリデーション優先）
  - _Requirements: 4.1_

- [x] 1.1.1 マイグレーションを本番 Supabase に手動適用する（**yotaro さん操作**）
  - Supabase Studio → SQL Editor で 1.1 で作成した SQL を貼り付けて実行する
  - 適用後、SQL Editor で `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='slack_user_id';` で1行返ることを確認する
  - **このタスクが完了するまで Task 7 (UI 統合) はマージしない**（コードが新カラムを参照するため）
  - _Requirements: 4.1_

- [x] 1.2 `lib/types/database.ts` の `profiles` 型を手動で更新する
  - 本プロジェクトでは `database.ts` は手動メンテナンスされている（自動生成スクリプトなし）
  - `profiles` の `Row` / `Insert` / `Update` の3セクションすべてに `slack_user_id?: string | null` を追加する（既存の `last_name` / `first_name` 追加時と同じパターン）
  - `npm run lint` および `npm run build`（または `tsc --noEmit`）で型エラーが発生しないことを確認する
  - _Requirements: 4.1_

- [x] 2. Slack 通知共通モジュール構築
- [x] 2.1 (P) `lib/notifications/slack.ts` を実装する
  - `notifySlack(payload: SlackPayload)` 関数を実装する
  - 環境変数 `SLACK_WEBHOOK_URL` が未設定なら `console.warn` で警告を出して no-op で return する
  - Node 標準 `fetch` で Webhook URL に JSON POST する（依存追加なし）
  - HTTP 4xx/5xx の場合は `console.error` でステータスとレスポンスボディを記録するが例外を投げない
  - ネットワークエラーは `try/catch` で握り潰し `console.error` のみ
  - すべてのログに `[notifications]` プレフィックスを付ける
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2.2 (P) `lib/notifications/slack.ts` の単体テストを実装する
  - `__tests__/lib/notifications/slack.test.ts` を新規作成する
  - `vi.spyOn(globalThis, 'fetch')` でモックする
  - ケース1: `SLACK_WEBHOOK_URL` 未設定時は `fetch` が呼ばれない
  - ケース2: 200 OK 応答時は例外を投げない
  - ケース3: 500 エラー応答時は `console.error` が呼ばれるが例外を投げない
  - ケース4: ネットワークエラー時も例外を投げない
  - _Requirements: 1.4, 1.5, 1.6_

- [x] 2.3 (P) `lib/notifications/mentions.ts` を実装する
  - `resolveCoachMention(client, coachId)` 関数を実装する
  - `coachId` が null の場合 `<!here>` を返し警告ログを出す
  - Supabase クライアントで `profiles.slack_user_id` を1件 SELECT する
  - SELECT エラーの場合 `<!here>` を返し `console.error` を出す
  - `slack_user_id` が NULL/空文字列の場合 `<!here>` を返す
  - 登録済みの場合 `<@{slack_user_id}>` 形式の文字列を返す
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 2.4 (P) `lib/notifications/mentions.ts` の単体テストを実装する
  - `__tests__/lib/notifications/mentions.test.ts` を新規作成する
  - Supabase クライアントのメソッドチェーンをモックする
  - ケース1: `coachId` null → `<!here>`
  - ケース2: `slack_user_id` 登録済み → `<@U01ABCDEF>`
  - ケース3: `slack_user_id` NULL → `<!here>`
  - ケース4: SELECT エラー → `<!here>` + `console.error` 呼び出し検証
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3. コーチング通知メッセージビルダーの実装
- [x] 3.1 `lib/notifications/messages/coaching.ts` のビルダー関数を実装する
  - `BookingNotificationInput` / `CancellationNotificationInput` 型を定義する
  - `buildBookingBlocks(input, mention)` ピュア関数を実装し A1 用の Block Kit 配列を返す（header + 本文 section + fields section + actions ボタン）
  - `buildCancellationBlocks(input, mention)` ピュア関数を実装し A2 用の Block Kit 配列を返す
  - 日時表示は `2026/04/15 (水) 14:00〜15:00` 形式に整形する（`Intl.DateTimeFormat('ja-JP', { weekday: 'short' })` または既存ヘルパ利用）
  - 管理画面リンクは `https://ifield-lms.vercel.app/admin/coaching` を定数化する
  - ジャンルラベルは `engineering: "エンジニアリング" / design: "デザイン"` でマッピングする
  - _Requirements: 2.2, 3.2_

- [x] 3.2 メッセージ送信関数 `notifyCoachingBooked` / `notifyCoachingCancelled` を実装する
  - 同ファイル内に実装する
  - 内部で `resolveCoachMention` を呼んでメンション文字列を取得する
  - `buildBookingBlocks` / `buildCancellationBlocks` で blocks を構築する
  - サマリーテキスト（プッシュ通知用）を組み立て `notifySlack({ text, blocks })` を呼ぶ
  - 関数自体は例外を投げない（内部の依存関数が fail-safe 設計）
  - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [x] 3.3 ビルダー関数の単体テスト（スナップショット）を実装する
  - `__tests__/lib/notifications/messages/coaching.test.ts` を新規作成する
  - `buildBookingBlocks` のスナップショット: メンション付き / `@here` フォールバック の2パターン
  - `buildCancellationBlocks` のスナップショット: メンション付き / `@here` フォールバック の2パターン
  - 日時フォーマット（曜日含む）の出力検証
  - エンジニアリング / デザインの両ジャンル分岐の検証
  - _Requirements: 2.2, 3.2_

- [x] 4. コーチング Server Action への通知フック追加
- [x] 4.1 `bookSession` に新規予約通知を組み込む
  - `app/(authenticated)/coaching/actions.ts` の `bookSession` の `revalidatePath("/coaching")` 直前に通知呼び出しを追加する
  - 既存の `studentName` / `selectedCoachId` / `selectedCoachName` / `genre` / `date` / `startTime` / `endTime` / `meetUrl` を `notifyCoachingBooked` に渡す
  - `try/catch` で囲み、通知失敗時は `console.error` のみ出して予約成功レスポンスを維持する
  - 予約 INSERT 自体が失敗した場合は通知を呼ばない（既存のエラー return を維持）
  - _Requirements: 2.1, 2.5, 2.6_

- [x] 4.2 `cancelSession` のセッション取得クエリを拡張し、キャンセル通知を組み込む
  - 既存の `select("id, user_id, status, google_event_id, coach_id")` を拡張して `session_date, start_time, end_time, genre` および受講生氏名（`profiles!coaching_sessions_user_id_fkey(full_name)` JOIN）を追加取得する
  - キャンセル成功後 `revalidatePath("/coaching")` 直前で担当コーチ氏名を追加 SELECT し `notifyCoachingCancelled` を呼ぶ
  - `try/catch` で fail-safe 化する
  - キャンセル処理自体が失敗した場合は通知を呼ばない
  - _Requirements: 3.1, 3.5_

- [x] 5. Slack User ID 編集 Server Action の実装
- [x] 5.1 `updateSlackUserId` Server Action を実装する
  - `app/(authenticated)/admin/users/actions.ts` に追加する
  - シグネチャ: `(prevState, formData) => Promise<ActionResult>`（`useActionState` 互換）
  - 認証チェック → 呼び出し元 `profiles.role` が `super_admin` であることを検証する
  - `formData` から `userId` と `slackUserId` を取り出し trim する
  - 空文字列の場合は `success: false` を返し「『解除』ボタンを使用してください」とメッセージする
  - 正規表現 `/^[UW][A-Z0-9]+$/` でバリデーションする
  - 更新対象ユーザーの `profiles.role` が `super_admin` であることを検証する
  - `createAdminClient()` で `profiles.slack_user_id` を UPDATE する
  - 成功時 `revalidatePath('/admin/users/${userId}')` し成功メッセージを返す
  - _Requirements: 4.9, 4.12, 4.14, 4.15, 4.16, 4.17, 6.3, 6.4_

- [x] 5.2 `clearSlackUserId` Server Action を実装する
  - 同 `actions.ts` に追加する
  - シグネチャ: `(targetUserId: string) => Promise<ActionResult>`（`adminDisconnectGoogleCalendar` と同じパターン）
  - 認証 + 呼び出し元 `super_admin` 検証
  - 更新対象 `super_admin` 検証
  - `slack_user_id` を NULL に UPDATE する
  - 成功時 `revalidatePath('/admin/users/${targetUserId}')` し成功メッセージを返す
  - _Requirements: 4.10, 4.11, 4.13, 4.14, 4.17, 6.3, 6.4_

- [x] 6. Slack 連携 UI コンポーネントの実装
- [x] 6.1 `slack-integration-card.tsx` を新規作成する
  - `app/(authenticated)/admin/users/[id]/_components/slack-integration-card.tsx` を新規作成する
  - Props: `userId: string`, `currentSlackUserId: string | null`
  - shadcn/ui の `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Tooltip`, `TooltipContent`, `Input`, `Label`, `Button`, `Badge`, `AlertDialog` を使用する
  - 「Slack 連携」見出しの横に Info アイコン + ツールチップで取得方法を案内する（「Slack のプロフィール → 『その他』→ 『メンバー ID をコピー』で取得できる U または W から始まる文字列を貼り付けてください」）
  - 入力フィールドに現在の Slack User ID を初期値として表示する
  - 現在の状態を Badge で表示する（登録済み: 緑系、未登録: outline + 「フォールバック: @here」注釈）
  - `useActionState(updateSlackUserId, null)` で保存 Server Action を管理し、`form` の `action` に渡す
  - `userId` を `<input type="hidden">` で送信する
  - 成功/失敗フィードバックは `toast.success` / `toast.error`（既存パターン踏襲）
  - _Requirements: 4.2, 4.3, 4.5, 4.6, 4.9, 4.17_

- [x] 6.2 「解除」ボタンと確認ダイアログを実装する
  - `currentSlackUserId` が登録済みの場合のみ「解除」ボタンを表示する
  - `AlertDialog` で確認ダイアログを表示し「解除すると、このコーチへの個別メンションが行われなくなり、通知は @here でフォールバックされます」と説明する
  - 承認時に `useTransition` 経由で `clearSlackUserId(userId)` を呼ぶ
  - 成功時 `toast.success`、失敗時 `toast.error`
  - _Requirements: 4.7, 4.8, 4.10, 4.11, 4.17_

- [x] 7. ユーザー詳細ページへの統合
- [x] 7.1 `UserDetail` 型に `slack_user_id` を追加する
  - `lib/types/user-management.ts` の `UserDetail` 型に `slack_user_id: string | null` を追加する
  - 関連する型変換ロジックがあれば併せて更新する
  - _Requirements: 4.1_

- [x] 7.2 `admin/users/[id]/page.tsx` のクエリと表示を更新する
  - ユーザー詳細取得クエリの `select` に `slack_user_id` カラムを含める
  - 対象ユーザーの `role === "super_admin"` の場合のみ `<SlackIntegrationCard />` をレンダリングする
  - Manager / User ロールの場合はカード自体を表示しない
  - 既存の `<ProfileCard />`, `<CoachingCreditsCard />` 等と同じセクション配置に揃える
  - _Requirements: 4.2, 6.1, 6.2_

- [x] 8. 環境変数とドキュメント整備
- [x] 8.1 `.env.local.example` に `SLACK_WEBHOOK_URL` を追記する
  - 既存の例ファイルに `SLACK_WEBHOOK_URL=` の行を追加する
  - コメントで「Slack `#pj_研修` 用 Incoming Webhook URL。未設定時は通知無効」と明記する
  - _Requirements: 1.1, 1.4_

- [ ] 8.2 Vercel 本番環境変数を設定する
  - Slack ワークスペースで `#pj_研修` 用 Incoming Webhook を作成し URL を取得する
  - Vercel Project Settings → Environment Variables → `SLACK_WEBHOOK_URL` を Production 環境のみに登録する
  - Preview / Development には設定しない（誤投稿防止）
  - 設定後に再デプロイで反映する
  - ※ このタスクは yotaro さんの操作が必要
  - _Requirements: 1.1_

- [ ] 9. 検証とエンドツーエンドテスト
- [ ] 9.1 ローカルでの動作確認（テスト Webhook 使用）
  - 自分用テストチャンネルの Webhook URL を `.env.local` に一時設定する
  - 受講生アカウントで `bookSession` を実行 → テストチャンネルに新規予約通知が届くことを確認する
  - 同じ受講生で `cancelSession` を実行 → キャンセル通知が届くことを確認する
  - 担当コーチの `slack_user_id` を登録 → 新規予約 → メンション付きで届くことを確認する
  - 担当コーチの `slack_user_id` を解除 → 新規予約 → `@here` 付きで届くことを確認する
  - `.env.local` の `SLACK_WEBHOOK_URL` を一時的に削除 → 予約は成功し warning ログのみ出ることを確認する
  - _Requirements: 1.4, 2.1, 2.3, 2.4, 3.1, 3.3, 3.4_

- [ ] 9.2 UI 表示条件の検証
  - Manager ロールのユーザー詳細画面を開き「Slack 連携」セクションが表示されないことを確認する
  - User ロールのユーザー詳細画面を開き「Slack 連携」セクションが表示されないことを確認する
  - Super Admin ロールのユーザー詳細画面で「Slack 連携」セクションが表示されること、解除ボタンが登録時のみ出ることを確認する
  - ツールチップの文言を確認する
  - _Requirements: 4.4, 4.7, 4.8, 6.1, 6.2_

- [ ] 9.3 権限境界の検証
  - Manager ロールでログインし、ブラウザの devtools 等から `updateSlackUserId` Server Action を直接呼び出して権限エラーが返ることを確認する
  - 同様に `clearSlackUserId` も検証する
  - 不正な Slack User ID（小文字、空文字、形式不正）でバリデーションエラーが返ることを確認する
  - _Requirements: 4.12, 4.13, 4.14, 4.15, 4.16, 6.3, 6.4_

- [ ] 9.4 本番デプロイ後の本番チャンネルでの最終確認
  - 本番環境変数 `SLACK_WEBHOOK_URL` が `#pj_研修` を指していることを確認する
  - 本番でテスト用の予約 → キャンセルを1件実行し `#pj_研修` への投稿を確認する
  - 投稿後にテスト予約・キャンセルを片付ける（DB 上の不要レコードを残さない）
  - ※ このタスクは yotaro さんの確認が必要
  - _Requirements: 2.1, 3.1_
