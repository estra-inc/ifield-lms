# 要件定義書: Auth

## はじめに

本仕様は、社内LMSにおける招待制認証・アカウント管理の基盤を定義する。Super Adminが発行した招待URLを起点としたアカウント登録フロー、メール+パスワードによるログイン/ログアウト、パスワードリセット、Next.js Middlewareによるルート保護、Supabase Authのセットアップを対象範囲とする。

**スコープ外**: ユーザー管理画面（Super Admin CRUD）、プロフィール画像アップロード（Supabase Storage）、profilesテーブルの完全なRLS設計は別仕様で扱う。

## 要件

### 1. Supabase Auth セットアップ

**目的:** 開発者として、Supabase AuthをNext.js App Routerに統合したい。それにより、Cookie ベースのセッション管理を安全かつ一貫して行える基盤を確立できる。

#### 受け入れ基準

1. The Auth Module shall `@supabase/ssr` を使用してCookieベースのセッション管理用Supabaseクライアントを提供する
2. The Auth Module shall Server Components、Client Components、Route Handlers、Server Actionsそれぞれに適したSupabaseクライアント生成関数を提供する
3. The Auth Module shall 環境変数 `NEXT_PUBLIC_SUPABASE_URL` および `NEXT_PUBLIC_SUPABASE_ANON_KEY` を使用してSupabaseクライアントを初期化する
4. If 環境変数が未設定である場合, then the Auth Module shall アプリケーション起動時にわかりやすいエラーメッセージを出力する
5. The Auth Module shall Supabase Authのセッショントークン（access_token, refresh_token）をHTTPOnly Cookieに格納する
6. When Supabaseクライアントがリクエストを処理する際, the Auth Module shall 期限切れのアクセストークンを自動的にリフレッシュし、更新されたCookieをレスポンスに設定する

### 2. 招待制アカウント登録 -- 招待URL発行

**目的:** Super Adminとして、ユーザーまたはManagerを招待URLで招待したい。それにより、承認済みの人物のみがシステムにアカウントを作成できるようになる。

#### 受け入れ基準

1. The Auth Module shall Supabase Authの `auth.admin.inviteUserByEmail()` を使用して招待メールを送信する
2. When Super Adminが招待を実行する際, the Auth Module shall 招待対象のメールアドレスとロール（`user` または `manager`）を指定できる
3. When 招待メールが送信される際, the Auth Module shall Supabaseが生成したトークン付き招待URLをメール本文に含める
4. The Auth Module shall 招待URLのリダイレクト先を招待登録ページ（`/auth/invite/setup`）に設定する
5. If 既にアカウントが存在するメールアドレスに招待が実行された場合, then the Auth Module shall 重複招待エラーメッセージを表示する

### 3. 招待制アカウント登録 -- トークン検証・セッション確立

**目的:** 招待されたユーザーとして、招待URLにアクセスした際にトークンが自動的に検証されたい。それにより、安全にアカウント登録プロセスを開始できる。

#### 受け入れ基準

1. When ユーザーが招待URLにアクセスした際, the Auth Module shall Supabase Authの `auth.verifyOtp()` を使用してトークンの有効性を検証する
2. When トークン検証が成功した際, the Auth Module shall Supabase Authセッションを確立し、Cookieにセッション情報を保存する
3. When トークン検証が成功した際, the Auth Module shall ユーザーを招待登録ページ（`/auth/invite/setup`）にリダイレクトする
4. If トークンが無効または期限切れである場合, then the Auth Module shall エラーメッセージ「招待リンクが無効または期限切れです」を表示する
5. If トークンが無効または期限切れである場合, then the Auth Module shall 管理者への再招待依頼を促す案内文を表示する

### 4. 招待制アカウント登録 -- プロフィール設定

**目的:** 招待されたユーザーとして、氏名とパスワードを設定してアカウントを有効化したい。それにより、以降のログインとシステム利用が可能になる。

#### 受け入れ基準

