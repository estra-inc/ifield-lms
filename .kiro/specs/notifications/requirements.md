# 要件定義書: Notifications

## はじめに

本仕様は、社内LMSにおける運営チーム向けの即時通知基盤を定義する。現状、受講生がコーチング予約・キャンセルを行っても運営側（自社コーチ = Super Admin）がその発生に気付ける手段が存在せず、対応の遅延や見落としが発生している。本機能では、Slack Incoming Webhook を用いて社内チャンネル `#pj_研修` へ通知を投稿し、担当コーチを Slack メンションで明示することで、運営チームの即応性を改善する。

通知対象は MVP として「コーチング新規予約」「コーチング受講生キャンセル」の2イベントに限定する。担当コーチを個別にメンションするため、`profiles` テーブルに `slack_user_id` カラムを追加し、管理者画面から登録できる UI も提供する。

**スコープ外**:
- 受講生宛のメール通知（Resend を用いた採点完了・再提出依頼通知などは別仕様で扱う）
- アプリ内通知ベル（In-App Notification Center）
- 模擬案件提出・再提出時の通知（A3 / A4。MVP では除外）
- コーチング前日リマインダー（Google カレンダー標準通知に委ねる）
- 学習停滞・期限切れ間近などのバッチ系通知
- 同期 API 失敗・OAuth トークン失効などの運用監視通知
- Slack 以外のチャネル（Discord / LINE / Teams 等）

## 要件

### 1. Slack Webhook 通知基盤

**目的:** 開発者として、Slack Incoming Webhook を経由してメッセージを投稿する共通モジュールを利用したい。それにより、各 Server Action から統一された手段で運営チャンネルへ通知を送れる。

#### 受け入れ基準

1. The Notifications Module shall 環境変数 `SLACK_WEBHOOK_URL` を使用して Slack Incoming Webhook の宛先 URL を取得する
2. The Notifications Module shall Slack Block Kit 形式（`blocks` 配列）でメッセージを構築する
3. When 通知送信関数が呼び出された際, the Notifications Module shall HTTP POST で Slack Webhook URL に JSON ペイロードを送信する
4. If `SLACK_WEBHOOK_URL` が未設定である場合, then the Notifications Module shall 通知送信をスキップし、警告ログのみ出力する（例外を投げない）
5. If Slack Webhook 呼び出しが HTTP エラー（4xx/5xx）を返した場合, then the Notifications Module shall エラーログを出力するが、呼び出し元の Server Action の処理を中断しない（fire-and-forget）
6. If Slack Webhook 呼び出しがネットワークエラーで失敗した場合, then the Notifications Module shall 同様にエラーログを出力するのみで、呼び出し元の処理を中断しない
7. The Notifications Module shall 通知送信処理を Server Action のメインフローと分離し、ユーザー操作のレスポンスタイムに影響を与えない設計とする

### 2. コーチング新規予約通知 (A1)

**目的:** 自社コーチ（Super Admin）として、受講生がコーチング枠を新規予約した瞬間に Slack で気付きたい。それにより、当日までの準備や担当コーチの調整を漏れなく行える。

#### 受け入れ基準

1. When 受講生が `bookSession` Server Action を実行し予約が成功した際, the Notifications Module shall `#pj_研修` チャンネルへ Slack 通知を投稿する
2. The Notification Message shall 以下の項目を含む:
   - イベント種別を示すヘッダー（例: `📅 新規コーチング予約`）
   - 受講生氏名（`profiles.full_name`）
   - ジャンル（エンジニアリング / デザイン）
   - セッション日時（`session_date` + `start_time` 〜 `end_time`、JST 表記）
   - 担当コーチ氏名
   - 管理画面遷移用ボタン（リンク先: `https://ifield-lms.vercel.app/admin/coaching`）
