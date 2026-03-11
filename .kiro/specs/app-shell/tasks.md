# Implementation Plan

- [x] 1. フォントシステム移行とデザイントークン基盤の構築
- [x] 1.1 フォントをGeistからSora + IBM Plex Monoへ移行する
  - RootLayout (`app/layout.tsx`) のフォント定義を Geist Sans / Geist Mono から Sora / IBM Plex Mono に差し替える
  - CSS変数 `--font-primary`（Sora）と `--font-secondary`（IBM Plex Mono）を登録し、`globals.css` の `@layer base` でユーティリティクラス `font-primary`, `font-secondary` を定義する
  - `display: 'swap'` と `variable` モードを使用してCLSを抑制する
  - body要素のフォントクラスを更新し、デフォルトフォントがSoraとなることを確認する
  - _Requirements: 6.3_

- [x] 1.2 デザインシステムのCSS変数をglobals.cssに反映する
  - `designs/design-system.pen` で定義されたデザイントークン（背景色、サイドバーカラー、テキスト色、ボーダー色、アクセントカラー等）をCSS変数として `globals.css` に定義する
  - shadcn/uiのテーマ変数（`--sidebar`, `--sidebar-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground` 等）をデザイン仕様のダークネイビー系カラーに合わせて設定する
  - ハードコードされた色値を使用せず、すべてCSS変数経由で参照する体制を整える
  - _Requirements: 6.3_

- [x] 2. 共通型定義とナビゲーション設定モジュールの作成
- [x] 2.1 App Shell共通型を定義する
  - `UserRole`（`"user" | "manager" | "super_admin"`）、`UserTerm`（`"基礎" | "実践"`）の型を定義する
  - `AppShellUser` インターフェース（id, fullName, role, avatarUrl, currentTerm, graduationDate）を定義する
  - `HardStopStatus` 型（none / warning / expired の判別共用体）を定義する
  - これらの型を他のApp Shellコンポーネントから共有参照できる場所に配置する
  - _Requirements: 6.1_

- [x] 2.2 (P) ロール別ナビゲーション設定を作成する
  - ロールをキーとしたメニュー項目定義マップ（`NAVIGATION_MAP`）を作成する
  - Userロール: ダッシュボード(`LayoutDashboard`, `/dashboard`)、教材・演習(`BookOpen`, `/contents`)、模擬案件(`Briefcase`, `/projects`)、設定・プロフィール(`Settings`, `/settings`) の4項目を要件定義書の順序通りに定義する
  - Managerロール: マネージャーダッシュボード(`LayoutDashboard`, `/dashboard`)、ユーザー一覧(`Users`, `/users`)、設定・プロフィール(`Settings`, `/settings`) の3項目を定義する
  - Super Adminロール: 管理者ダッシュボード(`LayoutDashboard`, `/dashboard`)、未採点一覧(`ClipboardList`, `/grading`)、ユーザー管理(`Users`, `/users`)、コンテンツ管理(`FileText`, `/contents`)、システム設定(`SlidersHorizontal`, `/system-settings`)、設定・プロフィール(`Settings`, `/settings`) の6項目を定義する
  - ロール別メニュー取得関数 `getMenuItemsForRole` を実装する
  - パスからページタイトルを解決する関数 `resolvePageTitle` を実装する
  - メニュー項目のアクティブ判定関数 `isMenuItemActive` を実装する
  - すべてのアイコンはLucideアイコンライブラリから名前付きインポートで使用する
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 6.5_
  - _Contracts: NavigationConfig Service_

- [x] 2.3 (P) Hard Stop判定のユーティリティ関数を作成する
  - `deriveHardStopStatus` 関数を純粋関数として実装する
  - `graduationDate` が `null` の場合（Manager/Super Admin）は `{ kind: "none" }` を返す
  - 卒業日が過去の場合は `{ kind: "expired" }` を返す
  - 卒業日まで残り14日以内の場合は `{ kind: "warning", daysRemaining }` を返す（`daysRemaining` は0以上14以下の整数）
  - 15日以上の場合は `{ kind: "none" }` を返す
  - テスト容易性のために `now` パラメータ（日付文字列 `YYYY-MM-DD`）をオプションで受け取れるようにする
  - **タイムゾーン安全性**: `date-fns` の `differenceInCalendarDays` を使用し、「日付のみ」（時刻なし）で安全に比較する。`Date` オブジェクトの UTC/JST 差異による Off-by-one エラー（23:59/00:00 境界値バグ）を防止する。入力は `YYYY-MM-DD` 文字列とし、`parseISO` で解析する
  - _Requirements: 4.1, 4.2_
  - _Contracts: HardStopBanner Service_

