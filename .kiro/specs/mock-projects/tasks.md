# Implementation Plan

- [x] 1. データベーススキーマとRLSポリシーの構築
- [x] 1.1 模擬案件関連テーブルの作成
  - Supabase マイグレーションファイルを作成し、`mock_projects`、`project_assignments`、`project_submissions`、`project_tasks` の4テーブルを定義する
  - `mock_projects` にはジャンル制約（engineering/design）、ステータス制約（active/archived）、slug のユニーク制約、`content_versions` への外部キー（version_id）を設定する
  - `project_assignments` には user_id + project_id のユニーク制約を設定し、同一ユーザーが同一案件に複数回着手できないようにする
  - `project_submissions` にはステータス制約（submitted/grading/graded/rejected）、score（nullable）、result_data（jsonb, nullable）を含める
  - `project_tasks` にはステータス制約（backlog/todo/in_progress/done）、order カラム、created_by の外部キーを含める
  - 各テーブルに適切なインデックスを作成する（genre、status+order、assignment_id、created_at DESC 等）
  - _Requirements: 1.1, 1.2, 1.3, 7.2, 9.1, 9.2, 11.1, 11.3_

- [x] 1.2 RLSポリシーの設定
  - 全4テーブルに RLS を有効化する
  - `mock_projects`: 認証ユーザーは active 案件を閲覧可能、archived 案件は着手済みの場合のみ閲覧可能とするポリシーを設定する
  - `mock_projects`: Manager ロールのアクセスを RESTRICTIVE ポリシーで明示的にブロックする
  - `project_assignments`: ユーザーは自身の assignment のみ SELECT/INSERT 可能とするポリシーを設定する
  - `project_submissions`: ユーザーは自身の assignment に紐づく submission のみ SELECT/INSERT 可能とするポリシーを設定する
  - `project_tasks`: ユーザーは自身の assignment に紐づくタスクの SELECT/INSERT/UPDATE/DELETE を可能とするポリシーを設定する
  - Super Admin は service_role 経由で RLS をバイパスすることを確認する
  - _Requirements: 8.2, 8.3, 8.5_

- [x] 1.3 PostgreSQL RPC 関数の作成（排他制御 + 着手 + ターム移行）
  - `start_project(p_user_id, p_project_id)` RPC 関数を作成する
  - 同一ユーザーの着手中案件（直近 submission が graded でない assignment）が存在するかを `SELECT ... FOR UPDATE` で排他チェックする
  - 着手中案件が存在する場合は `USER_HAS_ACTIVE_PROJECT` 例外を raise してロールバックする
  - 着手可能な場合は `project_assignments` に status='started' でレコードを INSERT する
  - ユーザーの `profiles.current_term` が「基礎」の場合は「実践」に UPDATE する処理を同一トランザクション内で実行する
  - 戻り値として `{ assignment_id, term_changed }` を JSONB で返す
  - **確定**: 排他制御は PostgreSQL RPC 関数方式（TBD-D2 → Option A で確定）
  - _Requirements: 3.1, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4_

- [x] 1.4 (P) データ同期用 RPC 関数の作成
  - `sync_mock_project_data(p_version_id, p_mock_projects)` RPC 関数を作成する
  - slug をキーとして UPSERT（既存案件の更新 + 新規案件の作成）を行う
  - 同期元リポジトリに存在しない案件の status を 'archived' に設定する（論理削除）
  - genre フィールドを含めた同期データを処理する
  - 戻り値として追加・更新・削除の件数サマリを JSONB で返す
  - 既存の `sync_content_version`、`sync_quiz_data` RPC のパターンに従う
  - _Requirements: 9.1, 9.3, 9.4, 9.7, 9.8_

- [x] 2. 型定義とデータアクセス層の整備
- [x] 2.1 データベース型定義の追加
  - `lib/types/database.ts` に `mock_projects`、`project_assignments`、`project_submissions`、`project_tasks` のRow/Insert/Update/Relationships 型を追加する
  - ジャンル型（`"engineering" | "design"`）、ステータス型、タスクステータス型をユニオン型で定義する
  - 同期 API 用の `SyncMockProjectItem` 型と `EvaluationItem` 型を定義する
  - 既存の `SyncRequest` インターフェースに `mock_projects` フィールドを追加する
  - _Requirements: 9.1_

