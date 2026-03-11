# Implementation Plan

- [x] 1. パッケージ導入と Supabase クライアント基盤の構築
- [x] 1.1 認証関連パッケージのインストール
  - `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `react-hook-form`, `@hookform/resolvers` を追加する
  - shadcn/ui の Form コンポーネント (`form.tsx`) を導入する
  - _Requirements: 1.1, 1.3_

- [x] 1.2 Supabase クライアント生成関数の実装（ブラウザ用・サーバー用・Middleware 用）
  - ブラウザ用クライアント: `createBrowserClient` を使用し、Client Components から Cookie ベースで Supabase にアクセスできるようにする
  - サーバー用クライアント: `createServerClient` + `cookies()` API を使用し、Server Components / Server Actions / Route Handlers から Cookie ベースで認証操作を行えるようにする
  - Middleware 用クライアント: `request.cookies` と `response.cookies` の両方を操作し、トークンリフレッシュと Cookie 更新を行う `updateSession` 関数を提供する
  - 環境変数 `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が未設定の場合にわかりやすいエラーメッセージを出力する
  - セッショントークン (access_token, refresh_token) を HTTPOnly Cookie に格納する
  - `getClaims()` による JWT 署名検証を使用し、`getSession()` は使用しない
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - _Contracts: SupabaseBrowserClient Service, SupabaseServerClient Service, SupabaseMiddlewareClient Service_

- [x] 1.3 Supabase Database 型定義ファイルの作成
  - `profiles` テーブルを含むデータベース型定義を作成し、Supabase クライアントの型パラメータとして使用できるようにする
  - _Requirements: 1.1_

- [x] 2. バリデーションスキーマと共通型の定義
- [x] 2.1 (P) 認証フォーム用 zod バリデーションスキーマの実装
  - ログインスキーマ: メールアドレス（必須、メール形式）とパスワード（必須、空チェック）の検証ルールを定義する
  - 招待登録 Step 1 スキーマ: 姓（必須）と名（必須）の検証ルールを定義する
  - 招待登録 Step 2 スキーマ: パスワード（必須、8文字以上）と確認用パスワード（必須、一致チェック）の検証ルールを定義する
  - パスワードリセット要求スキーマ: メールアドレス（必須、メール形式）の検証ルールを定義する
  - パスワードリセット確認スキーマ: 新パスワード（必須、8文字以上）と確認用パスワード（必須、一致チェック）の検証ルールを定義する
  - すべてのエラーメッセージは日本語で定義する
  - クライアントサイドとサーバーサイドの双方で同一スキーマを共有する
  - _Requirements: 4.3, 4.4, 4.5, 5.3, 5.4, 7.6, 7.7_
  - _Contracts: AuthValidationSchemas Service_

- [x] 2.2 (P) Server Actions 共通戻り値型 (ActionResult) の定義
  - Server Actions の戻り値として `{ success: boolean; message: string } | null` 型を定義する
  - `useActionState` と連携してフォーム UI にフィードバックを表示する際のインターフェースとなる
  - _Requirements: 4.9, 5.7_

- [x] 3. 認証 Server Actions の実装
- [x] 3.1 ログイン Server Action の実装
  - zod スキーマによるサーバーサイドバリデーションを実行する
  - `signInWithPassword()` を使用してメール + パスワード認証を行う
  - 認証成功時に `profiles` テーブルから `full_name` を取得し、未設定であれば招待登録ページへ、設定済みであればダッシュボードへリダイレクトする
  - 認証失敗時に「メールアドレスまたはパスワードが正しくありません」というエラーメッセージを返す
  - _Requirements: 5.5, 5.6, 5.7, 5.8, 10.5_
  - _Contracts: AuthServerActions Service (login)_

