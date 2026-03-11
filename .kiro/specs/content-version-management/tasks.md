# Implementation Plan

## 確定済み実装判断

1. **承認エラー時の UI フィードバック → toast 通知**: shadcn/ui の Sonner(toast) でエラーメッセージを表示する。既存の管理画面パターンと一貫性を保つ。
2. **バージョン履歴のページネーション → 初期から実装**: オフセットベース、1 ページ 10 件で初期から実装する。
3. **draft 未存在時の表示 → プレースホルダー**: 「未承認の変更はありません」のメッセージを draft カード部分に表示する。
4. **非 Super Admin の `?version_id` 指定 → サイレント無視**: パラメータを無視して active バージョンにフォールバックする。403 は返さない。
5. **変更ファイル一覧のソート → 変更種別グルーピング**: 追加 → 更新 → 削除 の順でグルーピングし、各グループ内はアルファベット順。

---

- [x] 1. DB マイグレーション: content_versions テーブル作成と contents テーブル変更
- [x] 1.1 content_versions テーブルの作成と contents テーブルへの version_id カラム追加
  - content_versions テーブルを設計書の Physical Data Model に従い作成する（id, commit_hash, status, synced_at, changes_summary, changed_paths, approved_by, approved_at, created_at, updated_at）
  - status カラムに CHECK 制約（'draft', 'active', 'archived'）を設定する
  - status カラムにインデックスを作成する
  - contents テーブルに version_id カラム（FK → content_versions.id, ON DELETE CASCADE）を追加する（初期は NULL 許可）
  - _Requirements: 4.1, 1.3_

- [x] 1.2 初回移行データの作成と制約変更
  - ダミー active バージョンレコード（commit_hash='initial', status='active'）を INSERT する
  - 既存 contents の全レコードに version_id をダミー active バージョンの id で UPDATE する
  - version_id カラムを NOT NULL 制約に変更する
  - 既存の slug_path UNIQUE 制約を DROP し、(slug_path, version_id) の複合ユニーク制約を作成する
  - version_id のインデックスを作成する
  - _Requirements: 1.3_

- [x] 1.3 RLS ポリシーの更新
  - content_versions テーブルに RLS を有効化し、Super Admin のみが SELECT できるポリシーを作成する
  - contents テーブルの既存 User 向け RLS ポリシー（status ベース）を削除し、version_id ベースのポリシー（active バージョンの id に一致するレコードのみ参照可）に置き換える
  - Super Admin の全レコードアクセスポリシーは既存のまま維持されることを確認する
  - Manager ロールが引き続きコンテンツにアクセスできないことを確認する
  - _Requirements: 9.1, 9.2, 9.3, 7.1, 7.2_

- [x] 1.4 RPC 関数 sync_content_version の作成
  - SECURITY DEFINER で PostgreSQL 関数を作成し、同期処理をアトミックに実行する
  - 既存 draft の存在確認を行い、存在する場合は commit_hash・synced_at を UPDATE し、紐づく contents を DELETE する
  - draft が存在しない場合は新規 content_versions レコード（status='draft'）を INSERT する
  - 引数で受け取ったコンテンツ配列を json_populate_recordset で効率的に INSERT し、version_id を紐付ける
  - active バージョンとの比較で changes_summary（added, updated, deleted）と changed_paths を計算・更新する
  - commit_hash の NOT NULL バリデーションを関数内で実施する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 6.4_

- [x] 1.5 RPC 関数 approve_content_version の作成
  - SECURITY DEFINER で PostgreSQL 関数を作成し、承認処理をアトミックに実行する
  - 対象バージョンが draft ステータスであることを検証し、違反時は RAISE EXCEPTION する
  - SELECT ... FOR UPDATE で対象レコードをロックし、同時承認の競合を防止する
  - 旧 active バージョンが存在する場合、archived に UPDATE し、紐づく contents 行を DELETE する
  - 対象 draft バージョンを active に UPDATE し、approved_by と approved_at を記録する
  - 初回同期（active バージョンが存在しない）にも対応する
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 4.2_

- [x] 2. 同期 API の変更: commit_hash 対応とバージョン管理ロジックの導入
- [x] 2.1 同期 API のリクエスト処理を RPC ベースに変更する
  - リクエストペイロードに commit_hash フィールドを受け取るよう変更する
  - commit_hash のバリデーションを追加する（文字列かつ空でないこと）
  - 移行期間中の後方互換性として、commit_hash 未指定時は 'unknown' をフォールバック値として使用する
  - 既存の UPSERT ロジックを RPC sync_content_version の呼び出しに置換する
  - createAdminClient を使用して RPC を呼び出す（SECURITY DEFINER の RPC をservice_role 経由で実行）
  - レスポンスに version_id と変更サマリー（added, updated, deleted）を含める
  - _Requirements: 6.1, 6.4, 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_

