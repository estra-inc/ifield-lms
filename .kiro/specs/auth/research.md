# 調査・設計判断記録: Auth

## サマリー
- **機能**: auth (認証・アカウント管理基盤)
- **ディスカバリースコープ**: New Feature (グリーンフィールド)
- **主要な発見事項**:
  - `@supabase/ssr` は PKCE フローをデフォルトで使用するが、`inviteUserByEmail()` は PKCE 非対応。招待フローでは Implicit Grant (token_hash) 方式でコールバック処理を行う必要がある
  - サーバーサイドでのセッション検証は `getClaims()` を使用し、`getSession()` は JWT 再検証を保証しないため使用禁止
  - 環境変数名が `NEXT_PUBLIC_SUPABASE_ANON_KEY` から `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` へ移行中。当面は `ANON_KEY` を使用（steering/tech.md の記述と整合）

## 調査ログ

### @supabase/ssr のクライアント生成パターン
- **背景**: Next.js App Router 環境で Server Components / Client Components / Route Handlers / Server Actions / Middleware の各コンテキストに適したSupabaseクライアント生成が必要
- **参照ソース**: [Supabase SSR Docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Next.js Setup Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- **発見事項**:
  - `createBrowserClient` (Client Components用): ブラウザ側で Cookie を自動管理
  - `createServerClient` (Server Components / Server Actions / Route Handlers用): `cookies()` API を介した Cookie 管理が必要
  - Middleware 用クライアント: `request.cookies` と `response.cookies` の両方を操作してトークンリフレッシュを実現
- **設計への影響**: `lib/supabase/` に `client.ts`, `server.ts`, `middleware.ts` の 3 ファイル構成を採用

### 招待フローと PKCE の非互換性
- **背景**: `auth.admin.inviteUserByEmail()` を使用した招待フローで PKCE が使えるか検証
- **参照ソース**: [inviteUserByEmail API Docs](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [PKCE Flow Docs](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- **発見事項**:
  - PKCE は `inviteUserByEmail` 非対応（招待発行ブラウザと招待受諾ブラウザが異なるため、PKCE の code_verifier を共有できない）
  - 招待メール内の URL には `token_hash` と `type=invite` パラメータが含まれる
  - コールバックルートで `token_hash` + `type` を受け取り、`exchangeCodeForSession()` ではなく `verifyOtp({ token_hash, type: 'invite' })` でセッションを確立する
- **設計への影響**: Auth Callback Route Handler で `type` パラメータに基づき処理を分岐。招待トークンは `verifyOtp`、パスワードリセットは `exchangeCodeForSession` (PKCE) を使用

### パスワードリセットフロー
- **背景**: `resetPasswordForEmail()` → メール → コールバック → `updateUser()` のフロー設計
- **参照ソース**: [resetPasswordForEmail API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [Password Auth Guide](https://supabase.com/docs/guides/auth/passwords)
- **発見事項**:
  - `resetPasswordForEmail()` はリセットメールの送信のみ。パスワード更新は別途 `updateUser({ password })` を呼び出す
  - パスワードリセットリンクのクリック時、`PASSWORD_RECOVERY` イベントが発行される
  - PKCE フロー対応: リセットメールの URL に `code` パラメータが含まれ、コールバックルートで `exchangeCodeForSession()` を使用してセッションを確立
  - セッション確立後、`/auth/reset-password/confirm` へリダイレクトし、`updateUser()` でパスワードを更新
- **設計への影響**: コールバックルートで `type=recovery` の場合はパスワードリセット確認ページへリダイレクト

### getClaims() vs getUser() vs getSession()
- **背景**: サーバーサイドでの認証検証に最適なメソッドを決定
- **参照ソース**: [Clarify getClaims/getUser usage](https://github.com/supabase/supabase/issues/40985), [Advanced SSR Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- **発見事項**:
  - `getClaims()`: JWT 署名をローカルで検証（JWKS エンドポイント使用）。高速かつ安全。Middleware やページ保護に推奨
  - `getUser()`: Auth サーバーへ毎回問い合わせ。最新のユーザー情報を取得。ログアウト検知に確実だがレイテンシ増
  - `getSession()`: サーバーサイドコードでは JWT 再検証を保証しないため **使用禁止**
- **設計への影響**: Middleware では `getClaims()` を使用。プロフィール情報が必要な場面（招待完了チェック）では `getUser()` + profiles テーブル JOIN

### react-hook-form + zod + shadcn/ui Form
- **背景**: クライアントサイドバリデーションとサーバーサイドバリデーションの統一アプローチ
- **参照ソース**: [shadcn/ui Form Docs](https://ui.shadcn.com/docs/forms/react-hook-form)
- **発見事項**:
  - shadcn/ui の `<Form>` コンポーネントは react-hook-form を内包し、zod スキーマとの統合をサポート
  - `zodResolver` でクライアントサイドバリデーションを実行し、同じ zod スキーマを Server Actions 内でも再利用可能
  - エラーメッセージは `<FormMessage>` コンポーネントでフィールド直下に自動表示
- **設計への影響**: 各フォームで共通の zod スキーマを `lib/validations/auth.ts` に定義し、クライアント/サーバー双方で使用

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク / 制限 |
|-----------|------|------|-------------|
| Server Actions + Client Components | フォーム送信を Server Actions で処理し、UI は Client Components で管理 | Next.js の推奨パターン、zod スキーマの共有が容易 | Client Component が増える |
| API Routes + fetch | 従来の REST API パターン | 柔軟なエラーハンドリング | Server Actions と比較してボイラープレートが増加 |

**選択**: Server Actions + Client Components。requirements.md 10.5 で Server Actions の使用が明示的に要求されている。

## 設計判断

### 判断: Auth Callback の処理分岐
- **背景**: 招待 URL とパスワードリセットで異なるトークン検証メカニズムが必要
- **検討した代替案**:
  1. 単一コールバックルートで `type` パラメータに基づき分岐
  2. `/auth/callback/invite` と `/auth/callback/reset` に分離
- **選択したアプローチ**: 単一コールバックルート (`/auth/callback`) で `type` パラメータに基づき分岐
- **理由**: Supabase Auth のデフォルトコールバック URL 設定と整合。ルーティングが簡潔
- **トレードオフ**: ルートハンドラ内の条件分岐が増えるが、2 パターンのみなので管理可能

### 判断: 招待登録フローの画面構成
- **背景**: UI デザイン (auth.pen) では招待登録を単一画面で構成
- **検討した代替案**:
  1. ステッパー付きマルチステップ (Step 1: 氏名, Step 2: パスワード)
  2. 単一フォーム (氏名 + パスワード + 確認パスワードを一画面)
- **選択したアプローチ**: 単一フォーム。auth.pen の Invite Setup 画面が氏名・パスワード・確認パスワードを一画面で構成している
- **理由**: デザインファイルの指定に忠実。フィールド数が 3 つのみであり、ステッパーの必要性が低い
- **フォローアップ**: 要件定義書の記述ではステッパーに言及されているが、確定済み UI デザインを優先する

### 判断: Middleware での profiles テーブル参照方法
- **背景**: Middleware で `full_name` 未設定チェックが必要
- **検討した代替案**:
  1. Middleware 内で Supabase クエリを実行
  2. JWT カスタムクレームに `full_name` を含める
  3. Middleware では JWT 検証のみ行い、profiles チェックは Server Components で実施
- **選択したアプローチ**: Middleware 内で Supabase クエリを実行
- **理由**: JWT カスタムクレームの設定は Supabase の Database Functions (auth.hook) 設定が必要で初期実装の複雑性が増す。Server Components でのチェックではルート保護が不完全になる
- **トレードオフ**: リクエストごとに DB クエリが発生するが、profiles テーブルは小規模（社内 LMS）でパフォーマンス影響は軽微

## リスクと緩和策
- **リスク 1**: 招待トークンの有効期限が短すぎてユーザーが登録できない — Supabase ダッシュボードで招待トークンの有効期限を適切に設定（デフォルト 24 時間）
- **リスク 2**: Middleware での DB クエリがパフォーマンスに影響 — 社内 LMS の規模（〜数十ユーザー）では問題なし。将来的に JWT カスタムクレームへ移行可能
- **リスク 3**: `getClaims()` はログアウト状態をリアルタイムに検知できない — 社内利用のためセキュリティリスクは許容範囲。トークン有効期限（デフォルト 1 時間）で自然失効

## 参照
- [Supabase SSR Next.js Setup](https://supabase.com/docs/guides/auth/server-side/nextjs) -- Next.js App Router 向けセットアップガイド
- [Supabase SSR Creating a Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- クライアント生成パターン
- [inviteUserByEmail API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail) -- 招待 API リファレンス
- [PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow) -- PKCE フロー解説
- [Password-based Auth](https://supabase.com/docs/guides/auth/passwords) -- パスワード認証ガイド
- [shadcn/ui Form](https://ui.shadcn.com/docs/forms/react-hook-form) -- フォームコンポーネント