- [x] 3.2 (P) ログアウト Server Action の実装
  - `signOut()` を使用してセッションを破棄する
  - セッション Cookie を削除する
  - ログインページへリダイレクトする
  - エラー発生時は Cookie を強制クリアしたうえでログインページへリダイレクトする
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 10.5_
  - _Contracts: AuthServerActions Service (logout)_

- [x] 3.3 招待登録完了 Server Action の実装
  - Step 1（姓名）と Step 2（パスワード）のデータを一括で受け取り、zod スキーマでサーバーサイドバリデーションを実行する
  - `updateUser({ password })` でパスワードを設定する
  - `profiles` テーブルの `full_name` を `${lastName} ${firstName}` として更新する
  - アバター画像が添付されている場合は Supabase Storage (`avatars` バケット) にアップロードし、`profiles.avatar_url` を更新する
  - 登録完了後にダッシュボードへリダイレクトする
  - サーバーエラー発生時はエラーメッセージを返し、再送信を可能にする
  - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 10.5_
  - _Contracts: AuthServerActions Service (completeInviteSetup)_

- [x] 3.4 パスワードリセット要求 Server Action の実装
  - `resetPasswordForEmail()` を使用してリセットメールを送信する
  - リダイレクト先をパスワードリセット確認ページに設定する
  - セキュリティ上の理由から、メールアドレスの登録有無に関わらず同一の確認メッセージ「パスワードリセットメールを送信しました」を返す
  - _Requirements: 7.2, 7.3, 7.4, 10.5_
  - _Contracts: AuthServerActions Service (requestPasswordReset)_

- [x] 3.5 パスワードリセット確認 Server Action の実装
  - zod スキーマでパスワード（8文字以上）と確認パスワード（一致チェック）のサーバーサイドバリデーションを実行する
  - `updateUser({ password })` でパスワードを更新する
  - 更新成功後にログインページへリダイレクトし、成功メッセージをクエリパラメータで伝達する
  - _Requirements: 7.6, 7.7, 7.8, 7.9, 10.5_
  - _Contracts: AuthServerActions Service (confirmPasswordReset)_

- [x] 4. Auth コールバック Route Handler の実装
- [x] 4.1 招待・パスワードリセットのコールバック処理
  - `/auth/callback` エンドポイントを Route Handler (GET) として作成する
  - URL パラメータの `type` に基づき処理を分岐する
  - `type=invite` の場合: `verifyOtp({ token_hash, type: 'invite' })` でトークンを検証しセッションを確立する。`full_name` 未設定なら招待登録ページへ、設定済みならダッシュボードへリダイレクトする
  - `type=recovery` の場合: `exchangeCodeForSession(code)` でセッションを確立し、パスワードリセット確認ページへリダイレクトする
  - トークン検証失敗時: 招待の場合はエラーページ (`/auth/invite/error`) へ、リカバリーの場合はログインページへエラーメッセージ付きでリダイレクトする
  - 不正な `type` パラメータの場合はログインページへリダイレクトする
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  - _Contracts: AuthCallbackRoute API_

- [x] 5. Next.js Middleware によるルート保護の実装
- [x] 5.1 Middleware の作成とルート分類の定義
  - `matcher` config で静的アセット (`_next/static`, `_next/image`, `favicon.ico`)、画像ファイル (`.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`)、`auth/callback` をバイパスする
  - ルート分類定数を定義する: `AUTH_ROUTES` (認証ページ), `INVITE_SETUP_ROUTE`
  - _Requirements: 8.5, 8.6_
  - _Contracts: AuthMiddleware Service_

- [x] 5.2 セッション検証とリダイレクトロジックの実装
  - `updateSession` でトークンリフレッシュを実行し、期限切れのアクセストークンを自動リフレッシュして更新された Cookie をレスポンスに設定する
  - `getClaims()` で認証状態を判定する
  - 未認証ユーザーが保護ルートにアクセスした場合はログインページへリダイレクトする
  - 認証済みユーザーがログインページや認証ページにアクセスした場合はダッシュボードへリダイレクトする
  - 認証済みユーザーに対して `profiles` テーブルから `full_name` を最小限のフィールドで取得する
  - `full_name` 未設定の場合は招待登録ページへリダイレクトする（招待登録ページ自体へのアクセスは許可）
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7_
  - _Contracts: AuthMiddleware Service_

