# Requirements Document

## Introduction

Super Admin向けのユーザー管理機能。LMSにおけるユーザーのライフサイクル全体を管理する機能群を提供する。具体的には、ユーザー一覧の閲覧・検索、招待URL発行によるユーザー追加、ユーザー詳細の確認・編集、ロール変更、アカウント無効化・有効化、物理削除などを含む。

ユーザーはLMSに無期限でアクセス可能であり、受講期間（卒業日）や受講延長の概念は持たない。

本機能はSuper Adminロール専用であり、既存の認証基盤（ログイン、招待フロー受信側、パスワードリセット、Middleware）およびApp Shell（サイドバーナビゲーション）の上に構築される。

**スコープ外:**
- コーチングクレジット管理（別機能として実装）
- コンテンツ関連の権限管理
- 受講期間・卒業日管理（ユーザーは無期限アクセスのため不要）

## Requirements

### Requirement 1: ユーザー一覧表示

**Objective:** Super Adminとして、登録済みユーザーの一覧を閲覧したい。ユーザー全体の状況を把握し、管理作業の起点とするため。

#### Acceptance Criteria

1. When Super Adminがユーザー管理ページにアクセスした時, the ユーザー管理画面 shall profilesテーブルから全ユーザーの一覧を取得し、テーブル形式で表示する
2. The ユーザー一覧テーブル shall 各ユーザーについて氏名、メールアドレス、ロール、受講状態（有効/無効）、作成日、経過日数（アカウント作成日から本日までの日数）を表示する
3. When Super Adminがユーザー名またはメールアドレスで検索を実行した時, the ユーザー管理画面 shall 入力されたキーワードに部分一致するユーザーのみをフィルタリングして表示する
4. When Super Adminがロールフィルターを選択した時, the ユーザー管理画面 shall 選択されたロール（user / manager / super_admin）に該当するユーザーのみを表示する
5. When ユーザー一覧の件数が1ページの表示上限を超えた時, the ユーザー管理画面 shall ページネーションを表示し、ページ間を移動できるようにする
6. While ユーザーデータを読み込み中の間, the ユーザー管理画面 shall ローディング状態を表示する

### Requirement 2: ユーザー招待

**Objective:** Super Adminとして、新規ユーザーを招待URLで追加したい。招待制アカウント管理を実現し、適切なロールを事前に設定するため。

#### Acceptance Criteria

1. When Super Adminがユーザー招待ダイアログを開いた時, the ユーザー管理画面 shall メールアドレス入力フィールドとロール選択（user / manager）を含むフォームを表示する
2. When Super Adminが有効なメールアドレスとロールを指定して招待を実行した時, the ユーザー管理画面 shall Supabase AuthのinviteUserByEmail APIを使用して招待メールを送信する
3. When 招待が正常に送信された時, the ユーザー管理画面 shall 成功メッセージを表示し、ダイアログを閉じる
4. If 無効なメールアドレス形式が入力された場合, the ユーザー管理画面 shall バリデーションエラーを表示し、招待の実行を防止する
5. If 既に登録済みのメールアドレスで招待を試みた場合, the ユーザー管理画面 shall 重複エラーメッセージを表示する
6. If 招待API呼び出しが失敗した場合, the ユーザー管理画面 shall エラーメッセージを表示し、再試行を可能にする
7. The ユーザー招待フォーム shall ロール選択でsuper_adminを選択肢に含めない（super_adminの招待は別途管理する）

### Requirement 3: ユーザー詳細閲覧

**Objective:** Super Adminとして、個々のユーザーの詳細情報を確認したい。ユーザーの学習状況や契約情報を把握し、適切な管理判断を行うため。

#### Acceptance Criteria

1. When Super Adminがユーザー一覧から特定のユーザーを選択した時, the ユーザー管理画面 shall そのユーザーの詳細ページへ遷移する
2. The ユーザー詳細ページ shall ユーザーのプロフィール情報（氏名、メールアドレス、アバター画像、ロール、受講状態（有効/無効）、現在のターム、作成日、経過日数）を表示する
3. While ユーザー詳細データを読み込み中の間, the ユーザー詳細ページ shall ローディング状態を表示する
4. If 指定されたユーザーIDに対応するユーザーが存在しない場合, the ユーザー詳細ページ shall 404エラーページまたは「ユーザーが見つかりません」メッセージを表示する

### Requirement 4: ロール変更

**Objective:** Super Adminとして、ユーザーのロールを変更したい。組織内の役割変更に応じたアクセス権限を適切に設定するため。

#### Acceptance Criteria