3. If 担当コーチの `profiles.slack_user_id` が登録済みである場合, then the Notification Message shall `<@{slack_user_id}>` 形式のメンションを本文に含める
4. If 担当コーチの `profiles.slack_user_id` が未登録または NULL の場合, then the Notification Message shall `<!here>` (`@here`) を本文に含めるフォールバック動作を行う
5. If `bookSession` のメインフロー（DB INSERT、Google Calendar 連携）が成功し Slack 通知のみが失敗した場合, then the Notifications Module shall ユーザーへの予約成功レスポンスを維持する
6. If `bookSession` のメインフロー自体が失敗した場合, then the Notifications Module shall Slack 通知を送信しない

### 3. コーチング受講生キャンセル通知 (A2)

**目的:** 自社コーチ（Super Admin）として、受講生がコーチング予約をキャンセルした瞬間に Slack で気付きたい。それにより、空いた枠の再活用やスケジュール調整を素早く行える。

#### 受け入れ基準

1. When 受講生が `cancelSession` Server Action を実行しキャンセルが成功した際, the Notifications Module shall `#pj_研修` チャンネルへ Slack 通知を投稿する
2. The Notification Message shall 以下の項目を含む:
   - イベント種別を示すヘッダー（例: `❌ コーチング予約キャンセル`）
   - 受講生氏名
   - ジャンル
   - 元のセッション日時（JST 表記）
   - 担当コーチ氏名
   - 管理画面遷移用ボタン（リンク先: `https://ifield-lms.vercel.app/admin/coaching`）
3. If 担当コーチの `profiles.slack_user_id` が登録済みである場合, then the Notification Message shall `<@{slack_user_id}>` 形式のメンションを本文に含める
4. If 担当コーチの `profiles.slack_user_id` が未登録または NULL の場合, then the Notification Message shall `<!here>` をフォールバックとして本文に含める
5. If `cancelSession` のメインフローが成功し Slack 通知のみが失敗した場合, then the Notifications Module shall ユーザーへのキャンセル成功レスポンスを維持する

### 4. 管理者による Slack User ID 操作（Super Admin 同士の編集）

**目的:** Super Admin として、他の Super Admin の Slack User ID を一括で登録・更新したい。それにより、運営チームのオンボーディング時に管理者が代行登録でき、メンション機能を即座に有効化できる。

#### 受け入れ基準

1. The Profiles Schema shall `profiles` テーブルに `slack_user_id TEXT NULL` カラムを追加する
2. The Admin User Detail Page shall 管理者ユーザー詳細画面（`/admin/users/[id]`）に「Slack 連携」セクションを表示する
3. While 対象ユーザーのロールが `super_admin` である間, the Admin User Detail Page shall Slack User ID の入力フィールドと「保存」ボタンを表示する
4. While 対象ユーザーのロールが `super_admin` 以外である間, the Admin User Detail Page shall 「Slack 連携」セクションを表示しない
5. The Slack ID Input Field shall ツールチップで「Slack のプロフィール → 『その他』→ 『メンバー ID をコピー』で取得できる `U` または `W` から始まる文字列を貼り付けてください」と説明する
6. While Slack User ID が登録済みである間, the Admin User Detail Page shall 現在登録されている Slack User ID を入力フィールドの初期値として表示する
7. While Slack User ID が登録済みである間, the Admin User Detail Page shall 「解除」ボタンを併せて表示する（既存の `adminDisconnectGoogleCalendar` パターンに準拠）
8. While Slack User ID が未登録である間, the Admin User Detail Page shall 「解除」ボタンを表示しない
9. When Super Admin が「保存」ボタンを押下した際, the Admin User Detail Page shall `updateSlackUserId` Server Action を呼び出し `profiles.slack_user_id` を更新する
10. When Super Admin が「解除」ボタンを押下した際, the Admin User Detail Page shall 確認ダイアログを表示する
11. When Super Admin が解除確認ダイアログで承認した際, the Admin User Detail Page shall `clearSlackUserId` Server Action を呼び出し `profiles.slack_user_id` を NULL に更新する
12. The `updateSlackUserId` Server Action shall 呼び出し元が認証済みかつ Super Admin ロールであることを検証する
13. The `clearSlackUserId` Server Action shall 呼び出し元が認証済みかつ Super Admin ロールであることを検証する
14. If 呼び出し元が Super Admin ロールでない場合, then 両 Server Action shall 権限エラーを返し更新を行わない
15. The `updateSlackUserId` Server Action shall 入力値が `U` または `W` で始まり、その後に英大文字または数字が1文字以上続く文字列（正規表現 `^[UW][A-Z0-9]+$`）であることをバリデーションする
16. The `updateSlackUserId` Server Action shall 入力値が空文字列または NULL の場合はバリデーションエラーを返し、解除操作には `clearSlackUserId` を使用するよう促す
17. When 保存または解除が成功した際, the Admin User Detail Page shall 成功メッセージをユーザーに表示する

