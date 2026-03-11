# デザインワークフロー規約

Pencil MCPを活用したデザイン駆動開発のワークフローとルール。

## デザインツール

- **Pencil MCP**: `.pen`ファイルによるUI設計。AIがデザインを生成・編集し、人間がレビューする
- **デザインファイル配置**: 全デザインデータは `designs/` ディレクトリに `.pen` 形式で保存する
- **デザインシステム**: `designs/design-system.pen` に共通コンポーネントとデザイントークンを定義

## 美的方向性: Japanese Swiss × i.field Corporate

スタイルガイド「Japanese Swiss Web Dashboard」をベースに、i.fieldのコーポレートカラーを統合:

### コーポレートカラー

- **ブルー（濃）**: `#00B0EC` — Primary。CTA、主要アクション、リンク
- **ブルー（淡）**: `#7FCEF4` — Info、チャート、ダークモードのPrimary
- **イエロー**: `#F3C116` — Accent。ハイライト、重要通知、Warning

### カラー方針

- **背景**: ウォームオフホワイト `#FAFAFA`
- **サイドバー**: ダークネイビー `#0C1D2E`（コーポレートブルーの深い派生色）
- **テキスト**: `#1A1A1A`（ほぼブラック、ロゴの #45494B と調和）
- **ボーダー**: `#E5E7EB` で構造を表現、シャドウは使用しない
- **Destructive**: `#EF4444`（エラー系）

### レイアウト・タイポグラフィ

- **フォント**: Sora（UI/見出し） + IBM Plex Mono（データ/技術テキスト）
- **コーナー**: シャープエッジ（radius: 0px）全要素統一
- **タイポグラフィ**: 見出しにネガティブ letter-spacing (-1 〜 -2px)

## デザイントークンとshadcn/uiの対応

Pencil MCPのデザイントークン（`$--variable`）はshadcn/uiのCSS変数（`var(--variable)`）と同一命名規則:

```
Pencil MCP          →  CSS/Tailwind
$--background       →  var(--background)     / bg-background
$--primary          →  var(--primary)        / bg-primary
$--foreground       →  var(--foreground)     / text-foreground
$--border           →  var(--border)         / border-border
$--font-primary     →  Sora                  / font-primary（@layer baseで定義）
$--font-secondary   →  IBM Plex Mono         / font-secondary（@layer baseで定義）
```

## 開発フロー（4フェーズ）

### Phase 1: 仕様策定 (cc-sdd)

```
/kiro:spec-init → /kiro:spec-requirements → /kiro:spec-design → /kiro:spec-tasks
```

機能要件・設計・タスクを仕様として定義する。

### Phase 2: デザイン生成 (Pencil MCP)

1. AIが `designs/design-system.pen` の既存コンポーネントを確認
2. 仕様（`.kiro/specs/{feature}/requirements.md`）を読み込む
3. 画面デザインを `designs/{feature-name}.pen` に生成
4. `get_screenshot` でセルフレビュー・修正

### Phase 3: 人間レビュー

1. Pencilエディタで `.pen` ファイルを開いて確認
2. テキストでフィードバック → AIが修正 → 再レビュー
3. デザイン確定を宣言

### Phase 4: 実装 (cc-sdd tasks)

1. 確定済み `.pen` ファイルを `batch_get` で読み取り
2. `get_variables` でデザイントークンを取得
3. Pencil MCP Code Guidelinesに従いReact + Tailwindで実装
4. shadcn/uiコンポーネントをベースに、デザインの指定に合わせてカスタマイズ

## designsディレクトリの命名規約

```
designs/
├── design-system.pen          # 共通デザインシステム
├── {feature-name}.pen         # 機能別デザイン（kebab-case）
```

- 1機能1ファイルを原則とする
- ファイル名はkebab-caseで `.pen` 拡張子
- 機能名はcc-sddの仕様名と一致させる

## 利用可能なコンポーネント（design-system.pen）

| カテゴリ | コンポーネント名 |
|---------|--------------|
| Button | Primary, Secondary, Outline, Ghost, Destructive |
| Form | Input, Input Group, Textarea |
| Data | Card（Header/Content/Actions スロット）, MetricCard, ActivityItem |
| Badge | Default, Success, Warning, Error, Info, Outline |
| Navigation | SidebarItem/Active, SidebarItem/Default |
| Table | HeaderRow, DataRow |
| Avatar | Standard (36px), Large (48px) |
| Layout | Separator |

## コード生成時のルール

- Tailwind CSSクラスのみ使用（インラインスタイル禁止）
- CSS変数でカラーを参照（ハードコードされた16進数値禁止）
- `fill_container` → `flex-1` または `w-full`/`h-full`
- フォントは `@layer base` で定義したユーティリティクラスを使用
- Lucideアイコンライブラリを統一使用

---
_created_at: 2026-02-24_
