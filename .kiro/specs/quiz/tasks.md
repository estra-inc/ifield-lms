# Implementation Plan

- [x] 1. クイズ関連のデータベーステーブルとRLSポリシーを作成する
- [x] 1.1 `quizzes` テーブルと `quiz_logs` テーブルのマイグレーションを作成する
  - `quizzes` テーブルを設計書のカラム定義に従い作成する（id, genre, tutorial, chapter, section, title, questions JSONB, status, version_id, created_at, updated_at）
  - `(genre, tutorial, chapter, section, version_id)` のユニーク制約を設定する
  - `version_id` に `content_versions(id)` への外部キー制約を設定する
  - インデックス `idx_quizzes_version_status` を `(version_id, status)` に作成する
  - `quiz_logs` テーブルを設計書のカラム定義に従い作成する（id, user_id, quiz_id, score, total_questions, answers JSONB, created_at）
  - `user_id` に `auth.users(id)` への外部キー、`quiz_id` に `quizzes(id)` への外部キーを設定する
  - `score >= 0 AND score <= total_questions` のCHECK制約を設定する
  - インデックス `idx_quiz_logs_user_quiz` を `(user_id, quiz_id, created_at DESC)` に、`idx_quiz_logs_quiz_id` を `(quiz_id)` に作成する
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.2 `quizzes` テーブルと `quiz_logs` テーブルのRLSポリシーを設定する
  - `quizzes` テーブルにRLSを有効化し、User・Super Adminロールのみ `status = 'active'` のレコードをSELECTできるポリシーを作成する
  - Managerロールに対して `quizzes` テーブルのSELECT権限を明示的に拒否するポリシーを作成する（contentsテーブルの既存ポリシーに倣う）
  - `quiz_logs` テーブルにRLSを有効化し、Userロールは `user_id = auth.uid()` のレコードのみSELECT/INSERT可能とするポリシーを作成する
  - Super Adminに対して `quiz_logs` テーブルの全レコードSELECTを許可するポリシーを作成する
  - _Requirements: 2.5, 2.6, 6.1, 6.2, 6.3, 6.4_

- [x] 1.3 (P) TypeScriptのデータベース型定義に `quizzes` と `quiz_logs` の型を追加する
  - `lib/types/database.ts` に `quizzes` の Row/Insert/Update 型と Relationships を追加する
  - `quiz_logs` の Row/Insert/Update 型と Relationships を追加する
  - クイズ問題（QuestionItem, OptionItem）と回答記録（QuizAnswerRecord）の型を定義する
  - _Requirements: 2.1, 2.2_

- [x] 2. クイズデータの同期機能を実装する
- [x] 2.1 `sync_quiz_data` RPCをデータベースに作成する
  - `p_version_id` と `p_quizzes` 配列を受け取り、quizzes テーブルにUPSERTする RPC関数を作成する
  - `(genre, tutorial, chapter, section, version_id)` の組み合わせで既存レコードの判定を行い、存在すれば更新・なければ挿入する
  - 送信されたクイズのリストに含まれない同一 `version_id` のクイズの `status` を `archived` に更新する
  - 追加・更新・削除件数のサマリーを返却する
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2.2 既存の同期APIにクイズ同期処理を追加する
  - 同期APIのリクエストペイロードに `quizzes` 配列（オプショナル）を受け取れるようバリデーションスキーマを拡張する
  - 各クイズアイテムの必須フィールド（file_path, section, title, genre, tutorial, chapter, questions）と、questions 配列内の各問題のフィールド（type, text, options, correct）をバリデーションする
  - 既存のコンテンツ同期処理の後に、`quizzes` フィールドが存在する場合のみ `sync_quiz_data` RPCを呼び出す
  - コンテンツ同期で取得した `version_id` をクイズ同期に引き渡す
  - Admin Client（RLSバイパス）でRPCを呼び出す
  - レスポンスに `quiz_summary`（created, archived）を追加する
  - `quizzes` フィールドが存在しない場合は既存の動作に一切影響を与えない（後方互換性を維持する）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 6.5_

- [x] 3. クイズの採点ロジックとシャッフルユーティリティを実装する
- [x] 3.1 (P) クライアントサイドの採点関数を実装する
  - 問題配列とユーザー回答配列を受け取り、各問題の正誤判定と全体スコアを算出する純粋関数を実装する
  - 単一選択問題はユーザーの選択と正解文字列の完全一致で判定する
  - 複数選択問題はユーザーの選択セットと正解セットの完全一致で判定する（順序不問、部分一致は不正解）
  - 正答数、総問題数、正答率（パーセンテージ）、各問題の正誤詳細を返却する
  - _Requirements: 4.1, 4.2_

- [x] 3.2 (P) 選択肢のランダムシャッフル関数を実装する
  - Fisher-Yatesアルゴリズムで選択肢配列をランダムにシャッフルする汎用関数を実装する
  - 元の配列を変更せず、シャッフルされた新しい配列を返す（イミュータブル）
  - _Requirements: 3.7, 4.8_