- [x] 3. Route Groups構成とApp Shellレイアウトの構築
- [x] 3.1 Route Groupsディレクトリ構造を作成する
  - `app/(user)/layout.tsx`、`app/(manager)/layout.tsx`、`app/(admin)/layout.tsx` の3つのRoute Groupレイアウトを作成する
  - 各Route Groupのlayoutは共通の `AppShellLayout` コンポーネントを呼び出す構成にする
  - layoutはServer Componentとして実装し、`cookies()` でサイドバー状態を読み取り `defaultOpen` として渡す
  - Next.js 16のcache components問題に対応するため、必要に応じて `<Suspense>` でラップする
  - 各Route Groupに仮のダッシュボードページ（`dashboard/page.tsx`）を配置し、レイアウト適用を検証できるようにする
  - _Requirements: 6.1, 6.4_

- [x] 3.2 AppShellLayoutコンポーネントを実装する
  - `SidebarProvider` + `Sidebar` + `SidebarInset` による2カラムレイアウトを構築する
  - `SidebarProvider` に `style={{ "--sidebar-width": "15rem" }}` を渡して展開時240pxに設定する
  - `collapsible="icon"` を設定してアイコンのみの折りたたみモード（48px）を有効化する
  - Cookie `sidebar_state` による展開/折りたたみ状態の永続化を `defaultOpen` プロパティで実現する
  - `SidebarInset` 内にヘッダーとメインコンテンツ領域を配置し、children をレンダリングする
  - メインコンテンツ領域はスクロール可能にする
  - 768px未満の画面幅ではサイドバーが自動的にSheet（オーバーレイ）モードに切り替わることを確認する（shadcn/ui Sidebar標準動作）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2_
  - _Contracts: AppShellLayout State_

- [x] 4. サイドバーコンポーネントの実装
- [x] 4.1 AppSidebarコンポーネントを実装する
  - `SidebarHeader` にi.fieldロゴ（`/ifield-logo.svg`）と「LMS」テキストを配置する。展開時はロゴ140x33px + テキスト、折りたたみ時はロゴ28x28px（アイコンサイズ）のみ表示する
  - `SidebarContent` にロール別メニュー項目を `SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton` で描画する
  - ナビゲーション設定モジュールから現在のロールに応じたメニュー項目を取得して表示する
  - `usePathname()` で現在のURLパスを取得し、一致するメニュー項目に `isActive` を設定してアクティブ状態（`sidebar-accent` 背景色）をハイライトする
  - 折りたたみ時はアイコンのみ表示し、`SidebarMenuButton` の `tooltip` プロパティでツールチップを有効化する
  - `SidebarFooter` に `SidebarFooterMenu` コンポーネントを配置する
  - すべてのアイコンにLucideアイコンを使用する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.2, 6.3, 6.5_
  - _Contracts: AppSidebar Service_

- [x] 4.2 SidebarFooterMenuコンポーネントを実装する
  - Avatar（36px）、氏名、ロール名をフッター領域に表示する
  - Userロールの場合は学習ターム（「基礎」または「実践」）をバッジで追加表示する
  - トリガー行に `sidebar-accent` 背景と `ChevronsUpDown` アイコンを配置する
  - クリックで `DropdownMenu`（`side="top"`, `align="end"`）をフッター上方向に展開する
  - メニューヘッダーにユーザー名（font-size 13）とロール（font-size 11）を表示する
  - メニュー項目「プロフィール」（`User` アイコン）はプロフィール画面（`/settings`）への遷移を行う
  - メニュー項目「ログアウト」（`LogOut` アイコン）は `onLogout` コールバックを呼び出す
  - 折りたたみ時はアバターのみ表示とする
  - _Requirements: 2.6, 2.7, 2.8, 5.1_
  - _Contracts: SidebarFooterMenu Service_

