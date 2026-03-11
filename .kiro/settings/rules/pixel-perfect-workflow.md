# Pixel-Perfect 検証ループ (Visual QA Loop)

## 目的

UIコンポーネントおよび画面の実装タスク（`/kiro:spec-impl`）において、Pencilデザインと実装の視覚的一致を自動検証し、レイアウト・背景・余白の合致率 **95%以上** を達成するまで自律的に修正を繰り返す。

## 適用範囲

- **必須**: UIコンポーネント・画面を新規作成または大幅改修するすべてのタスク
- **スキップ不可**: このプロセスはUI実装タスクの完了条件に含まれる。Visual QA ループを経ていないUI実装タスクは `completed` にマークしてはならない
- **除外**: バックエンドロジックのみのタスク、型定義のみのタスク、テストのみのタスク

## 前提条件

- 対象機能のPencilデザイン（`.pen` ファイル）が `designs/` に存在すること
- ローカル開発サーバー（`localhost:3000`）が起動可能であること
- Python 3 + Pillow がシステムにインストール済みであること
- Playwright がプロジェクトにセットアップ済みであること（未導入の場合は初回実行時にセットアップする）

## Visual QA ループ フロー

### Step 0: 実装コードの初版完成

通常のTDD実装フロー（テスト → 実装 → リファクタ）で初版コードを書き終える。ユニットテストが全PASSしていることを確認する。

### Step 1: 正解画像の自動取得

Pencil MCP の `get_screenshot` ツールを使用し、対象画面の各Screenノードのスクリーンショットを自動取得する。AIが直接画像を視覚的に読み取り、実装画像との比較に使用する。

- 対象: `.pen` ファイル内の各Screenノード（ノードIDはデザインフェーズで記録済み）
- `get_screenshot` はAIが直接閲覧可能な画像を返す（ファイル保存不要）
- 複数画面がある場合は、全画面のスクリーンショットを取得する

### Step 2: 実装スクリーンショットの自動取得

ユーザーから画像配置完了の報告を受けたら:

1. ローカル開発サーバーが起動していなければ `npm run dev` をバックグラウンドで起動
2. Playwright スクリプトを一時作成し、対象ページのスクリーンショットを取得

```typescript
// /tmp/visual-qa-screenshot.ts (一時ファイル)
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Viewport を正解画像と完全一致させる
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });

  await page.goto('http://localhost:3000/{対象パス}');
  await page.waitForLoadState('networkidle');

  await page.screenshot({
    path: 'designs/references/{機能名}/{画面名}_impl.png',
    fullPage: false,  // Viewport 範囲のみ
  });

  await browser.close();
})();
```

**重要**: 正解画像の解像度（Width x Height）を `Pillow` で事前に読み取り、Playwright の Viewport をそれに完全一致させること。

### Step 3: ピクセル差分ヒートマップの生成

Python スクリプトを一時作成・実行し、差分画像を生成する:

```python
# /tmp/visual-qa-diff.py (一時ファイル)
from PIL import Image, ImageChops, ImageFilter
import sys

def generate_heatmap(reference_path, impl_path, output_path):
    ref = Image.open(reference_path).convert('RGB')
    impl = Image.open(impl_path).convert('RGB')

    # サイズ不一致の場合はリサイズ（警告を出力）
    if ref.size != impl.size:
        print(f"WARNING: Size mismatch - Reference: {ref.size}, Impl: {impl.size}")
        impl = impl.resize(ref.size, Image.LANCZOS)

    # ピクセル差分を計算
    diff = ImageChops.difference(ref, impl)

    # 差分を強調（視認性向上）
    diff = diff.point(lambda x: min(x * 3, 255))

    # 合致率の計算
    pixels = list(diff.getdata())
    total = len(pixels)
    # アンチエイリアス差分を無視（閾値: RGB各チャネル30以下）
    matching = sum(1 for r, g, b in pixels if r <= 30 and g <= 30 and b <= 30)
    match_rate = (matching / total) * 100

    diff.save(output_path)
    print(f"Match rate: {match_rate:.1f}%")
    print(f"Heatmap saved: {output_path}")

    return match_rate

if __name__ == '__main__':
    rate = generate_heatmap(sys.argv[1], sys.argv[2], sys.argv[3])
    sys.exit(0 if rate >= 95.0 else 1)
```