- [x] 4. クイズ解答ページのサーバーサイド処理を実装する
- [x] 4.1 クイズ解答ページのルートとデータフェッチを実装する
  - セクション配下のクイズ解答ページのルートを作成する
  - `resolveVersionId()` で active バージョンを解決し、クイズデータをフェッチする
  - searchParams から `genre` を取得して、対象セクションのクイズを特定する
  - 当該ユーザーの挑戦回数と最高スコアを `quiz_logs` から取得する
  - クイズが存在しない場合は 404 を返す
  - フェッチしたクイズデータと履歴情報をクライアントコンポーネントに渡す
  - _Requirements: 3.2, 5.4, 7.1_

- [x] 4.2 (P) クイズページのローディング状態とパンくずリストを実装する
  - クイズページのローディング中にSkeleton UIを表示する
  - パンくずリスト（教材 > チュートリアル > チャプター > セクション > 演習問題）を表示する
  - _Requirements: 7.3, 7.5_

- [x] 5. クイズ解答・採点・結果表示のクライアントコンポーネントを実装する
- [x] 5.1 クイズ出題画面（回答フェーズ）を実装する
  - クイズタイトル、過去の挑戦回数・最高スコア（履歴がある場合）を上部に表示する
  - マウント時に各問題の選択肢をランダムにシャッフルして表示する
  - 設問番号（Q1, Q2, ...）、設問文、選択肢を各設問に表示する
  - 単一選択問題（`type: "single"`）はRadioボタンで1つのみ選択可能にする
  - 複数選択問題（`type: "multiple"`）はCheckboxで複数選択可能にし、問題文に「（複数選択）」と明示する
  - 全問に回答するまで「回答を送信」ボタンをdisabled状態にする
  - デザインシステムのデザイントークンに準拠したスタイルを適用する
  - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 5.4, 7.2, 7.4_

- [x] 5.2 採点結果画面（結果フェーズ）を実装する
  - 「回答を送信」ボタンクリック時にクライアントサイドで即時採点を実行する
  - 正答数/総問題数（例: 8/10）と正答率（例: 80%）を結果サマリーとして表示する
  - 各設問について正解は緑、不正解は赤でハイライト表示する
  - 不正解の設問では正しい選択肢を明示する
  - 各設問の解説テキスト（explanation）を表示する
  - 「もう一度挑戦する」ボタンと「セクションに戻る」ボタンを表示する
  - 「もう一度挑戦する」をクリックしたら回答をリセットし、選択肢を再シャッフルして出題画面に戻る
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 6. 回答履歴の保存機能を実装する
- [x] 6.1 回答履歴を保存する Server Action を実装する
  - 認証済みユーザーのセッションから user_id を取得し、クイズID・スコア・総問題数・各問の回答内容を `quiz_logs` テーブルにINSERTする Server Action を実装する
  - quizId の存在チェックと score の範囲チェック（0 <= score <= totalQuestions）をバリデーションする
  - 保存後に `revalidatePath` でキャッシュを無効化する
  - _Requirements: 5.1, 5.2_

- [x] 6.2 クイズ採点完了時に Server Action を呼び出す処理をクライアントコンポーネントに統合する
  - 採点完了後に自動的に Server Action を呼び出して回答履歴を保存する
  - 保存失敗時はエラーメッセージを表示し、採点結果は画面上に維持する
  - _Requirements: 5.1, 5.2_

- [x] 7. セクション詳細ページからクイズへの導線を実装する
- [x] 7.1 セクション詳細ページに「演習問題に挑戦」ボタンを追加する
  - 当該セクションにクイズが存在するかを確認し、存在する場合のみ読了ボタン付近に「演習問題に挑戦」ボタンを表示する
  - ボタンクリックでクイズ解答ページに遷移する（`/contents/{tutorial}/{chapter}/{section}/quiz?genre={genre}`）
  - 最新スコアがある場合はボタン付近にスコアも表示する
  - クイズが存在しないセクションでは何も表示しない
  - _Requirements: 3.1, 3.2, 5.3_

- [x] 8. 教材一覧ページの「演習問題」タブを実装する
- [x] 8.1 教材一覧ページに「演習問題」タブを追加し、クイズ一覧を表示する
  - 既存の `ContentsTabs` を拡張して「演習問題」タブを追加する
  - タブ切替をURLベース（`/contents?tab=quizzes&genre=...`）で管理する
  - active バージョンの全クイズをカード形式で一覧表示する
  - 各クイズの最新スコア（quiz_logs から取得）を表示する
  - 各カードからクイズ解答ページへのリンクを提供する
  - _Requirements: 3.3, 5.5_

- [x] 9. 受講期間チェックとアクセス制御の確認
- [x] 9.1 受講期間切れユーザーのクイズページアクセスブロックを確認する
  - 既存Middlewareがクイズ解答ページのパス（`/contents/*/quiz`）にも適用されることを確認する
  - 受講期間が終了している場合はダッシュボードへリダイレクトされることを検証する
  - 必要に応じてMiddlewareのパスマッチングを調整する
  - _Requirements: 3.10_

- [x]*9.2 (P) RLSポリシーの動作確認テストを実施する
  - User ロールで active クイズのみ取得でき、archived クイズは取得できないことを確認する
  - Manager ロールで quizzes テーブルにアクセスできないことを確認する
  - User ロールで自身の quiz_logs のみ取得・挿入できることを確認する
  - Super Admin ロールで全 quiz_logs を取得できることを確認する
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
