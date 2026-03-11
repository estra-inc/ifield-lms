# Requirements Document

## Introduction

設定・プロフィールページ（`/settings`）の要件定義。全ロール（User, Manager, Super Admin）が利用する統合設定画面を提供し、プロフィール編集、パスワード変更、およびSuper Admin向けシステム設定を一つのページで管理する。

本機能は、既存の認証基盤（Supabase Auth）およびプロフィールテーブル（`profiles`）を基盤とし、ユーザーが自身の情報を管理するためのセルフサービス機能を実現する。

### TBD事項（確定済み）

以下の項目はデザインレビュー時にユーザー判断により確定した。

1. **アバター画像のアップロード先バケット** → **B案: `avatars` 専用バケットを新規作成**（用途の分離、バケット単位のポリシー設定が容易）
2. **アバター画像のファイルサイズ制限** → **A案: 2MB**（デザインに「最大2MB」と明記）
3. **メールアドレス変更の可否** → **A案: 変更不可（表示のみ）**（デザインでロックアイコン付き読み取り専用として承認）
4. **自己紹介（bio）フィールドの要否** → **A案: 不要**（デザインに含まれず）
5. **Super Adminシステム設定セクションのスコープ** → **A案: Google Calendar連携設定 + 稼働時間枠設定の両方を含める**（デザインでフルスコープとして承認）
6. **Google Calendar OAuth フローの詳細** → **A案: 設定ページ内でOAuth認可フロー全体を完結させる**（TBD 5 A案と連動）
7. **`system_integrations` テーブルの作成タイミング** → **A案: 本機能の実装時に作成する**（TBD 5 A案と連動）

### デザイン確定事項（Pencilレビューで追加確定）

- **氏名フィールド**: 姓・名を分割入力（`profiles` テーブルに `last_name` / `first_name` カラムが必要、または `full_name` を姓名結合で保存）
- **注意書き**: 「※ 正式な表記で氏名を入力してください」
- **稼働時間枠UI**: 1週間カレンダーUI（月〜日 × 時間帯のグリッド）でクリックによる稼働/非稼働切替
- **カレンダーオプション**: 祝日シフト設定（チェックボックス）、前後の確保時間（分単位入力）、1枠のスロット時間（分単位入力）

---

## Requirements

### Requirement 1: 設定ページのルーティングとレイアウト

**Objective:** As a 全ロールのユーザー（User / Manager / Super Admin）, I want 統合された設定ページ（`/settings`）にアクセスできること, so that 自分のプロフィールやアカウント情報を一箇所で管理できる

#### Acceptance Criteria

1. The 設定ページ shall `/settings` パスでアクセス可能であること
2. The 設定ページ shall 認証済みの全ロール（User, Manager, Super Admin）がアクセスできること
3. The 設定ページ shall 「プロフィール」「アカウント（パスワード変更）」のセクションをタブまたはセクション分けで表示すること
4. Where ユーザーのロールが Super Admin である場合, the 設定ページ shall 「システム設定」セクションを追加で表示すること
5. Where ユーザーのロールが User または Manager である場合, the 設定ページ shall 「システム設定」セクションを表示しないこと
6. When 未認証のユーザーが `/settings` にアクセスした場合, the システム shall ログインページにリダイレクトすること

### Requirement 2: プロフィール表示

**Objective:** As a 全ロールのユーザー, I want 自分の現在のプロフィール情報を確認できること, so that 登録されている情報が正しいか確認できる

#### Acceptance Criteria

1. The プロフィールセクション shall ユーザーの現在の名前（`full_name`）を表示すること
2. The プロフィールセクション shall ユーザーの現在のアバター画像（`avatar_url`）を表示すること
3. When アバター画像が設定されていない場合, the プロフィールセクション shall デフォルトアイコンを表示すること
4. The プロフィールセクション shall ユーザーのメールアドレスを表示すること
5. The プロフィールセクション shall ユーザーのロール（User / Manager / Super Admin）を表示すること

### Requirement 3: プロフィール名の編集

**Objective:** As a 全ロールのユーザー, I want 自分の名前を変更できること, so that 正しい表示名でサービスを利用できる

#### Acceptance Criteria

1. When ユーザーが名前の編集フォームに新しい名前を入力して保存ボタンを押した場合, the システム shall `profiles` テーブルの `full_name` を更新すること
2. When 名前が空欄のまま保存が試行された場合, the システム shall バリデーションエラーを表示し、保存を実行しないこと
3. When 名前の更新が成功した場合, the システム shall 成功メッセージを表示すること
4. If 名前の更新中にサーバーエラーが発生した場合, the システム shall エラーメッセージを表示し、フォームの入力内容を保持すること

### Requirement 4: アバター画像の変更

**Objective:** As a 全ロールのユーザー, I want 自分のアバター画像をアップロード・変更できること, so that 他のユーザーに自分を識別しやすくできる