- [x] 3. 外部連携スクリプトの commit_hash 対応
- [x] 3.1 (P) GitHub Actions ワークフローの更新
  - sync-contents.yml の同期 API リクエストペイロードに `commit_hash: "${{ github.sha }}"` を追加する
  - _Requirements: 6.2_

- [x] 3.2 (P) ローカル同期スクリプトの更新
  - sync-contents-local.mjs で `child_process.execSync('git rev-parse HEAD')` を使用して HEAD のコミットハッシュを取得する
  - 取得したコミットハッシュを同期 API リクエストのペイロードに含める
  - _Requirements: 6.3_

- [x] 4. 管理画面 UI: バージョン管理ダッシュボード
- [x] 4.1 バージョン管理ダッシュボードページの作成
  - Server Component として現在の active バージョン情報（コミットハッシュ、同期日時）を表示する
  - 未承認の draft バージョンが存在する場合、その情報と「変更を確認」ボタンを表示する
  - Super Admin 権限チェックを行い、権限がない場合はアクセスを拒否する
  - _Requirements: 8.1, 8.2_

- [x] 4.2 バージョン履歴一覧テーブルの作成
  - archived バージョンのメタデータ一覧（コミットハッシュ、同期日時、承認者、変更サマリー）を時系列降順で表示する
  - オフセットベースのページネーションを実装する（1 ページ 10 件）
  - バージョン管理ダッシュボードに組み込む
  - _Requirements: 4.3, 8.1_

- [x] 5. 管理画面 UI: バージョン詳細と承認フロー
- [x] 5.1 バージョン詳細ページ（変更ファイル一覧）の作成
  - draft バージョンの changed_paths から変更ファイル一覧を表示する
  - 各ファイルに変更種別（追加 / 更新 / 削除）をバッジで視覚的に区別して表示する
  - 各ファイルから受講生向けコンテンツページへの `?version_id` 付きプレビューリンクを生成する
  - 全体プレビューリンク（教材一覧ページへの `?version_id` 付きリンク）を提供する
  - _Requirements: 3.1, 3.2, 3.4, 8.2_

- [x] 5.2 承認ボタンと確認ダイアログの実装
  - バージョン詳細ページに承認ボタンを配置する
  - 承認ボタン押下時に shadcn/ui の AlertDialog で確認ダイアログを表示する
  - 確認後、Server Action（approveVersion）を呼び出し、formData に versionId を含める
  - Server Action 内で Super Admin 権限を検証し、RPC approve_content_version を呼び出す
  - 処理完了後に revalidatePath でバージョン管理画面を更新する
  - _Requirements: 8.3, 8.4, 5.1, 5.4_

- [x] 6. 受講生向けコンテンツページの version_id 対応
- [x] 6.1 active バージョン ID 取得ユーティリティの作成と version_id ベースフィルタへの移行
  - content_versions テーブルから active バージョンの ID を取得する共通ユーティリティ関数を作成する
  - 教材一覧ページ、チュートリアル詳細ページ、セクション詳細ページのコンテンツクエリを `.eq("status", "active")` から `.eq("version_id", activeVersionId)` に変更する
  - active バージョンが存在しない場合のフォールバック動作を実装する（コンテンツなしとして扱う）
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 6.2 プレビュー用 version_id パラメータのサポート
  - searchParams に version_id パラメータのハンドリングを追加する
  - version_id 指定時はサーバーサイドで Super Admin 判定を行い、権限がある場合のみ指定バージョンのコンテンツを表示する
  - 非 Super Admin が version_id を指定した場合は active バージョンにフォールバックする（TBD-4 の暫定対応）
  - version_id パラメータが UUID 形式であることをバリデーションする
  - _Requirements: 3.3, 3.5, 7.1_

- [x] 7. 統合検証と結合テスト
- [x] 7.1 同期フローの結合検証
  - commit_hash 付きリクエストで同期 API を呼び出し、draft バージョンが作成されることを検証する
  - 既存 draft がある状態で再同期を行い、draft が上書き（コンテンツ置換）されることを検証する
  - 同期中に active バージョンのコンテンツが影響を受けないことを検証する
  - changes_summary と changed_paths が正しく計算されていることを検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 6.1, 6.4_

- [x] 7.2 承認フローの結合検証
  - draft バージョンを承認し、active に昇格することを検証する
  - 旧 active が archived に変更され、紐づくコンテンツ行が削除されることを検証する
  - approved_by と approved_at が正しく記録されることを検証する
  - 初回同期時（active なし）に draft を承認し、正常に active 昇格することを検証する
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 4.2_

- [x] 7.3 RLS ポリシーの検証
  - User ロールで active バージョンのコンテンツのみ参照可能であることを検証する
  - User ロールで draft バージョンのコンテンツが参照できないことを検証する
  - Super Admin ロールで全バージョンのコンテンツを参照可能であることを検証する
  - Manager ロールでコンテンツにアクセスできないことを検証する
  - _Requirements: 9.1, 9.2, 9.3, 7.1, 7.2_