- [x] 6. 認証 UI 共通レイアウトと共有コンポーネントの構築
- [x] 6.1 (P) 認証ページ共通レイアウトの作成
  - `auth/` ディレクトリのレイアウトとして、App Shell（サイドバー/ヘッダー）を含まない独立レイアウトを作成する
  - Server Component として実装する
  - _Requirements: 10.1, 10.6_
  - _Contracts: AuthLayout_

- [x] 6.2 (P) ローディング状態付き送信ボタン (SubmitButton) の作成
  - `useFormStatus` の `pending` を監視し、送信中はボタンを disabled にしてスピナーを表示する
  - テキストを動的に変更する機能を提供する（例: 「ログイン」から「ログイン中...」）
  - shadcn/ui の Button を拡張して実装する
  - 二重送信を防止する
  - _Requirements: 5.9, 10.4_
  - _Contracts: SubmitButton_

- [x] 7. ログイン画面の実装
- [x] 7.1 ログインページの UI 構築
  - i.field ロゴ画像と「LMS にログイン」タイトル、サブテキストを表示する
  - メールアドレスとパスワードの入力フィールドを表示する
  - 「パスワードを忘れた方はこちら」リンクをパスワードフィールドの上に表示し、パスワードリセットページへ遷移する
  - ログインボタン (Primary, 全幅) を配置する
  - 招待メール案内テキストを表示する
  - デザインシステム (`designs/auth.pen`) の "Login" フレームに準拠した見た目を実現する
  - _Requirements: 5.1, 5.2, 10.2, 10.6_
  - _Contracts: LoginForm State_

- [x] 7.2 ログインフォームのバリデーションとサーバー連携
  - react-hook-form + zodResolver でクライアントサイドのリアルタイムバリデーションを実装する
  - メール形式チェックとパスワード空チェックのエラーメッセージをフィールド直下に表示する
  - `useActionState` で login Server Action の結果を管理し、認証失敗時のエラーメッセージをフォームに表示する
  - URL パラメータ `?message=password-updated` でパスワードリセット成功メッセージを表示する
  - 送信中は SubmitButton をローディング状態にし、二重送信を防止する
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 10.3, 10.4_

- [x] 8. 招待登録画面の実装
- [x] 8.1 招待登録フォームの 2 ステップ UI 構築
  - クライアントサイドのステート (`currentStep: 1 | 2`) でステップを管理し、URL を変えずに画面を切り替える
  - **Step 1（氏名設定）**: i.field ロゴ + 「アカウント設定」タイトル + 説明テキスト、ステッパー UI（Step 1 アクティブ、Step 2 非アクティブ）、アバター画像の任意アップロードエリア（破線円形）、姓・名の横並び入力フィールド、「次へ」ボタン (Primary, 全幅)
  - **Step 2（パスワード設定）**: ステッパー UI（Step 1 完了チェック、Step 2 アクティブ）、パスワードと確認用パスワードの入力フィールド、「アカウントを作成」ボタン (Primary, 全幅)、「戻る」リンク
  - デザインシステム (`designs/auth.pen`) の "Invite Setup - Step 1" / "Invite Setup - Step 2" フレームに準拠する
  - _Requirements: 4.1, 4.2, 4.10, 10.2, 10.6_
  - _Contracts: InviteSetupForm State_