- [x] 2.2 (P) 着手状況の導出ユーティリティの作成
  - 受講生ごとの着手状況を assignment と submission の組み合わせから導出するロジックを実装する
  - 未着手（assignment 未作成）、着手済み（assignment 有 + submission 無）、提出済み / 採点中 / 採点完了 / 差し戻し（直近 submission のステータスに準拠）の6状態を返す
  - 一覧ページと詳細ページの両方から利用可能な共通ユーティリティとして実装する
  - _Requirements: 1.2, 1.3, 1.6, 1.7_

- [x] 3. 同期 API の拡張
- [x] 3.1 既存同期エンドポイントへの模擬案件データ統合
  - `/api/admin/sync-curriculums` の既存ハンドラを拡張し、リクエストペイロードに `mock_projects` フィールドのバリデーションを追加する
  - `mock_projects` フィールドが存在する場合、`sync_mock_project_data` RPC を呼び出して UPSERT + archive 処理を実行する
  - version_id との紐付けを既存の content_versions ワークフローと同様に処理する
  - 同期結果のサマリ（追加・更新・削除件数）をレスポンスに含める
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.7, 9.8_

- [x] 4. Middleware とアクセス制御の設定
- [x] 4.1 (P) Middleware への模擬案件パスの追加
  - 既存の Middleware に `/projects` および `/projects/*` パスを追加する
  - `graduation_date` ベースのアクセス制御を適用し、受講期間終了ユーザーをダッシュボードにリダイレクトする
  - 既存の `/contents` パスと同一のチェックロジックを再利用する
  - 未認証ユーザーはログインページにリダイレクトする
  - _Requirements: 8.1, 8.4_

- [x] 5. 模擬案件一覧ページの実装
- [x] 5.1 一覧ページの Server Component 作成
  - `app/(authenticated)/projects/page.tsx` を作成し、Server Component として模擬案件一覧を表示する
  - active ステータスの全案件を order 列の昇順で取得する
  - `project_assignments` と `project_submissions` を JOIN して受講生ごとの着手状況を導出する
  - 各カードにタイトル、概要（description）、着手状況バッジを表示する
  - 案件クリックで詳細ページ（`/projects/[slug]`）へ遷移するリンクを設置する
  - 案件が存在しない場合の空状態メッセージを表示する
  - archived かつ着手済みの案件は一覧に表示し、閲覧のみ可能であることを示す
  - archived かつ未着手の案件は一覧に表示しない
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.10_

- [x] 5.2 ジャンルフィルタの実装
  - GenreSelect コンポーネントを作成し、engineering/design のジャンルドロップダウンを表示する
  - URL searchParams `?genre=` でフィルタ状態を管理する
  - 未指定時は `profiles.default_genre` をフォールバック値として使用する
  - 既存の searchParams パターン（contents ページの genre フィルタ等）に準拠する
  - _Requirements: 1.8, 1.9_

- [x] 6. 模擬案件詳細ページの実装（Lock/Unlock 状態分岐 + タブ構成）
- [x] 6.1 詳細ページの Server Component 作成
  - `app/(authenticated)/projects/[slug]/page.tsx` を作成する
  - slug パラメータで案件を特定し、assignment の存在で Lock/Unlock 状態を判定する
  - Lock 状態: タイトルと概要（description）を表示し、要件（requirements）は非表示にする。タブバーを表示しない
  - Unlock 状態: 4つのタブ（案件要件 / タスク管理 / 成果物提出 / 提出履歴）を持つタブ構成で表示する
  - URL searchParams `?tab=` でアクティブタブを管理し、デフォルトは「案件要件」タブとする
  - 案件要件タブでは requirements（要件全文）を表示する
  - _Requirements: 2.1, 2.3, 2.7, 3.2, 3.4, 10.1, 10.2, 10.3_

- [x] 6.2 タブナビゲーション Client Component の作成
  - TabNavigation コンポーネントを作成し、4つのタブの切替 UI を提供する
  - タブクリック時に `router.replace` で `?tab=` パラメータを更新する
  - アクティブタブのスタイリングを適用する
  - 既存の searchParams パターンと共存可能にする
  - _Requirements: 10.2, 10.4_

