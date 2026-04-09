# Research & Design Decisions

---
**Purpose**: 通知機能の設計判断に必要な調査結果と技術的意思決定を記録する。
---

## Summary
- **Feature**: notifications
- **Discovery Scope**: New（新規機能。既存通知基盤は存在しない）
- **Key Findings**:
  - 現状の LMS には通知テーブル・メール送信・Slack 連携いずれも未実装
  - コーチング予約時に Google Calendar 連携は既に存在し、コーチ本人にはカレンダー側で通知が届く構造
  - `coaching_sessions` テーブルに `coach_id` が保存されているため、担当コーチの特定は1クエリで可能
  - `profiles` テーブルへの NULL 許容カラム追加で、後方互換のメンション機能を導入できる
  - Resend は導入済みだが、MVP スコープでは使用しない（受講生宛通知は別仕様で扱う）

## Research Log

### 既存の通知関連実装の有無
- **Context**: 通知基盤の重複実装を避けるため、既存のメール/Slack/通知テーブルを調査する必要がある。
- **Sources Consulted**: `lms-fe/lib/`, `supabase/migrations/` 配下全件、`docs/prd.md`、`.kiro/specs/` 配下全件
- **Findings**:
  - `notification` / `notify` という語が存在するのは PRD の「ダッシュボード(期限/進捗バー/通知)」というプレースホルダー表現のみで、実装は無し
  - メール送信ライブラリ（nodemailer, Resend SDK 等）の import は本フィーチャー以外に存在しない
  - Slack 関連のコード・環境変数・依存関係は全く存在しない
  - migration 全 22 本に通知テーブルの定義は無い
- **Implications**: ゼロから設計する。既存パターンとの整合よりも、最小実装で MVP を成立させることを優先する。

### コーチング予約フローの把握
- **Context**: A1 / A2 通知のフック箇所と取得可能な情報を確定する必要がある。
- **Sources Consulted**: `lms-fe/app/(authenticated)/coaching/actions.ts`, `lms-fe/app/(authenticated)/coaching/_components/session-history.tsx`, `lms-fe/lib/google-calendar.ts`
- **Findings**:
  - `bookSession` (`coaching/actions.ts:57`) は予約成功時に `coaching_sessions` へ INSERT し、`coach_id` を含めている
  - 同関数内で `selectedCoachId` / `selectedCoachName` を保持しており、通知に必要な情報は関数末尾で揃っている
  - `cancelSession` (`coaching/actions.ts:297`) は受講生キャンセル時にステータス更新と Google Calendar 削除を行う。所有権チェックも実施済み
  - `cancelSession` 内では `coach_id` を取得済み（`select("id, user_id, status, google_event_id, coach_id")`）
  - 受講生キャンセル機能は `_components/session-history.tsx` から呼び出され、UI 上から実行可能
- **Implications**: 両 Server Action の成功末尾でメッセージビルダーを呼ぶ設計が最も低コスト。`profiles` から `full_name` と `slack_user_id` を取得する追加クエリを1本足すだけで通知を組み立てられる。

### 担当コーチ情報の取得経路
- **Context**: 通知メッセージに「担当コーチ氏名」と「Slack User ID」を載せるために、最も効率的な取得方法を確定する。
- **Sources Consulted**: `coaching_sessions` の型定義 (`lib/types/database.ts`), `profiles` テーブル
- **Findings**:
  - `coaching_sessions.coach_id` は `profiles.id` を参照する FK
  - `bookSession` 内では既にコーチ氏名 (`selectedCoachName`) を取得済みのため、追加クエリは Slack ID のみで足りる
  - `cancelSession` ではコーチ氏名・Slack ID 両方を取得する必要あり（既存クエリには含まれていない）
  - Supabase クライアントの `select()` で `profiles!coach_id(full_name, slack_user_id)` のような JOIN は可能だが、シンプルに `eq("id", coachId).single()` で十分
- **Implications**: 通知ヘルパ内部で必要な情報を fetch する責務分離型の設計を採用。Server Action 側はイベント発火のみ。

### Slack Block Kit vs Plain Text
- **Context**: 通知メッセージのフォーマットを `text` / `attachments` / `blocks` のいずれにするか決定する。
- **Sources Consulted**: Slack API 公式ドキュメント (Block Kit), ユーザーとの議論履歴
- **Findings**:
  - `text` のみ: 1行プレーンテキスト。最もシンプルだが視認性が低い
  - `attachments`: 旧方式。色付きバーが出るが Slack は Block Kit を推奨している
  - `blocks` (Block Kit): 推奨方式。ヘッダー・複数フィールド・ボタンを構造的に表示でき、視認性が最も高い
  - メンション (`<@U...>`, `<!here>`) は `text` / `blocks` のいずれでも `mrkdwn` セクション内に埋め込める
- **Implications**: `blocks` 形式で統一する。`text` フィールドはフォールバック（通知バナー用）として簡潔な要約を入れる。

