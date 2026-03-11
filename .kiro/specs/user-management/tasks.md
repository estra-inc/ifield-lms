# Implementation Plan

- [x] 1. DBマイグレーションとRLSポリシーの構築
- [x] 1.1 profilesテーブルにemailカラムを追加し、既存データを同期する
  - profilesテーブルにemailカラム（text型）を追加する
  - auth.usersテーブルから既存の全profilesレコードにemailを同期する
  - emailカラムにNOT NULL制約を設定する
  - email検索用のインデックス（idx_profiles_email）を作成する
  - role検索用のインデックス（idx_profiles_role）を作成する
  - full_nameの部分一致検索用にpg_trgmベースのGINインデックスを作成する
  - _Requirements: 1.2, 1.3_

- [x] 1.2 auth.usersのemail変更をprofilesに自動同期するDBトリガーを作成する
  - auth.usersテーブルのINSERTおよびemail UPDATE時にprofiles.emailを更新するトリガー関数を作成する
  - SECURITY DEFINER属性で関数を定義し、RLSをバイパスして同期を確実にする
  - トリガーをauth.usersテーブルにアタッチする
  - _Requirements: 1.2_

- [x] 1.3 profilesテーブルのRLSポリシーを作成する
  - profilesテーブルでRow Level Securityを有効化する
  - super_adminロールのユーザーに全行のSELECT権限を付与するポリシーを作成する
  - super_adminロールのユーザーに全行のUPDATE権限を付与するポリシーを作成する
  - user/managerロールのユーザーに自身のレコード（auth.uid() = id）のみSELECT権限を付与するポリシーを作成する
  - RLSポリシーのサブクエリによるパフォーマンスへの影響を確認する（PRIMARY KEYインデックスで担保）
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 1.4 招待時のロール反映のため、既存のprofiles作成トリガーを拡張する
  - auth.users INSERT時にprofilesを自動作成する既存トリガー関数を確認する
  - raw_user_meta_data.roleが存在する場合、profiles.roleにその値を設定するロジックを追加する
  - raw_user_meta_data.roleが未指定の場合はデフォルト値（user）を維持する
  - 招待時にemail同期トリガーとの連携が正しく動作することを確認する
  - _Requirements: 2.2_

- [x] 2. Supabase Adminクライアントと共通基盤の構築
- [x] 2.1 service_roleキーを使用するSupabase Adminクライアントを作成する
  - 環境変数SUPABASE_SERVICE_ROLE_KEY（NEXT_PUBLIC_プレフィックスなし）を使用したAdminクライアント生成関数を作成する
  - セッション管理を無効化（autoRefreshToken: false、persistSession: false）した設定で初期化する
  - 既存のanon用クライアント（server.ts）と同じパターンで、Admin専用として分離する
  - Server Actions内でのみ使用されることをコメントで明示する
  - _Requirements: 2.2, 4.1, 5.2, 6.2, 7.3_

- [x] 2.2 (P) ユーザー管理用の型定義を作成する
  - ユーザー一覧の1行分のデータ型（UserListItem）を定義する
  - ユーザー一覧のフェッチ結果型（UserListResult）を定義する
  - ユーザー詳細のデータ型（UserDetail）を定義する -- ban状態の判定フラグを含む
  - ユーザー一覧のフィルタパラメータ型（UserListFilter）を定義する
  - profiles テーブルのRow型にemailカラムを追加反映する
  - _Requirements: 1.1, 1.2, 3.2_

- [x] 2.3 (P) ユーザー管理用のzodバリデーションスキーマを作成する
  - 招待フォーム用スキーマ（email形式チェック + role enum: user/manager）を定義する
  - ロール変更用スキーマ（userId: UUID + role enum: user/manager/super_admin）を定義する
  - ユーザーID指定操作の共通スキーマ（userId: UUID）を定義する
  - 日本語のエラーメッセージを設定する
  - _Requirements: 2.4, 4.2_

- [x] 2.4 (P) ナビゲーション設定のパス変更を行う
  - config/navigation.tsのsuper_admin向け「ユーザー管理」のパスを /users から /admin/users に変更する
  - App Shellのサイドバーナビゲーションとの整合性を確認する
  - _Requirements: 1.1_

