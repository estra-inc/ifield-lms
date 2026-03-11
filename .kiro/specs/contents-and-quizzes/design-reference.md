# デザインリファレンス: 教材・演習（designs/contents.pen より抽出）

## 画面構成

### 1. 教材一覧画面 (`/contents`)

**レイアウト**: App Shell (Sidebar 240px + Content Area)
- 全体: 1440 x 900, background: #FAFAFA

**ヘッダー** (h=64px, padding: 0 24px, border-bottom: #E5E7EB):
- 左: SidebarTrigger (panel-left icon, 36x36) + ページタイトル "教材・演習" (Sora 18px/600, letterSpacing: -1)
- 中央: セマンティック検索バー (w=600, h=36, bg=#F3F4F6, radius=8, search icon + "教材をセマンティック検索..." placeholder, IBM Plex Mono 13px)
- 右: スペーサー (w=160)
- **注意**: 検索バーはUserロール専用。全画面共通で提供。

**コンテンツ領域** (padding: 24px 32px, gap: 24px, vertical):

1. **進捗サマリー統計行** (horizontal, gap=16, 3カード等高, **選択中ジャンルに連動**):
   - カード共通: bg=#FFFFFF, radius=8, border=#E5E7EB, padding=20, height=fill_container
   - **ジャンル進捗**: ラベル "{ジャンル名} 進捗" (IBM Plex Mono 12px, #6B7280) → 値 "47%" (Sora 28px/700, #1A1A1A) → サブ "32 / 68 セクション完了" (11px, #6B7280) — 選択中ジャンル内のセクション集計
   - **完了チュートリアル**: ラベル → 値 "1 / 4" (Sora 28px/700) → サブ "Node.js 基礎 完了済み" (11px, #22C55E) — 選択中ジャンル内のチュートリアル集計
   - **学習中**: ラベル → チュートリアル名 "HTML/CSS 基礎" (Sora 16px/600) → サブ "チャプター3 / セクション2 まで完了" (11px, #00B0EC) → **「続きから学習する →」リンク** (IBM Plex Mono 12px/600, #00B0EC) — 選択中ジャンル内の現在学習中チュートリアル

2. **タブ行** (border-bottom: #E5E7EB, space-between):
   - 左: タブグループ
     - Active: "教材" (Sora 14px/600, #1A1A1A, border-bottom: 2px #00B0EC)
     - Inactive: "演習問題" (Sora 14px/normal, #6B7280)
   - 右: **ジャンルプルダウン** (h=36, border=#E5E7EB, radius=8, padding=8px 12px)
     - テキスト: "エンジニアリング" (Sora 13px/500, #1A1A1A) + chevron-down icon (#6B7280)
     - 選択肢: エンジニアリング / デザイン
     - ユーザーごとのデフォルトジャンル設定と連動

3. **チュートリアルカードグリッド** (vertical, gap=16):
   - 行ごとに3カード (horizontal, gap=16)
   - 選択されたジャンルのチュートリアルのみフラット表示
   - カード構成: bg=#FFFFFF, radius=8, border=#E5E7EB, padding=20, gap=12
     - タイトル: Sora 15px/600, #1A1A1A
     - メタ: "Nチャプター・Mセクション" (IBM Plex Mono 12px, #6B7280)
     - 進捗: ラベル "進捗 60%" (IBM Plex Mono 11px/600, #00B0EC) + プログレスバー (h=6, radius=pill, bg=#F3F4F6, fill=#00B0EC)
     - 完了時: "完了!" (#22C55E), プログレスバーも #22C55E
     - 未着手: "未着手" (#6B7280), プログレスバー空

### 2. 教材詳細画面 (`/contents/{tutorial}/{chapter}/{section}`)

**レイアウト**: App Shell (Sidebar 240px + Content Area)

**ヘッダー** (同上: 検索バー中央配置)

**パンくずリスト** (padding: 20px 40px):
- 構成: 教材(#00B0EC) / チュートリアル名(#00B0EC) / チャプター名(#00B0EC) / セクション名(#1A1A1A, 600)
- セパレータ: " / " (IBM Plex Mono 13px, #6B7280)

**メインレイアウト** (horizontal, padding: 0 40px 40px):

1. **サイドバー目次 (ToC)** (w=240, padding-top=24):
   - タイトル: "目次" (Sora 14px/700) + 8px スペーサー（タイトルと最初のメニュー項目の間）
   - アクティブ項目: bg=#EFF9FE, left-border 3px #00B0EC, radius=4, text #00B0EC (IBM Plex Mono 13px/600)
   - 非アクティブ: text #6B7280 (IBM Plex Mono 13px/normal)
   - 各項目: padding 8px 12px
   - **スクロール追従でアクティブハイライト更新**

2. **メインコンテンツ** (vertical, padding: 24px 0 24px 32px, gap=32):
   - セクションタイトル: Sora 22px/700, #1A1A1A
   - h2見出し: Sora 18px/600, #1A1A1A
   - 本文: IBM Plex Mono 14px/normal, lineHeight=1.8, #1A1A1A
   - **コードブロック**: bg=#1E293B, radius=8, padding=16, font=IBM Plex Mono 13px
     - コメント: #94A3B8
     - コード: #E2E8F0
   - **未読了状態** (セクション未完了時):
     - セクションナビゲーション（前へ/次へ）は**非表示**
     - 読了セクション (vertical, gap=12):
       - ラベル: "このセクションを読み終えましたか？" (IBM Plex Mono 13px, #6B7280)
       - 読了ボタン: bg=#00B0EC, radius=8, padding=12px 32px, "読了する" (Sora 14px/600, #FFFFFF), circle-check icon
   - **読了済み状態** (セクション完了後):
     - セクションナビゲーション (horizontal, space-between):
       - 前へ: outline button (border=#E5E7EB, radius=8, padding=10px 16px) "< 前のセクション"
       - 次へ: filled button (bg=#00B0EC, radius=8, #FFFFFF) "次のセクション >"
     - 読了ボタン: bg=#F3F4F6 (disabled), "読了済み" (text=#22C55E, icon=#22C55E)

### 3. 読了おめでとうモーダル

**表示タイミング**: 読了ボタン押下後、Server Action 完了時にオーバーレイ表示

**オーバーレイ**: 画面全体の背景色 #9CA3AF、サイドバー・コンテンツ領域は opacity=0.4 でディミング。検索バー背景色・目次アクティブハイライトはモーダル表示時に非表示（背景の均一化）

**モーダルカード** (w=440, bg=#FFFFFF, radius=12, padding=32, gap=24, vertical, center, shadow: 0 8 40 rgba(0,0,0,0.3)):
- **アイコン**: circle-check (lucide, 32x32, fill=#22C55E) in circle bg (#ECFDF5, 64x64, radius=pill)
- **タイトル**: "おめでとうございます!" (Sora 20px/700, #1A1A1A, center)
- **説明文**:
  - 通常: "「{セクション名}」の学習が完了しました。\n引き続き次のセクションに進みましょう。" (IBM Plex Mono 13px, #6B7280, center, lineHeight=1.7)
  - 最終セクション: "「{セクション名}」の学習が完了しました。\nこのチャプターのすべてのセクションを修了しました！"
- **ボタングループ** (vertical, gap=10, fill_container):
  - **プライマリ**:
    - 通常: "次のセクションに進む" (bg=#00B0EC, radius=8, h=44, Sora 14px/600, #FFFFFF, arrow-right icon)
    - 最終セクション: "チャプター一覧に戻る" (bg=#00B0EC, radius=8, h=44, Sora 14px/600, #FFFFFF, layout-list icon)
  - **セカンダリ**: "教材一覧に戻る" (outline, border=#E5E7EB, radius=8, h=44, Sora 14px/500, #1A1A1A, book-open icon)

## サイドバー (Userロール)

- bg=#0C1D2E, w=240, border-right=#1E3A5F
- ロゴ: "i.field" (Sora 18px/700, #F0F9FF), h=64, border-bottom=#1E3A5F
- メニュー項目: gap=2, padding=12px 8px
  - 通常: text #F0F9FF, Sora 13px, icon 18x18 (lucide), gap=12, padding=10px 12px, radius=8
  - Active: bg=#163456, fontWeight=600
  - 項目: ダッシュボード, **教材・演習(Active)**, 日報, 学習目標, 模擬案件, 設定・プロフィール
- フッター: border-top=#1E3A5F, avatar(36x36, bg=#00B0EC) + name(#F0F9FF) + role "受講生"(#4B6A8A)

## デザイントークン

| トークン | 値 |
|---------|------|
| --primary | #00B0EC |
| --foreground | #1A1A1A |
| --background | #FAFAFA |
| --card | #FFFFFF |
| --border | #E5E7EB |
| --muted | #F3F4F6 |
| --muted-foreground | #6B7280 |
| --success | #22C55E |
| --sidebar | #0C1D2E |
| --sidebar-accent | #163456 |
| --sidebar-accent-foreground | #F0F9FF |
| --sidebar-border | #1E3A5F |
| --sidebar-foreground | #F0F9FF |
| --sidebar-muted | #4B6A8A |
| --sidebar-primary | #00B0EC |
| --radius-m | 8px |
| --radius-pill | 9999px |
| フォント(見出し) | Sora |
| フォント(本文) | IBM Plex Mono |

## ユーザーからの確定仕様

1. **ジャンルはプルダウンで切替**: エンジニアリング/デザインの2ジャンル。タブ行右側にプルダウン配置。ジャンル内のチュートリアルはフラット表示（サブカテゴリ見出しなし）
2. **デフォルトジャンル設定**: ユーザーごとにデフォルトジャンルを保存し、初回アクセス時に自動適用
3. **学習中カード**: 現在学習中のセクションへ直接遷移するリンクを提供
4. **検索バー**: Userロール限定、全画面共通のヘッダー中央配置、セマンティック検索対応（検索ロジックは別spec）
5. **タブ切替**: 教材/演習問題をタブで切り替え（演習問題は将来実装）
6. **URLスキーマ**: `/contents/{tutorial}/{chapter}/{section}` （ジャンルをURLから除外）
7. **Markdown描画**: GitHub Flavored Markdown準拠。Shiki(github-dark)によるシンタックスハイライト