- [x] 5. ヘッダーとHard Stopバナーの実装
- [x] 5.1 AppHeaderコンポーネントを実装する
  - メインコンテンツ領域（`SidebarInset`）の上部に固定ヘッダー（高さ64px）を配置する
  - 左端に `SidebarTrigger`（`PanelLeft` アイコン）を配置し、サイドバーの展開/折りたたみを切り替えられるようにする
  - トグルボタン右側に現在のページタイトルを表示する（font-size 18, font-weight 600, letter-spacing -1px）
  - ヘッダー下部に `border-b border-border` の下線を表示する
  - ページタイトルはナビゲーション設定のメニューラベルと一致させる
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5.2 HardStopBannerコンポーネントを実装する
  - Userロール以外では何も表示しない
  - 警告状態（残り14日以内）: `bg-accent text-accent-foreground` 背景、`TriangleAlert` アイコン、残り日数を含む警告テキストを表示する
  - 期限切れ状態: `bg-destructive text-white` 背景、`Lock` アイコン、受講期間終了のロックメッセージを表示する
  - ヘッダー直下に全幅で表示する
  - `deriveHardStopStatus` ユーティリティ関数を使用してステータスを導出する
  - _Requirements: 4.1, 4.2_
  - _Contracts: HardStopBanner Service_

- [x] 6. Hard Stopによるメニュー無効化とレイアウト統合
- [x] 6.1 期限切れ時のサイドバーメニュー無効化を実装する
  - ユーザーのHardStopStatusが `expired` の場合、ダッシュボード（`/dashboard`）以外のサイドバーメニュー項目をグレーアウト（視覚的に無効状態）にする
  - 無効化されたメニュー項目はクリック不可（リンク遷移を無効化）にする
  - メインコンテンツ領域にロック状態を伝えるメッセージを表示する仕組みを用意する
  - AppSidebarコンポーネントにHardStopStatusを渡し、メニュー項目の `disabled` 状態を制御する
  - _Requirements: 4.2_

- [x] 6.2 App Shell全体のレイアウト統合と動作確認
  - AppShellLayout内でAppSidebar、AppHeader、HardStopBannerを正しく組み合わせて描画する
  - 各Route Group（user, manager, admin）のlayoutからAppShellLayoutが正しく呼び出され、ロールに応じたメニューが表示されることを確認する
  - サイドバーの展開/折りたたみがトグルボタンで動作し、Cookie経由で状態が永続化されることを確認する
  - ページ遷移時にアクティブメニュー項目が正しく更新されることを確認する
  - 768px未満でサイドバーがSheet（オーバーレイ）モードに切り替わり、ハンバーガーメニューで開閉できることを確認する
  - ページタイトルが現在のメニューラベルと一致して表示されることを確認する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 6.1, 6.2, 6.4_

- [x]* 7. ユニットテストの作成
- [x]* 7.1 (P) ナビゲーション設定のユニットテストを作成する
  - `getMenuItemsForRole` が各ロールに対して正しい項目数と順序を返すことを検証する（User: 4項目、Manager: 3項目、Super Admin: 6項目）
  - `resolvePageTitle` がパスとロールの組み合わせに対して正しいタイトルを返すことを検証する
  - `isMenuItemActive` が完全一致とプレフィックス一致を正しく判定することを検証する
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x]* 7.2 (P) Hard Stop判定関数のユニットテストを作成する
  - 卒業日まで15日以上の場合に `{ kind: "none" }` が返ることを検証する
  - 卒業日まで14日の場合に `{ kind: "warning", daysRemaining: 14 }` が返ることを検証する
  - 卒業日まで1日の場合に `{ kind: "warning", daysRemaining: 1 }` が返ることを検証する
  - 卒業日当日（残り0日）の場合の境界値を検証する
  - 卒業日を過ぎている場合に `{ kind: "expired" }` が返ることを検証する
  - `graduationDate` が `null` の場合に `{ kind: "none" }` が返ることを検証する
  - **タイムゾーン境界テスト**: JST 23:59 と JST 00:00 をまたぐケースで Off-by-one エラーが発生しないことを検証する（`date-fns` の `differenceInCalendarDays` が時刻を無視して日付のみで比較していることの確認）
  - _Requirements: 4.1, 4.2_