出力先: `designs/references/{機能名}/{画面名}_diff.png`

### Step 4: AIによる自己分析

生成したヒートマップ画像と正解画像・実装画像の3枚を `Read` ツールで読み込み、以下を詳細に分析する:

#### 分析項目

| 領域 | チェック内容 |
|------|------------|
| Header | 高さ、パディング、テキストサイズ・ウェイト、アイコン位置 |
| Navigation/Sidebar | 幅、アイテム間隔、アクティブ状態 |
| Table/List | 列幅、行高、セルパディング、ヘッダー背景色 |
| Card | 角丸、パディング、影、ボーダー |
| Form | 入力フィールド高さ、ラベル位置、間隔 |
| Button | 高さ、パディング、角丸、アイコンギャップ |
| Typography | フォントサイズ、ウェイト、行間、色 |
| Spacing | マージン、ギャップ、セクション間余白 |

#### 出力フォーマット

```
## Visual QA 分析レポート - {画面名}

### 全体合致率: {XX.X}%

### 領域別分析
| 領域 | 合致率(概算) | 差分詳細 |
|------|-------------|---------|
| Header | 98% | テキスト位置: 一致 |
| Table | 85% | 列幅: 「ロール」列が20px広い、行高: 4px不足 |
| ... | ... | ... |

### 修正アクション（優先度順）
1. [ファイル:行] - 修正内容
2. [ファイル:行] - 修正内容
```

### Step 5: 修正イテレーション

差分を発見した場合:

1. コード（Tailwindクラス等）を修正
2. **Step 2〜4 を再実行**
3. 合致率 **95%以上** になるまで繰り返す

#### 終了条件

- **PASS（95%以上）**: レイアウト・背景・余白の合致率が95%以上。タスクを `completed` にマーク可能
- **許容差分**: フォントレンダリングエンジンの違いによるアンチエイリアス差分（RGB各チャネル30以下の微小差分）は無視する
- **最大イテレーション**: 5回。5回で95%未達の場合はユーザーに報告し、残差分の手動確認を依頼する

## ディレクトリ構成

プロジェクトルート（`lms-fe/` の親ディレクトリ）を基準とする:

```
designs/                           # プロジェクトルート直下
├── *.pen                          # Pencil デザインファイル
└── references/
    └── {機能名}/
        ├── {画面名}.png           # 正解画像（ユーザーがエクスポート）
        ├── {画面名}_impl.png      # 実装スクリーンショット（自動生成）
        └── {画面名}_diff.png      # 差分ヒートマップ（自動生成）
```

## タスク完了チェックリスト

UI実装タスクを `completed` にする前に、以下がすべて満たされていること:

- [ ] ユニットテスト全PASS
- [ ] Visual QA ループ実行済み
- [ ] 合致率 95%以上 達成（または最大5イテレーション後にユーザー承認済み）
- [ ] 差分ヒートマップが `designs/references/` に保存済み
- [ ] 分析レポートがタスク完了コメントに含まれている

## ツールセットアップ（初回のみ）

### Playwright

```bash
npm install -D playwright @playwright/test
npx playwright install chromium
```

### Python Pillow

```bash
pip3 install Pillow
```

## 注意事項

- 一時スクリプト（`/tmp/visual-qa-*.{ts,py}`）は検証完了後に削除すること
- 正解画像は Pencil MCP の `get_screenshot` で自動取得する
- ダイアログなどのオーバーレイ要素は、個別にスクリーンショットを取得すること
- ダークモード/ライトモードがある場合は、デフォルトテーマで検証する
- レスポンシブ対応が必要な場合は、デザインで指定された各ブレークポイントで検証する