### 5. Slack User ID のメンション解決ロジック

**目的:** 開発者として、コーチング通知メッセージを構築する際に担当コーチの Slack User ID を取得し、メンション文字列を組み立てたい。それにより、Requirement 2/3 のメンション要件を実現できる。

#### 受け入れ基準

1. When 通知メッセージビルダーが担当コーチの Slack ID を必要とする際, the Notifications Module shall `coaching_sessions.coach_id` を起点として `profiles.slack_user_id` を取得する
2. If `profiles.slack_user_id` が NULL または空文字列である場合, then the Notifications Module shall メンション文字列として `<!here>` を返す
3. If `profiles.slack_user_id` が登録済みである場合, then the Notifications Module shall メンション文字列として `<@{slack_user_id}>` を返す
4. If 担当コーチの `profiles` レコードが取得できなかった場合, then the Notifications Module shall メンション文字列として `<!here>` を返し、エラーログを出力する

### 6. ロール別の Slack ID 登録対象

**目的:** プロダクト責任者として、Slack ID 登録対象を Super Admin（自社コーチ）のみに限定したい。それにより、Manager（研修先企業管理者）など自社 Slack に存在しないユーザーへのメンション誤送信を防げる。

#### 受け入れ基準

1. The Admin User Detail Page shall Manager ロールのユーザー詳細画面では「Slack 連携」セクションを表示しない
2. The Admin User Detail Page shall User ロール（受講生）のユーザー詳細画面では「Slack 連携」セクションを表示しない
3. The `updateSlackUserId` / `clearSlackUserId` Server Actions shall 更新対象ユーザーのロールが Super Admin であることを検証する
4. If 更新対象ユーザーが Super Admin 以外である場合, then 両 Server Action shall 権限エラーを返し更新を行わない

## 非機能要件

### 性能
- Slack 通知送信は Server Action のレスポンスタイムを 300ms 以上遅延させない（Webhook 呼び出しは fire-and-forget で非同期化）

### 可観測性
- Slack 通知の成功・失敗・スキップ（環境変数未設定時）はすべて `console.log` / `console.error` で記録する
- 失敗時のログには対象イベント種別、受講生 ID、コーチ ID、HTTP ステータスを含める

### セキュリティ
- `SLACK_WEBHOOK_URL` は環境変数として Vercel に保存し、コードベースには含めない
- Slack User ID はメンション以外の用途には使用しない（個人情報ではないが、不要な露出を避ける）
- `updateSlackUserId` Server Action は Super Admin ロール以外からの呼び出しを拒否する

### 互換性
- 環境変数 `SLACK_WEBHOOK_URL` が未設定でもアプリケーションは正常に動作する（ローカル開発環境を考慮）
- `profiles.slack_user_id` の追加マイグレーションは後方互換であり、既存レコードは NULL のまま運用可能

### テスタビリティ
- メッセージビルダー（Block Kit 構築ロジック）はピュア関数として単体テスト可能とする
- Slack Webhook 呼び出し部分はモック可能なインターフェースで分離する