- [x] 7. 着手操作の実装（排他制御 + ターム移行）
- [x] 7.1 startProject Server Action の作成
  - `app/(authenticated)/projects/actions.ts` に `startProject` Server Action を作成する
  - 認証チェックを行い、未認証の場合はエラーを返却する
  - `start_project` RPC 関数を呼び出して排他制御 + 着手 + ターム移行をトランザクションで実行する
  - RPC がエラー（conflict）を返した場合は排他制御違反のエラーメッセージを返却する
  - 成功時は `revalidatePath` で詳細ページを再検証する
  - 戻り値として `{ success, message, termChanged }` を返す
  - **確定**: 排他制御は PostgreSQL RPC 関数方式（TBD-D2 → Option A で確定）
  - _Requirements: 3.1, 3.5, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4, 6.6_

- [x] 7.2 StartProjectButton Client Component の作成
  - 着手ボタンと確認ダイアログを提供する Client Component を作成する
  - 他案件が進行中の場合はボタンを非活性にし「他の案件が進行中のため着手できません」の警告を表示する（フロント側排他チェック）
  - `current_term === '基礎'` の場合はターム移行警告付き確認ダイアログを表示する
  - `current_term === '実践'` の場合は即座に着手処理を実行する
  - `useTransition` で着手処理中のローディング表示を行う
  - 着手成功時にターム移行が発生した場合は「実践タームに移行しました」のトースト通知を表示する
  - Server Action のエラー/成功を判定し、適切なトースト通知を表示する
  - _Requirements: 2.2, 2.4, 2.5, 2.6, 4.4, 6.6_

- [x] 8. 成果物提出フローの実装
- [x] 8.1 submitWork Server Action の作成
  - `submitWork` Server Action を作成する
  - 認証チェックを行い、grading 中の提出を拒否する（排他制御の二重防御、サーバーサイド）
  - `project_submissions` に status='submitted' でレコードを作成する
  - 成功時は `revalidatePath` で詳細ページを再検証する
  - _Requirements: 5.3, 5.8, 6.5, 6.6_

- [x] 8.2 SubmitForm Client Component の作成
  - 「成果物提出」タブ内に GitHub URL 入力フィールドと「提出する」ボタンを表示する Client Component を作成する
  - zod + react-hook-form による URL バリデーション（`https://github.com/` で始まる正規表現）を実装する
  - バリデーションエラー時はエラーメッセージを表示し、提出を受け付けない
  - grading 中の場合はフォームを非活性にする（フロント側排他チェック）
  - archived 案件の場合はフォームを非表示にし「この案件はアーカイブされたため提出できません」のメッセージを表示する
  - 提出成功時は詳細ページに留まり、成功トーストを表示する
  - エラー発生時はエラーメッセージを表示し、再試行を促す
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.5, 6.6_

- [x] 9. 提出履歴の表示
- [x] 9.1 提出履歴タブの実装
  - 「提出履歴」タブ内に過去の全提出を5件ごとのページネーション付きリストで表示する Server Component を作成する
  - 各提出についてステータスバッジ（submitted/grading/graded/rejected）、GitHub URL、提出日時を表示する
  - 提出が存在しない場合は「まだ提出がありません」の空状態メッセージを表示する
  - ページネーションは URL searchParams で管理する
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 10. タスク管理（カンバンボード）の実装
- [x] 10.1 Task CRUD Server Actions の作成
  - `createTask`、`updateTask`、`updateTaskStatus`、`deleteTask` の4つの Server Action を作成する
  - 認証チェックとロール確認を行う（User は自身の assignment のタスクのみ、Super Admin は全タスク編集可能、Manager は編集不可）
  - タスクの作成時にタイトル（必須）と説明（任意）を受け取り、デフォルトステータス backlog で作成する
  - ステータス変更時に status と order を更新する
  - タスク削除時は物理削除を行う
  - _Requirements: 11.2, 11.3, 11.4_

