# Implementation Plan

- [ ] 1. データベースマイグレーションとスキーマ更新
- [x] 1.1 profiles テーブルへの姓名カラム追加マイグレーション
  - `profiles` テーブルに `last_name` / `first_name` カラム（text, nullable）を追加するマイグレーションを作成する
  - 既存の `full_name` データを姓名に分割して `last_name` / `first_name` へ移行するデータマイグレーションを含める
  - `full_name` は既存の `"姓 名"` フォーマットに基づき最初のスペースで分割する
  - TypeScript の Database 型定義（`lib/types/database.ts`）に `last_name` / `first_name` を追加する
  - _Requirements: 3.1_

- [x] 1.2 system_integrations テーブル新規作成マイグレーション
  - `system_integrations` テーブルを作成する（`id`, `service_name`（UK）, `encrypted_refresh_token`, `business_hours`（JSONB）, `connected_at`, タイムスタンプ）
  - RLS を有効化し、Super Admin のみが SELECT / INSERT / UPDATE 可能なポリシーを設定する
  - `google_calendar` の初期シードデータを投入する（デフォルトのビジネスアワー設定を含む）
  - TypeScript の Database 型定義に `system_integrations` テーブルの型を追加する
  - _Requirements: 6.2, 6.7, 7.3, 7.4_

- [x] 1.3 (P) avatars バケットの RLS ポリシー設定
  - avatars Storage バケットに対する RLS ポリシーを作成する（INSERT / UPDATE / DELETE は自身のフォルダのみ、SELECT は全ユーザー参照可能）
  - フォルダパス制約として `(storage.foldername(name))[1] = auth.uid()::text` を適用する
  - _Requirements: 7.1, 7.5_

- [x] 2. バリデーションスキーマの定義
  - プロフィール編集用スキーマ（`lastName` / `firstName` の必須バリデーション）を定義する
  - パスワード変更用スキーマ（8文字以上、確認パスワード一致の refine）を定義する
  - アバター画像のクライアントサイドバリデーション定数（許可 MIME タイプ: JPEG / PNG / WebP、最大サイズ: 2MB）を定義する
  - 稼働時間枠用スキーマ（slots の Record 型、holidayShift ブール値、bufferMinutes / slotDurationMinutes の数値制約）を定義する
  - _Requirements: 3.2, 4.2, 4.4, 5.3, 5.4, 6.7_

- [ ] 3. Server Actions の実装（プロフィール・アカウント）
- [x] 3.1 (P) プロフィール更新 Server Action
  - 認証確認後に Zod サーバーサイドバリデーションを実行し、`profiles` テーブルの `last_name` / `first_name` / `full_name` を更新する Server Action を実装する
  - `full_name` は常に `"${last_name} ${first_name}"` として同期更新する
  - 更新成功時に `revalidatePath` を呼び出し、`ActionResult` 形式で成功/エラーメッセージを返す
  - RLS により自身のプロフィールのみ更新可能であることを前提とする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1_

- [x] 3.2 (P) アバター画像アップロード Server Action
  - サーバーサイドで MIME タイプ（JPEG / PNG / WebP）とファイルサイズ（2MB 上限）を検証する
  - 既存のアバターファイルを Storage から list + remove で削除した後、新しい画像を `${userId}/avatar.${ext}` パスにアップロードする
  - アップロード成功後に `getPublicUrl` で URL を取得し、`profiles.avatar_url` を更新する
  - 成功時は新しい `avatarUrl` を含む結果を返し、エラー時は適切なメッセージを返す
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 7.5_

- [x] 3.3 (P) パスワード変更 Server Action
  - 認証確認後に Zod サーバーサイドバリデーション（8文字以上、確認一致）を実行する
  - Supabase Admin API（`adminClient.auth.admin.updateUserById`）を使用してパスワードを更新する
  - 成功/エラーの `ActionResult` を返す
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 7.2_

- [x] 4. 設定ページのルーティングとレイアウト
  - `/settings` パスに Server Component のエントリーポイントを作成する
  - 認証確認を行い、未認証時はログインページにリダイレクトする
  - `profiles` テーブルからユーザー情報（`last_name`, `first_name`, `full_name`, `email`, `avatar_url`, `role`）をフェッチする
  - shadcn/ui の Tabs コンポーネントで「プロフィール」「アカウント」のタブを表示する
  - Super Admin の場合のみ「システム設定」タブを追加表示し、`system_integrations` テーブルからデータをフェッチする
  - 非 Super Admin にはシステム設定タブを表示しない
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 5. プロフィールタブ UI の実装
- [x] 5.1 プロフィール表示と編集フォーム
  - ユーザーの現在の名前、メールアドレス（ロックアイコン付き読み取り専用）、ロール（バッジ表示）を表示する
  - 姓・名の2フィールド構成の編集フォームを React Hook Form + Zod で構築する
  - 「※ 正式な表記で氏名を入力してください」の注意書きを表示する
  - `useActionState` + `useTransition` で Server Action を呼び出し、送信中はボタンを disabled 化してローディング表示する
  - 保存成功時にトーストで成功メッセージを表示し、エラー時はフォーム入力を保持してエラーメッセージを表示する
  - バリデーションエラーは該当フィールドをハイライトして修正方法を案内する
  - _Requirements: 2.1, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 8.1, 8.2, 8.3_