1. While ユーザーが招待登録ページにいる間, the Auth Module shall 氏名（`full_name`）の入力フィールドを表示する
2. While ユーザーが招待登録ページにいる間, the Auth Module shall パスワードと確認用パスワードの入力フィールドを表示する
3. When ユーザーが登録フォームを送信した際, the Auth Module shall 氏名が空でないことをバリデーションする
4. When ユーザーが登録フォームを送信した際, the Auth Module shall パスワードが8文字以上であることをバリデーションする
5. When ユーザーが登録フォームを送信した際, the Auth Module shall パスワードと確認用パスワードが一致することをバリデーションする
6. When バリデーションが成功した際, the Auth Module shall Supabase Authの `auth.updateUser()` を使用してパスワードを設定する
7. When バリデーションが成功した際, the Auth Module shall `profiles` テーブルの `full_name` を更新する
8. When 登録が完了した際, the Auth Module shall ダッシュボード（`/dashboard`）へ自動的にリダイレクトする
9. If フォーム送信中にサーバーエラーが発生した場合, then the Auth Module shall ユーザーにエラーメッセージを表示し、再送信を可能にする
10. The Auth Module shall 登録完了後にプロフィール画像設定のステップを表示しない（プロフィール画像設定は設定画面の仕様として別途扱う）

### 5. ログイン

**目的:** 登録済みユーザーとして、メールアドレスとパスワードでログインしたい。それにより、自分のロールに応じたダッシュボードにアクセスできる。

#### 受け入れ基準

1. The Auth Module shall ログインページ（`/auth/login`）にメールアドレスとパスワードの入力フィールドを表示する
2. The Auth Module shall ログインページに「パスワードを忘れた方はこちら」リンクを表示する
3. When ユーザーがログインフォームを送信した際, the Auth Module shall メールアドレスが有効な形式であることをバリデーションする
4. When ユーザーがログインフォームを送信した際, the Auth Module shall パスワードが空でないことをバリデーションする
5. When バリデーションが成功した際, the Auth Module shall Supabase Authの `auth.signInWithPassword()` を使用して認証を実行する
6. When 認証が成功した際, the Auth Module shall ダッシュボード（`/dashboard`）へリダイレクトする
7. If メールアドレスまたはパスワードが不正である場合, then the Auth Module shall 「メールアドレスまたはパスワードが正しくありません」というエラーメッセージを表示する
8. If ユーザーが招待登録を完了していない場合（`full_name` 未設定）, then the Auth Module shall 招待登録ページ（`/auth/invite/setup`）へリダイレクトする
9. While ログイン処理中, the Auth Module shall 送信ボタンをローディング状態にし、二重送信を防止する

### 6. ログアウト

**目的:** 認証済みユーザーとして、システムからログアウトしたい。それにより、セッションを安全に終了できる。

#### 受け入れ基準

1. When ユーザーがログアウトアクションを実行した際, the Auth Module shall Supabase Authの `auth.signOut()` を使用してセッションを破棄する
2. When ログアウトが完了した際, the Auth Module shall セッションCookieを削除する
3. When ログアウトが完了した際, the Auth Module shall ログインページ（`/auth/login`）へリダイレクトする
4. If ログアウト処理中にエラーが発生した場合, then the Auth Module shall Cookieを強制的にクリアし、ログインページへリダイレクトする

### 7. パスワードリセット

**目的:** 登録済みユーザーとして、パスワードを忘れた際にリセットしたい。それにより、アカウントへのアクセスを回復できる。

#### 受け入れ基準

1. The Auth Module shall パスワードリセット要求ページ（`/auth/reset-password`）にメールアドレス入力フィールドを表示する
2. When ユーザーがパスワードリセットを要求した際, the Auth Module shall Supabase Authの `auth.resetPasswordForEmail()` を使用してリセットメールを送信する
3. When リセットメールの送信処理が完了した際, the Auth Module shall 「パスワードリセットメールを送信しました」という確認メッセージを表示する
4. The Auth Module shall セキュリティ上の理由から、入力されたメールアドレスが登録済みかどうかに関わらず同一の確認メッセージを表示する
5. When ユーザーがリセットメール内のリンクにアクセスした際, the Auth Module shall 新しいパスワード設定ページ（`/auth/reset-password/confirm`）を表示する
6. When ユーザーが新しいパスワードを設定した際, the Auth Module shall パスワードが8文字以上であることをバリデーションする
7. When ユーザーが新しいパスワードを設定した際, the Auth Module shall 新しいパスワードと確認用パスワードが一致することをバリデーションする
8. When パスワード更新が成功した際, the Auth Module shall Supabase Authの `auth.updateUser()` を使用してパスワードを更新する
9. When パスワード更新が成功した際, the Auth Module shall ログインページへリダイレクトし、成功メッセージを表示する
10. If リセットトークンが無効または期限切れである場合, then the Auth Module shall エラーメッセージを表示し、再度リセット要求を促す

### 8. Next.js Middleware によるルート保護

**目的:** システムとして、全リクエストに対して認証状態とアクセス権限を検証したい。それにより、未認証アクセスや権限外のリソースへのアクセスを防止できる。

#### 受け入れ基準