- [x] 10.2 カンバンボード Client Component の作成
  - 4カラム（バックログ / ToDo / 進行中 / 完了）のカンバンボードを表示する Client Component を作成する
  - ドラッグ&ドロップによるカラム間のタスク移動と並び替えを実装する
  - 楽観的更新で UI を即時反映し、Server Action の結果に応じてロールバックする
  - `useTransition` で非同期処理中の UI フィードバックを提供する
  - エラー時はエラートーストを表示し、楽観的更新をロールバックする
  - **確定**: D&D ライブラリは `@dnd-kit/react` v0.3.2 を使用する（TBD-D1 → Option A で確定）
  - _Requirements: 11.1, 11.4_

- [x] 10.3 タスク作成・編集ダイアログの実装
  - タスクの作成と編集を行うダイアログ UI を実装する
  - タイトル（必須）と説明（任意）の入力フォームを提供する
  - 作成時は `createTask`、編集時は `updateTask` Server Action を呼び出す
  - canEdit プロパティに基づき、編集権限がない場合はフォームを非表示にする
  - _Requirements: 11.2, 11.3_

- [x] 10.4 タスク管理タブの統合
  - 「タスク管理」タブの Server Component を作成し、assignment に紐づくタスクを取得してカンバンボードに渡す
  - 初期タスクデータを props で KanbanBoard に渡す
  - ユーザーロールに基づく canEdit フラグを算出して KanbanBoard に渡す
  - タスク状態は submission 状態と独立させる（タスクが未完了でも成果物の提出は可能）
  - Lock 状態ではタスク管理タブ自体を非表示にする
  - _Requirements: 11.1, 11.5, 11.6_

- [x] 11. Super Admin 手動ステータス変更機能
- [x] 11.1 (P) updateSubmissionStatus Server Action の作成
  - Super Admin がsubmission のステータスを `graded` に手動変更できる Server Action を作成する
  - Super Admin ロールの確認を行い、権限がない場合はエラーを返却する
  - Supabase Admin Client（service_role）を使用して RLS をバイパスし、ステータスを更新する
  - 長期 rejected 状態のブロック解除用途であることを考慮し、操作ログを記録する
  - _Requirements: 6.7_

- [x] 12. 結合テストとエッジケースの検証
- [x] 12.1 排他制御の結合テスト
  - `startProject` Server Action の正常系テスト: 着手成功 + ターム移行の発生/非発生を検証する
  - `startProject` Server Action の異常系テスト: 着手中案件がある場合のエラーレスポンスを検証する
  - `submitWork` Server Action のテスト: 正常提出、grading 中の提出拒否、バリデーションエラーを検証する
  - フロントエンドの排他チェック（ボタン非活性）とサーバーサイドの二重防御が協調動作することを確認する
  - _Requirements: 3.1, 3.5, 5.3, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 12.2 (P) archived 案件のエッジケース検証
  - archived かつ着手済みの案件が一覧に表示され、閲覧のみ可能であることを検証する
  - archived かつ未着手の案件が一覧に表示されないことを検証する
  - archived 案件への新規提出が拒否されることを検証する
  - archived かつ grading 中の提出の採点プロセスが継続されることを検証する
  - _Requirements: 1.6, 1.7, 5.2, 9.5, 9.6, 9.7_

- [x] 12.3 (P) タスク CRUD の結合テスト
  - タスクの作成・更新・削除・ステータス変更が正しく動作することを検証する
  - Manager ロールのユーザーがタスクを編集できないことを検証する（RLS + Server Action の二重チェック）
  - Super Admin がタスクを編集可能であることを検証する
  - _Requirements: 11.2, 11.4_

- [x] 12.4 (P) 同期 API 拡張のテスト
  - `mock_projects` フィールド付きペイロードの UPSERT が正しく動作することを検証する
  - 同期元に存在しない案件が archived になることを検証する
  - genre フィールドの同期を検証する
  - _Requirements: 9.1, 9.3, 9.4, 9.8_

- [x] 12.5 (P) GitHub URL バリデーションのユニットテスト
  - `https://github.com/` で始まる有効な URL パターンの受理を検証する
  - 無効な URL パターン（http://、github.com以外のドメイン、空文字等）の拒否を検証する
  - _Requirements: 5.5, 5.6_