1. When Super Adminがユーザー詳細ページでロール変更を実行した時, the ユーザー管理画面 shall profilesテーブルのroleカラムを選択されたロールに更新する
2. The ロール変更機能 shall user、manager、super_adminの3つのロールを選択肢として提供する
3. When ロール変更が正常に完了した時, the ユーザー管理画面 shall 成功メッセージを表示し、画面上のロール表示を即座に更新する
4. If ロール変更のAPI呼び出しが失敗した場合, the ユーザー管理画面 shall エラーメッセージを表示し、ロール表示を変更前の状態に戻す
5. When Super Adminが自分自身のロールを変更しようとした時, the ユーザー管理画面 shall 自身のロール変更を防止し、警告メッセージを表示する

### Requirement 5: アカウント無効化（論理削除）

**Objective:** Super Adminとして、ユーザーアカウントを無効化したい。不要なアカウントのログインを一時的に停止しつつ、データを保持し、必要に応じて有効化で復元可能とするため。

#### Acceptance Criteria

1. When Super Adminがユーザー詳細ページでアカウント無効化を実行しようとした時, the ユーザー管理画面 shall 無効化確認ダイアログを表示する
2. When Super Adminが無効化確認ダイアログで確定した時, the ユーザー管理画面 shall 対象ユーザーのSupabase Authアカウントを無効化（ban）する
3. When 無効化が正常に完了した時, the ユーザー管理画面 shall 成功メッセージを表示し、ユーザー一覧ページへ遷移する
4. If 無効化のAPI呼び出しが失敗した場合, the ユーザー管理画面 shall エラーメッセージを表示し、操作をキャンセルする
5. When Super Adminが自分自身を無効化しようとした時, the ユーザー管理画面 shall 自身の無効化を防止し、警告メッセージを表示する

### Requirement 6: アカウント有効化

**Objective:** Super Adminとして、無効化されたユーザーアカウントを有効化（復元）したい。誤操作や状況変化に対応し、ユーザーのLMSアクセスを再開させるため。

#### Acceptance Criteria

1. When Super Adminが無効化済みユーザーの詳細ページを開いた時, the ユーザー詳細ページ shall 「アカウントを有効化」ボタンを表示する（「アカウントを無効化」ボタンの代わりに）
2. When Super Adminがアカウント有効化を実行した時, the ユーザー管理画面 shall 対象ユーザーのSupabase Authアカウントのbanを解除する
3. When 有効化が正常に完了した時, the ユーザー管理画面 shall 成功メッセージを表示し、画面上のステータス表示を即座に更新する
4. If 有効化のAPI呼び出しが失敗した場合, the ユーザー管理画面 shall エラーメッセージを表示する

### Requirement 7: ユーザー物理削除

**Objective:** Super Adminとして、ユーザーアカウントを完全に削除したい。不要になったアカウントとその関連データを永久に削除し、システムから完全に除去するため。

#### Acceptance Criteria

1. When Super Adminがユーザー詳細ページで物理削除を実行しようとした時, the ユーザー管理画面 shall 物理削除確認ダイアログを表示する
2. The 物理削除確認ダイアログ shall この操作が不可逆であり、すべてのデータが完全に削除される旨の警告を明確に表示する
3. When Super Adminが物理削除確認ダイアログで確定した時, the ユーザー管理画面 shall Supabase Authの deleteUser APIを使用して対象ユーザーを完全に削除する（profilesテーブルはON DELETE CASCADEにより連動削除される）
4. When 物理削除が正常に完了した時, the ユーザー管理画面 shall 成功メッセージを表示し、ユーザー一覧ページへ遷移する
5. If 物理削除のAPI呼び出しが失敗した場合, the ユーザー管理画面 shall エラーメッセージを表示し、削除操作をキャンセルする
6. When Super Adminが自分自身を物理削除しようとした時, the ユーザー管理画面 shall 自身の削除を防止し、警告メッセージを表示する

### Requirement 8: RLSポリシーによるアクセス制御

**Objective:** システムとして、profilesテーブルに適切なRow Level Securityポリシーを適用したい。Super Adminは全ユーザー情報の読み書きが可能で、一般ユーザーは自分自身の情報のみ参照可能とするため。

#### Acceptance Criteria

1. The profilesテーブル shall RLS（Row Level Security）を有効にする
2. While ユーザーのロールがsuper_adminの間, the profilesテーブル shall 全ユーザーレコードに対するSELECT、UPDATE操作を許可する
3. While ユーザーのロールがuserまたはmanagerの間, the profilesテーブル shall 自身のレコード（auth.uid() = id）に対するSELECT操作のみを許可する
