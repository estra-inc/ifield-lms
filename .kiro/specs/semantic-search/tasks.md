# Implementation Plan

- [x] 1. データベースマイグレーションの作成（pg_trgm拡張・GINインデックス・検索RPC関数）
  - Supabaseマイグレーションファイルを作成し、以下を順次定義する:
    - pg_trgm拡張の有効化
    - contentsテーブルのtitleカラムにGIN (gin_trgm_ops) インデックスを作成
    - contentsテーブルのbodyカラムにGIN (gin_trgm_ops) インデックスを作成
    - search_contents RPC関数を作成: content_type='section'かつactiveバージョンに限定し、similarity関数でタイトル×3+本文×1の重み付けスコアを算出する
    - RPC関数はスコア閾値による低関連度除外と最低1件保証ロジックを含む
    - 本文冒頭100文字のスニペット切り出しと、genre/tutorial/chapterの階層タイトル取得をサブクエリで実装する
    - 結果はスコア降順で最大件数（デフォルト5件）を返却する
    - SECURITY INVOKERで作成し、既存RLSポリシーを維持する
    - パラメータ化クエリによりSQLインジェクションを防御する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.2, 3.3, 3.4, 4.3, 6.2, 6.3, 7.2, 7.4, 8.1, 8.2, 8.3_

- [x] 2. 検索APIエンドポイントの実装
  - Next.js API Route (`/api/search`) にGETハンドラーを作成する
  - Supabase Server Clientで認証チェックを行い、未認証ユーザーには401を返却する
  - クエリパラメータ `q` のバリデーション（空・空白のみ・1文字の場合は400を返却）
  - search_contents RPCを呼び出し、結果をSearchAPIResponseの形式で返却する
  - RPCエラー時はサーバーログに記録し、クライアントには500と汎用メッセージを返却する
  - 既存のAPI Route実装パターン（NextResponse.json、エラーハンドリング）に準拠する
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.4_

- [x] 3. shadcn/ui Commandコンポーネントの導入と検索結果の型定義
  - `npx shadcn@latest add command` でCommandコンポーネントをプロジェクトに追加する
  - 検索結果（SearchResult）、APIレスポンス（SearchAPIResponse）、エラーレスポンスの型定義を作成する
  - _Requirements: 2.3_

- [x] 4. useSearchカスタムフックの実装
  - 検索クエリの状態管理、300msデバウンス処理、API呼び出しを行うカスタムフックを作成する
  - 2文字未満のクエリではAPIを呼び出さず、結果を空配列にリセットする
  - AbortControllerによる競合リクエストのキャンセル処理を実装する
  - ローディング状態、エラー状態、検索結果の状態を管理し、呼び出し元に返却する
  - エラー発生時はisLoadingをfalse、resultsを空配列に設定し、エラーメッセージを保持する
  - _Requirements: 3.1, 3.5, 3.6, 3.8_

- [x] 5. 検索UIコンポーネントの実装
- [x] 5.1 SearchResultItemコンポーネントの実装
  - 各検索結果1件を表示するコンポーネントを作成する
  - ファイルアイコン（Lucide FileText）を表示する
  - コンテンツタイトルを太字で表示する
  - 階層パスをパンくず形式（genre > tutorial > chapter）で表示する
  - 本文スニペット（最大100文字）をmutedテキストで表示する
  - スコアに応じたカラーバッジ（高スコア>=0.6: 緑、中スコア>=0.3: 黄、低スコア<0.3: デフォルト）を表示する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.2 SearchCommandDialogコンポーネントの実装
  - shadcn/ui CommandDialogをベースに検索モーダルを構築する
  - `shouldFilter={false}` でcmdkのクライアントサイドフィルタリングを無効化する
  - useSearchフックと連携し、入力値の変更をフックに伝達する
  - 検索状態に応じた表示切り替え: 初期状態（プレースホルダーメッセージ）、ローディング中（スケルトンUI）、結果表示、0件メッセージ、エラーメッセージ
  - SearchResultItemを使用して各検索結果を表示する
  - キーボードの上下矢印キーによるフォーカス移動とハイライト表示（cmdkのビルトイン機能を利用）
  - 結果選択時（クリックまたはEnter）にセクションページ（`/contents/{tutorial}/{chapter}/{section}?genre={genre}`）にrouter.pushで遷移し、モーダルを閉じる
  - フッターにキーボード操作ヒント（↑↓ ナビゲーション、Enter 選択、Esc 閉じる）を表示する
  - Escキーまたはモーダル外クリックでモーダルを閉じる（CommandDialogの標準動作）
  - _Requirements: 2.3, 2.5, 2.6, 2.7, 2.8, 3.1, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3_

- [x] 6. SearchTriggerコンポーネントの実装とAppHeaderへの統合
  - ヘッダーに配置する検索バー型トリガーコンポーネントを作成する
  - 既存のSearchBarPlaceholderを置き換える形で実装する
  - OS判定によるショートカットヒントバッジ（macOS: ⌘K、その他: Ctrl+K）を表示する
  - Cmd+K（macOS）/ Ctrl+K（Windows/Linux）のグローバルキーボードショートカットをuseEffectでdocumentレベルに登録し、クリーンアップする
  - クリックまたはキーボードショートカットでSearchCommandDialogを開く
  - SearchCommandDialogとの開閉状態（isOpen）を管理する
  - AppHeader内のSearchBarPlaceholder参照をSearchTrigger + SearchCommandDialogに置き換え、Userロール限定の表示制御を引き継ぐ
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 7. 結合テストと動作検証
- [x] 7.1 検索APIのテスト
  - 認証済みユーザーでの正常系検索リクエスト・レスポンスを検証する
  - 未認証ユーザーからのリクエストで401が返却されることを検証する
  - 空クエリ・1文字クエリで400が返却されることを検証する
  - RPCエラー発生時に500が返却されることを検証する
  - レスポンスにid, title, snippet, 階層パス情報, scoreが含まれることを検証する
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1_

- [x] 7.2 (P) 検索UIの結合テスト
  - Cmd+K / Ctrl+Kでモーダルが開閉することを検証する
  - 検索クエリ入力後にデバウンスを経て結果が表示されることを検証する
  - キーボード上下矢印で結果の選択が移動することを検証する
  - Enterキーまたはクリックでセクションページに遷移し、genreクエリパラメータが維持されることを検証する
  - Escキー・背景クリックでモーダルが閉じることを検証する
  - 0件時のメッセージ表示を検証する
  - エラー時のメッセージ表示を検証する
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.6, 3.7, 3.8, 4.6, 4.7, 5.1, 5.2, 5.3_

- [x]* 7.3 (P) セキュリティとパフォーマンスの検証
  - activeバージョンのコンテンツのみが検索結果に含まれることを検証する
  - パラメータ化クエリが使用されSQLインジェクションが防御されていることを確認する
  - GINインデックスが適用された状態で検索APIレスポンスが200ms以内であることを計測する
  - _Requirements: 7.2, 7.3, 7.4, 8.1, 8.2, 8.3_