1. The Auth Middleware shall 全リクエストに対してSupabase Authのセッション有効性を検証する
2. When 未認証ユーザーが保護されたルート（`/dashboard` 等）にアクセスした場合, the Auth Middleware shall ログインページ（`/auth/login`）へリダイレクトする
3. When 認証済みユーザーがログインページまたは招待登録ページにアクセスした場合, the Auth Middleware shall ダッシュボード（`/dashboard`）へリダイレクトする
4. When 認証済みユーザーが招待登録を未完了（`full_name` 未設定）の状態で保護されたルートにアクセスした場合, the Auth Middleware shall 招待登録ページ（`/auth/invite/setup`）へリダイレクトする
5. The Auth Middleware shall 静的アセット（`_next/static`、`_next/image`、`favicon.ico`）へのリクエストをバイパスする
7. The Auth Middleware shall `auth/callback` ルートへのリクエストをバイパスし、Supabase Authのコールバック処理を許可する
8. When Middlewareがセッションを検証する際, the Auth Middleware shall 期限切れのアクセストークンを自動的にリフレッシュし、更新されたCookieをレスポンスに設定する

### 9. Auth コールバック処理

**目的:** システムとして、Supabase Authの認証コールバック（招待URL、パスワードリセット等）を正しく処理したい。それにより、外部リンクからのフローを完結させられる。

#### 受け入れ基準

1. The Auth Module shall Auth コールバックルート（`/auth/callback`）を提供する
2. When Supabase Authの招待URLからのコールバックを受信した際, the Auth Module shall 認証コードをセッショントークンに交換する
3. When コード交換が成功した際, the Auth Module shall ユーザーの `full_name` が未設定であれば招待登録ページ（`/auth/invite/setup`）へリダイレクトする
4. When コード交換が成功した際, the Auth Module shall ユーザーの `full_name` が設定済みであればダッシュボード（`/dashboard`）へリダイレクトする
5. When パスワードリセットからのコールバックを受信した際, the Auth Module shall 新しいパスワード設定ページ（`/auth/reset-password/confirm`）へリダイレクトする
6. If コード交換に失敗した場合, then the Auth Module shall エラーメッセージ付きでログインページ（`/auth/login`）へリダイレクトする

### 10. 認証UI共通要件

**目的:** 全ユーザーとして、認証関連ページで一貫したUI体験を得たい。それにより、直感的で安心感のある操作が可能になる。

#### 受け入れ基準

1. The Auth Module shall 認証関連ページ（`/auth/*`）にApp Shellのサイドバー/ヘッダーを表示しない（独立したレイアウトを使用する）
2. The Auth Module shall 認証関連ページにi.fieldのロゴとプロダクト名「LMS」を表示する
3. The Auth Module shall 全フォームにおいてクライアントサイドバリデーションをリアルタイムで実行し、エラーメッセージをフィールド直下に表示する
4. While フォーム送信処理中, the Auth Module shall 送信ボタンをローディング状態（スピナー + テキスト変更）にする
5. The Auth Module shall フォーム送信にNext.js Server Actionsを使用する
6. The Auth Module shall 認証関連ページのデザインをデザインシステム（`designs/design-system.pen`）のデザイントークンに準拠させる

## トレーサビリティマトリクス

| 要件ID | PRDセクション | 根拠 |
|--------|-------------|------|
| 1 (Supabase Auth セットアップ) | §7 非機能要件 + steering/tech.md | Supabase Auth + @supabase/ssr によるセッション管理基盤 |
| 2 (招待URL発行) | §4.1 認証・アカウント管理、§3 RBAC | Super Adminによる招待URL発行 |
| 3 (トークン検証) | §4.1 招待URLアクセス (ステップ1) | トークンの有効性検証 |
| 4 (プロフィール設定) | §4.1 氏名入力・パスワード設定 (ステップ2-3) | アカウント有効化の登録フロー |
| 5 (ログイン) | §3 RBAC 認証・設定 | 全ロール共通のログイン/ログアウト |
| 6 (ログアウト) | §3 RBAC 認証・設定 | 全ロール共通のログイン/ログアウト |
| 7 (パスワードリセット) | UXベストプラクティス | パスワード忘れ時の回復フロー |
| 8 (Middleware ルート保護) | §7 アクセス制御 | 認証状態・招待完了状態に基づくルート保護 |
| 9 (Auth コールバック) | Supabase Auth 技術要件 | PKCE認証フローのコールバック処理 |
| 10 (認証UI共通) | §5 サイトマップ (Login/Invite Setup) | 認証画面のUI/UX一貫性 |