#### Acceptance Criteria

1. When ユーザーがアバター画像をアップロードした場合, the システム shall 画像ファイルを Supabase Storage にアップロードし、`profiles` テーブルの `avatar_url` を更新すること
2. The システム shall アップロード可能な画像形式を JPEG, PNG, WebP に制限すること
3. If 許可されていないファイル形式がアップロードされた場合, the システム shall ファイル形式エラーを表示し、アップロードを実行しないこと
4. If ファイルサイズが2MBを超えた場合, the システム shall ファイルサイズエラーを表示し、アップロードを実行しないこと
5. When アバター画像のアップロードが成功した場合, the システム shall 新しいアバター画像をプレビュー表示すること
6. If アバター画像のアップロード中にエラーが発生した場合, the システム shall エラーメッセージを表示すること
7. When 既存のアバター画像がある状態で新しい画像がアップロードされた場合, the システム shall 古い画像ファイルを Storage から削除すること

### Requirement 5: パスワード変更

**Objective:** As a 全ロールのユーザー, I want 自分のパスワードを変更できること, so that アカウントのセキュリティを維持できる

#### Acceptance Criteria

1. The アカウントセクション shall パスワード変更フォーム（新しいパスワード、新しいパスワード確認）を表示すること
2. When ユーザーが新しいパスワードを入力して変更ボタンを押した場合, the システム shall Supabase Auth の `updateUser` を使用してパスワードを更新すること
3. When 新しいパスワードと確認パスワードが一致しない場合, the システム shall 不一致エラーを表示し、変更を実行しないこと
4. When パスワードが最低文字数要件を満たさない場合, the システム shall バリデーションエラーを表示すること
5. When パスワード変更が成功した場合, the システム shall 成功メッセージを表示すること
6. If パスワード変更中にサーバーエラーが発生した場合, the システム shall エラーメッセージを表示すること

### Requirement 6: Super Admin向けシステム設定セクション

**Objective:** As a Super Admin, I want システム全体の運用設定を管理できること, so that コーチング予約やカレンダー連携などの運用パラメータを一元管理できる

**注記:** TBD 5, 6, 7 はすべてA案（フルスコープ）で確定済み。

#### Acceptance Criteria

1. Where ユーザーのロールが Super Admin である場合, the 設定ページ shall 「システム設定」セクションを表示すること
2. The システム設定セクション shall Google Calendar連携ステータス（連携済み / 未連携）を表示すること
3. When Super Admin が「Google Calendar連携」ボタンを押した場合, the システム shall Google Calendar API の OAuth 認可フローを開始すること
4. When OAuth 認可が成功した場合, the システム shall リフレッシュトークンを安全に保存し、連携ステータスを「連携済み」に更新すること
5. When Super Admin が「連携解除」ボタンを押した場合, the システム shall 保存されたトークンを削除し、連携ステータスを「未連携」に更新すること
6. The システム設定セクション shall LMS稼働時間枠（コーチング予約のスロット設定）の表示・編集機能を提供すること
7. When Super Admin が稼働時間枠を変更して保存した場合, the システム shall `system_integrations` テーブルの `business_hours` を更新すること
8. If システム設定の保存中にエラーが発生した場合, the システム shall エラーメッセージを表示すること

### Requirement 7: セキュリティとアクセス制御

**Objective:** As a システム運営者, I want 設定ページのデータ操作が安全に行われること, so that ユーザーデータの整合性とセキュリティが保たれる

#### Acceptance Criteria

1. The システム shall プロフィール更新時に、ログインユーザー自身のプロフィールのみ更新可能であること（RLSによる制御）
2. The システム shall パスワード変更時に、ログインユーザー自身のパスワードのみ変更可能であること
3. The システム shall システム設定（Requirement 6）へのアクセスを Super Admin ロールのみに制限すること
4. The システム shall リフレッシュトークン等の機密情報を暗号化して保存すること（Supabase Vault またはアプリ層暗号化）
5. The システム shall アバター画像のアップロードにおいて、ファイル形式の検証をサーバーサイドでも実施すること

### Requirement 8: UIとユーザー体験

**Objective:** As a 全ロールのユーザー, I want 設定画面が分かりやすく操作しやすいこと, so that 迷わず設定変更を完了できる

#### Acceptance Criteria

1. The 設定ページ shall shadcn/ui コンポーネントを使用した一貫性のあるUIを提供すること
2. While プロフィール更新やパスワード変更の処理中, the システム shall ローディングインジケーターを表示し、二重送信を防止すること
3. When フォームにバリデーションエラーがある場合, the システム shall エラー箇所を明示的にハイライトし、修正方法を案内すること
4. The 設定ページ shall レスポンシブデザインに対応し、モバイル端末でも操作可能であること