- [x] 5.2 アバター画像コンポーネント
  - 現在のアバター画像を円形で表示し、未設定時はデフォルトアイコンを表示する
  - ファイル選択時にクライアントサイドでファイル形式（JPEG / PNG / WebP）とサイズ（2MB）を検証し、不正時はエラーメッセージを表示する
  - Canvas API で最大 512x512px にリサイズし、WebP 形式で品質調整して圧縮する処理を実装する
  - 選択後にリサイズ済みプレビューを表示し、アップロードを実行する
  - アップロード成功時にプレビューを新画像に更新し、エラー時はメッセージを表示する
  - hidden input + クリックハンドラのパターンでファイル選択を実装する
  - _Requirements: 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1, 8.2_

- [x] 6. アカウントタブ UI の実装
  - パスワード変更フォーム（新しいパスワード、確認パスワード）を React Hook Form + Zod で構築する
  - パスワード不一致時・最低文字数未満時のバリデーションエラーをフィールドレベルで表示する
  - `useActionState` + `useTransition` で Server Action を呼び出し、送信中はローディング表示と二重送信防止を行う
  - 成功時にフォームをリセットして成功トーストを表示し、エラー時はメッセージを表示する
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 8.1, 8.2, 8.3_

- [ ] 7. Super Admin 向けシステム設定（Google Calendar 連携）
- [x] 7.1 Google Calendar OAuth Server Actions と API Route
  - OAuth 認可 URL を生成する Server Action を実装する（`access_type=offline`, `prompt=consent`, `scope=calendar.readonly`）
  - CSRF 対策として `state` パラメータにランダムトークンを含め、Cookie に保存して検証する仕組みを実装する
  - OAuth コールバック API Route（`/api/auth/google/callback`）を実装し、認可コードをトークンに交換する
  - リフレッシュトークンを AES-256-GCM で暗号化して `system_integrations` テーブルに保存する
  - 連携解除 Server Action を実装し、`encrypted_refresh_token` を NULL に更新する
  - 全ての Server Action / API Route で Super Admin 権限確認を行う
  - _Requirements: 6.3, 6.4, 6.5, 7.3, 7.4_

- [x] 7.2 Google Calendar 連携 UI セクション
  - 連携ステータス（連携済み / 未連携）をバッジで表示する
  - 未連携時は「Google Calendar と連携」ボタンを表示し、押下時に OAuth 認可フローを開始する（Server Action で URL 取得後 `window.location.href` でリダイレクト）
  - 連携済み時は「連携解除」ボタンを表示し、確認ダイアログ表示後に解除を実行する
  - OAuth コールバック後の `/settings` リダイレクト時にステータスが更新表示されることを確認する
  - _Requirements: 6.2, 6.3, 6.5, 8.1_

- [x] 8. Super Admin 向けシステム設定（稼働時間枠管理）
- [x] 8.1 稼働時間枠保存 Server Action
  - Super Admin 権限確認後に Zod で business_hours JSON のバリデーションを実行する
  - `system_integrations` テーブルの `business_hours` カラムを UPSERT で更新する
  - 成功/エラーの `ActionResult` を返す
  - _Requirements: 6.7, 6.8, 7.3_

- [x] 8.2 週間カレンダーグリッド UI
  - 7列（月〜日）x 時間帯行のグリッドレイアウトを構築し、各セルのクリックで稼働/非稼働をトグルする
  - `useState` でローカル状態を管理し、保存ボタン押下時に Server Action へ送信する明示的コミットパターンを採用する
  - 追加オプション入力（祝日シフト設定のチェックボックス、前後確保時間の分単位入力、1枠スロット時間の分単位入力）を実装する
  - モバイルではグリッドを横スクロール可能なテーブルレイアウトにする
  - 保存中はローディング表示と二重送信防止を行い、成功時にトーストを表示する
  - _Requirements: 6.6, 6.7, 6.8, 8.1, 8.2, 8.4_

- [x] 9. レスポンシブ対応と統合テスト
- [x] 9.1 レスポンシブデザインの調整
  - 設定ページ全体がモバイル端末でも操作可能であることを確認・調整する
  - タブ表示、フォームレイアウト、アバターアップロード領域のモバイル対応を検証する
  - _Requirements: 8.4_

- [x] 9.2 全機能の統合確認
  - プロフィール編集（姓名変更 -> 保存 -> full_name 同期）の一連のフローを確認する
  - アバター画像変更（ファイル選択 -> バリデーション -> アップロード -> プレビュー更新 -> 旧画像削除）のフローを確認する
  - パスワード変更（入力 -> バリデーション -> 更新 -> 成功メッセージ -> フォームリセット）のフローを確認する
  - Super Admin でのタブ切り替え（プロフィール / アカウント / システム設定）と非 Super Admin でのシステム設定タブ非表示を確認する
  - Google Calendar 連携（OAuth フロー -> トークン保存 -> ステータス更新 -> 連携解除）のフローを確認する
  - 稼働時間枠（グリッド操作 -> 保存 -> DB 反映）のフローを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 4.1, 4.5, 4.7, 5.2, 5.5, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.3, 8.4_