- [x] 3. Server Actions（ミューテーション操作）の実装
- [x] 3.1 ユーザー招待のServer Actionを実装する
  - 呼び出し元ユーザーの認証確認とsuper_admin権限の検証を行う
  - zodスキーマによるメールアドレスとロールのバリデーションを実行する
  - Supabase Auth Admin APIのinviteUserByEmailを使用して招待メールを送信する
  - 招待時にoptions.dataでuser_metadataにロール情報を設定する
  - 既に登録済みのメールアドレスに対する重複エラーをハンドリングする
  - 成功時はActionResult（success: true）を返却する
  - API呼び出し失敗時はエラーメッセージ付きActionResultを返却する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3.2 ロール変更のServer Actionを実装する
  - 呼び出し元ユーザーの認証確認とsuper_admin権限の検証を行う
  - 自分自身のロール変更を防止するチェックを実装する
  - zodスキーマによるuserIdとroleのバリデーションを実行する
  - profilesテーブルのroleカラムを指定されたロールに更新する
  - 成功時はrevalidatePathでページデータを更新し、ActionResultを返却する
  - 失敗時はエラーメッセージ付きActionResultを返却する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3.3 アカウント無効化のServer Actionを実装する
  - 呼び出し元ユーザーの認証確認とsuper_admin権限の検証を行う
  - 自分自身の無効化を防止するチェックを実装する
  - Supabase Auth Admin APIのupdateUserByIdでban_duration: "876000h"を設定する
  - 成功時はユーザー一覧ページへのリダイレクトを実行する
  - 失敗時はエラーメッセージ付きActionResultを返却する
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3.4 アカウント有効化のServer Actionを実装する
  - 呼び出し元ユーザーの認証確認とsuper_admin権限の検証を行う
  - Supabase Auth Admin APIのupdateUserByIdでban_duration: "none"を設定してbanを解除する
  - 成功時はrevalidatePathでページデータを更新し、ActionResultを返却する
  - 失敗時はエラーメッセージ付きActionResultを返却する
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 3.5 物理削除のServer Actionを実装する
  - 呼び出し元ユーザーの認証確認とsuper_admin権限の検証を行う
  - 自分自身の物理削除を防止するチェックを実装する
  - Supabase Auth Admin APIのdeleteUserを使用して対象ユーザーを完全に削除する（profilesはON DELETE CASCADEで連動削除）
  - 成功時はユーザー一覧ページへのリダイレクトを実行する
  - 失敗時はエラーメッセージ付きActionResultを返却する
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 4. ユーザー一覧ページの実装
- [x] 4.1 ユーザー一覧ページのServer Componentを実装する
  - 認証確認とsuper_admin権限のチェックを行い、権限がない場合はリダイレクトする
  - URL SearchParams（search, role, page）からフィルタ・ページ状態を読み取る
  - profilesテーブルからフィルタ条件に一致するユーザーを取得する（SQL レベルでの検索・フィルタリング・ページネーション）
  - 1ページあたり10件で取得し、総件数も同時に取得する
  - 検索はfull_nameとemailの部分一致で実行する
  - ロールフィルタは指定されたロールに完全一致で実行する
  - 取得したデータをユーザーテーブルコンポーネントに渡して描画する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4.2 (P) ユーザー一覧ページのローディング表示を実装する
  - Skeletonコンポーネントを使用してテーブルのローディング状態を表示する
  - 検索フィルタ、テーブルヘッダー、テーブル行、ページネーションの各領域にSkeletonを配置する
  - loading.tsxとして配置し、Next.jsのStreaming SSRと連携させる
  - _Requirements: 1.6_

- [x] 4.3 検索・ロールフィルタのクライアントコンポーネントを実装する
  - テキスト入力フィールドでユーザー名またはメールアドレスの検索キーワードを入力できるようにする
  - 検索入力はデバウンス（300ms）後にURL SearchParamsを更新してサーバーサイド検索をトリガーする
  - ロールフィルタのセレクトボックスで全て/user/manager/super_adminを選択できるようにする
  - ロールフィルタの変更は即時URL SearchParamsを更新する
  - フィルタ変更時にページ番号を1にリセットする
  - shadcn/uiのSelect コンポーネントを新規追加して使用する
  - _Requirements: 1.3, 1.4_

- [x] 4.4 ユーザーテーブルの表示コンポーネントを実装する
  - shadcn/uiのTableコンポーネントで各ユーザーを行として表示する
  - 各行に氏名（アバター付き）、メールアドレス、ロール（Badge表示）、作成日、経過日数（アカウント作成日から本日までの日数）を表示する
  - 経過日数はdate-fnsを使用して計算する
  - 行クリックで /admin/users/[id] のユーザー詳細ページへ遷移する
  - ユーザーが0件の場合は「ユーザーが見つかりません」のメッセージを表示する
  - _Requirements: 1.1, 1.2_

- [x] 4.5 ページネーションコンポーネントを実装する
  - 「全 N 件中 X-Y 件を表示」の件数情報を表示する
  - ページ番号ナビゲーション（前へ、ページ番号群、次へ）を表示する
  - ページ変更時にURL SearchParamsのpageパラメータを更新する
  - 総ページ数が1の場合はページネーションを非表示にする
  - shadcn/uiのPaginationコンポーネントを新規追加して使用する
  - _Requirements: 1.5_

- [x] 4.6 ユーザー招待ダイアログを実装する
  - ユーザー一覧ページに「ユーザーを招待」ボタンを配置し、クリックでダイアログを開く
  - メールアドレス入力フィールドとロール選択（user / manager のみ、super_adminは含めない）を表示する
  - react-hook-form + zodによるクライアントサイドバリデーションを実装する
  - 無効なメールアドレス形式の場合はリアルタイムでエラーを表示する
  - useActionStateでServer Actionの結果をハンドリングし、送信中は二重送信を防止する
  - 成功時はダイアログを閉じ、成功メッセージをtoastで表示する
  - 重複メールアドレスやAPI失敗時はダイアログ内にエラーメッセージを表示する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 5. ユーザー詳細ページの実装