- [x] 8.2 招待登録フォームのバリデーションとサーバー連携
  - Step 1: react-hook-form + zodResolver で姓名の必須チェックをリアルタイムバリデーションする
  - Step 2: react-hook-form + zodResolver でパスワード 8 文字以上・確認パスワード一致チェックをリアルタイムバリデーションする
  - Step 1 から Step 2 への遷移時に Step 1 のデータをローカルステートに保持する
  - Step 2 送信時に Step 1 データ + Step 2 データ + アバターファイルをまとめて FormData に格納し、`useTransition` の `startTransition` 内で `formAction` を呼び出す（React 19 では `useActionState` の `formAction` をプログラマティックに呼び出す場合 `startTransition` が必須）
  - `useActionState` でサーバーエラーを管理し、エラー発生時にメッセージを表示して再送信を可能にする
  - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 10.3, 10.4_

- [x] 9. 招待エラーページの実装
- [x] 9.1 (P) 招待リンク無効時のエラーページ作成
  - i.field ロゴを表示する
  - 赤い円形背景に「!」アイコン（Lucide `AlertCircle`）を表示する
  - 「招待リンクが無効または期限切れです」というタイトルを表示する
  - 管理者への再招待依頼を促す案内文を表示する
  - 「ログインページに戻る」ボタン (Outline スタイル, 全幅) を表示する
  - Server Component として実装する（インタラクション不要）
  - デザインシステム (`designs/auth.pen`) の "Invite Error" フレームに準拠する
  - _Requirements: 3.4, 3.5, 10.6_
  - _Contracts: InviteErrorPage_

- [x] 10. パスワードリセット画面の実装
- [x] 10.1 パスワードリセット要求ページの UI 構築とサーバー連携
  - i.field ロゴ + 「パスワードリセット」タイトル + 説明テキストを表示する
  - メールアドレス入力フィールド (placeholder: "name@example.com") を表示する
  - 「リセットメールを送信」ボタン (Primary, 全幅) を表示する
  - 「ログインに戻る」リンクを表示する
  - react-hook-form + zodResolver でメール形式のリアルタイムバリデーションを実装する
  - `useActionState` で `requestPasswordReset` Server Action の結果を管理する
  - 送信成功時にフォームを非表示にして確認メッセージ「パスワードリセットメールを送信しました」を表示する
  - デザインシステム (`designs/auth.pen`) の "Password Reset Request" フレームに準拠する
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 10.2, 10.3, 10.4, 10.6_
  - _Contracts: ResetPasswordForm State_

- [x] 10.2 パスワードリセット確認ページの UI 構築とサーバー連携
  - i.field ロゴ + 「新しいパスワードを設定」タイトル + サブテキストを表示する
  - 新パスワードと確認用パスワードの入力フィールドを表示する
  - 「パスワードを更新」ボタン (Primary, 全幅) を表示する
  - react-hook-form + zodResolver でパスワード 8 文字以上・確認パスワード一致チェックをリアルタイムバリデーションする
  - `useActionState` で `confirmPasswordReset` Server Action の結果を管理する
  - リセットトークンが無効の場合はエラーメッセージを表示し、再度リセット要求を促す
  - デザインシステム (`designs/auth.pen`) の "Password Reset Confirm" フレームに準拠する
  - _Requirements: 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 10.2, 10.3, 10.4, 10.6_
  - _Contracts: ResetPasswordConfirmForm State_

- [x] 11. 既存コードとの統合とスモークテスト
- [x] 11.1 既存 App Shell からのログアウト連携
  - 既存の `(authenticated)` Route Group のサイドバーフッターメニューにログアウトアクションを接続する
  - ログアウト Server Action を呼び出し、セッション破棄後にログインページへ遷移する動線を確認する
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 11.2 ルート保護の統合確認
  - Middleware が既存の `(authenticated)` ルートを適切に保護していることを確認する
  - 未認証状態でのダッシュボードアクセス → ログインページリダイレクトの動作を検証する
  - 認証済み状態でのログインページアクセス → ダッシュボードリダイレクトの動作を検証する
  - 招待未完了状態での保護ルートアクセス → 招待登録ページリダイレクトの動作を検証する
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7_