### Slack User ID の登録 UI 配置
- **Context**: Super Admin が他の Super Admin の Slack ID を編集できる UI を、既存のどの画面に統合するか決定する。
- **Sources Consulted**: `app/(authenticated)/admin/users/[id]/page.tsx`, `app/(authenticated)/admin/users/[id]/_components/coaching-credits-card.tsx`, `app/(authenticated)/admin/users/actions.ts`
- **Findings**:
  - `admin/users/[id]/page.tsx` には既に複数のセクション（基本情報、コーチングクレジット、コーチアサイン等）が並んでいる構造
  - 既存 Server Action `updateUserGenre` などと同じパターンで `updateSlackUserId` を追加可能
  - Super Admin かどうかの判定は `profiles.role === 'super_admin'` で行う既存パターンあり
  - Settings 画面（`app/(authenticated)/settings/`）に追加する案もあるが、運営側が代行登録できる「管理者詳細画面」配置の方が要件と合致
- **Implications**: `admin/users/[id]/_components/` 配下に新規カードコンポーネント（例: `slack-integration-card.tsx`）を追加する。表示条件は対象ユーザーのロール = `super_admin` のみ。

### `@here` フォールバックの妥当性
- **Context**: 担当コーチが Slack ID 未登録の場合のメンション挙動を決定する。
- **Sources Consulted**: ユーザーとの議論履歴、Slack 公式ドキュメント
- **Findings**:
  - `@here` (`<!here>`) は Slack 上でオンライン中のチャンネルメンバー全員に通知を送る
  - `@channel` (`<!channel>`) は全員（オフライン含む）に通知を送る。緊急度が高すぎるため不採用
  - メンション無し（プレーン投稿）はチャンネル投稿の通知設定次第で見落とされる可能性が高い
  - ユーザーの希望は「フォールバック時は `@here`」
- **Implications**: 未登録時は `@here` を使用。Slack ID 登録が普及するまでの暫定運用として機能する。

### Slack User ID のフォーマット（U / W プレフィックス）
- **Context**: Slack User ID のバリデーション正規表現を確定するため、プレフィックスの種類を調査する。
- **Sources Consulted**: Slack Developer Docs (User ID format changes, 2016-08-11), Slack API Enterprise Grid ドキュメント
- **Findings**:
  - Slack User ID は通常 `U` で始まる（例: `U01ABC123`）
  - Enterprise Grid 環境では `W` で始まる User ID も存在する（例: `W01ABC123`）
  - Slack 公式は「`U` と `W` を区別なく同じ User ID として扱うこと」と明示している
  - W プレフィックスは Slack が Enterprise Grid をリリースした際に導入された
  - 移行ユーザーは自動的に Enterprise ID にマッピングされ、後方互換性が保たれる
- **Implications**: バリデーション正規表現は `^[UW][A-Z0-9]+$` とする。社内 Slack が将来 Enterprise Grid に移行しても再対応が不要。
- **Sources**:
  - https://docs.slack.dev/changelog/2016/08/11/user-id-format-changes/
  - https://api.slack.com/enterprise/developing

### Slack ID 解除操作の UX
- **Context**: Slack ID の登録解除を「空入力 → 保存」で行うか、明示的な「解除」ボタンで行うかを決定する。
- **Sources Consulted**: `app/(authenticated)/admin/coaching/actions.ts:107` `adminDisconnectGoogleCalendar`, 既存の admin UI パターン
- **Findings**:
  - 既存の Google Calendar 連携機能には `adminDisconnectGoogleCalendar` という明示的な解除アクションがある
  - 「空入力 → 保存」方式は誤操作リスクが高く、ユーザーに「保存して良いか」の不安を与えやすい
  - 明示的な「解除」ボタン + 確認ダイアログのパターンは、admin UI における破壊的操作のデファクトスタンダード
- **Implications**: `updateSlackUserId`（登録/更新専用）と `clearSlackUserId`（解除専用）の2つの Server Action に分離する。UI 上は「解除」ボタンを Slack ID 登録済み時のみ表示し、確認ダイアログ経由で実行する。

### 環境変数未設定時の挙動
- **Context**: ローカル開発環境や Preview デプロイで `SLACK_WEBHOOK_URL` が未設定でもアプリが正常動作する必要がある。
- **Sources Consulted**: 既存の環境変数取得パターン（`lib/google-calendar.ts` での `GOOGLE_CLIENT_ID` 等）
- **Findings**:
  - 既存パターンは「未設定なら例外を投げる」だが、これは必須機能（OAuth）だから許容される
  - 通知は付加機能であり、未設定で例外を投げると本番以外の環境でアプリが動かなくなるリスクがある
  - 例外を投げず警告ログ + no-op が望ましい
- **Implications**: `SLACK_WEBHOOK_URL` 未設定時は通知をスキップし、`console.warn` でログを出すのみ。Server Action は通常通り完了する。