- [x] 5.1 ユーザー詳細ページのServer Componentを実装する
  - パスパラメータ [id] からユーザーIDを取得する
  - 認証確認とsuper_admin権限のチェックを行う
  - profilesテーブルからユーザー情報を取得する
  - Supabase Auth Admin APIのgetUserByIdでban状態（banned_until）を取得する
  - 指定されたIDのユーザーが存在しない場合はnotFound()を呼び出してnot-found.tsxを表示する
  - 現在のログインユーザーと表示対象ユーザーの一致判定（isSelf）を行う
  - 取得したデータをプロフィールカードとアクションカードに渡す
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 5.2 (P) ユーザー詳細ページのローディング・404表示を実装する
  - loading.tsxにSkeletonコンポーネントを使用したプロフィールカードとアクションカードのローディング状態を配置する
  - not-found.tsxに「ユーザーが見つかりません」のエラー表示と一覧ページへの戻りリンクを配置する
  - _Requirements: 3.3, 3.4_

- [x] 5.3 プロフィールカードの表示コンポーネントを実装する
  - アバター画像、氏名、メールアドレス、ロール（Badge）、現在のターム、作成日、経過日数を表示する
  - アバターが未設定の場合はイニシャルまたはデフォルトアイコンで表示する
  - 経過日数はdate-fnsを使用して計算する
  - shadcn/uiのCard, Avatar, Badgeコンポーネントを使用する
  - _Requirements: 3.2_

- [x] 5.4 アクションカード（ロール変更・無効化/有効化・削除トリガー）を実装する
  - ロール変更のSelectコンポーネントを配置し、user/manager/super_adminの3つから選択できるようにする
  - ロール変更時にServer Actionを呼び出し、成功メッセージをtoastで表示する
  - 失敗時はロール表示を変更前の状態に戻し、エラーメッセージを表示する
  - ban状態に応じて「アカウントを無効化」ボタンまたは「アカウントを有効化」ボタンを切り替え表示する
  - 「アカウントを有効化」ボタンクリックでactivateUser Server Actionを呼び出し、成功時はステータスを即座に更新する
  - 「ユーザーを物理削除」ボタンを配置する
  - 自分自身のページではロール変更、無効化、物理削除の操作を非表示にする
  - 各操作のpending状態で二重操作を防止する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 6.1, 6.2, 6.3, 6.4, 7.1_

- [x] 5.5 無効化確認ダイアログを実装する
  - 「アカウントを無効化」ボタンクリックで確認ダイアログを表示する
  - Destructiveカラーのタイトルと赤背景の警告ボックスでユーザー名を含む確認メッセージを表示する
  - 「無効化する」ボタンと「キャンセル」ボタンを配置する
  - 確定時にdeactivateUser Server Actionを呼び出す
  - 成功時はダイアログを閉じ、成功メッセージを表示後にユーザー一覧ページへ遷移する
  - 失敗時はダイアログ内にエラーメッセージを表示する
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5.6 物理削除確認ダイアログを実装する
  - 「ユーザーを物理削除」ボタンクリックで確認ダイアログを表示する
  - 「この操作は取り消せません」の警告と、すべてのデータが完全に削除される旨を明確に表示する
  - 「完全に削除する」ボタンと「キャンセル」ボタンを配置する
  - 確定時にdeleteUserPermanently Server Actionを呼び出す
  - 成功時はダイアログを閉じ、成功メッセージを表示後にユーザー一覧ページへ遷移する
  - 失敗時はダイアログ内にエラーメッセージを表示する
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 6. 統合テストとエンドツーエンドの検証
- [x] 6.1 (P) zodバリデーションスキーマのユニットテストを実装する
  - inviteUserSchemaの正常系・異常系（無効なemail形式、未入力、不正なrole値）をテストする
  - changeRoleSchemaの正常系・異常系をテストする
  - userIdSchemaの正常系・異常系をテストする
  - _Requirements: 2.4, 4.2_

- [x] 6.2 全要件のカバレッジ確認と統合動作検証を行う
  - ユーザー一覧ページの表示・検索・フィルタ・ページネーションの動作を確認する
  - 招待ダイアログのフォーム送信からメール送信完了までのフローを確認する
  - ユーザー詳細ページのプロフィール表示、ロール変更の即時反映を確認する
  - 無効化・有効化のステータス切り替えが正しく反映されることを確認する
  - 物理削除後にユーザーが一覧から完全に消えることを確認する
  - 自己操作防止（ロール変更、無効化、物理削除）が正しく機能することを確認する
  - RLSポリシーにより、一般ユーザーがprofilesテーブルの他ユーザー情報にアクセスできないことを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3_
