# Research & Design Decisions: mock-project-grading

---
**Purpose**: 採点・スキルレポート機能の設計ディスカバリで得られた調査結果と設計判断の根拠を記録する。
---

## Summary
- **Feature**: `mock-project-grading`
- **Discovery Scope**: Complex Integration（既存の `project_submissions` テーブル拡張 + 新規UI + チャートライブラリ）
- **Key Findings**:
  - 既存の `EvaluationItem` 型はPRD準拠の階層構造に更新が必要
  - レーダーチャートライブラリの選定は複数の有力候補があり、TBDとして残す
  - 採点の下書き保存は `project_submissions` の既存 `result_data` カラムにdraftフラグ付きで保存するパターンと、新規テーブル分離パターンの2案がある

## Research Log

### evaluation_items 型の階層構造への更新
- **Context**: 現在の `EvaluationItem` 型 (`{ id, category, criteria, weight }`) とPRD定義の階層構造 (`{ category_large, category_medium, items[] }`) に乖離がある
- **Sources Consulted**: 既存コードベース `lib/types/database.ts`, PRD `docs/prd.md`, requirements.md
- **Findings**:
  - mock-projects spec の同期API (`sync_mock_project_data`) は既に `EvaluationItem[]` 型でデータを受け取る設計
  - PRDでは `category_large`, `category_medium` による2階層構造を明確に定義
  - 各小項目は `{ id, label, point }` 形式（`weight` ではなく `point`、`criteria` ではなく `label`）
  - レーダーチャートの軸が `category_large` であるため、階層構造は必須
- **Implications**: `EvaluationItem` 型を `EvaluationCategory` 型（階層型）に置き換える。mock-projects spec の同期処理にも影響するが、型定義のみの変更で済む

### レーダーチャートライブラリの候補調査
- **Context**: React 19 + Next.js 16 環境で動作するレーダーチャートライブラリの選定
- **Sources Consulted**: npm, GitHub, 公式ドキュメント
- **Findings**:
  - **Recharts**: React向けの宣言的チャートライブラリ。`<RadarChart>` コンポーネントを提供。React 19対応済み。D3.jsベース
  - **Chart.js + react-chartjs-2**: Canvas ベースのチャートライブラリ。軽量で高パフォーマンス。React 19 対応は react-chartjs-2 v5 で確認必要
  - **Victory**: Formidable社製。宣言的API。React 19対応は要確認
  - **Nivo**: D3.jsベースのReactチャート。SSR対応あり。レーダーチャートは `@nivo/radar`
- **Implications**: ライブラリ選定は TBD として残し、設計上はライブラリ非依存のインターフェースを定義する

### 採点データの保存パターン
- **Context**: 下書き保存（draft）と確定保存のデータ管理方法
- **Sources Consulted**: 既存DB設計、requirements.md (TBD-4)
- **Findings**:
  - **パターンA（既存テーブル拡張）**: `project_submissions.result_data` に `{ draft: true, evaluations: {...} }` 形式で保存。確定時に `draft: false` に更新
  - **パターンB（新規テーブル分離）**: `project_evaluations` + `project_evaluation_details` テーブルを新設し、正規化された形式で保存
  - パターンAはシンプルだが、個別項目の集計クエリが煩雑（JSON内検索）
  - パターンBは正規化によりクエリが容易だが、テーブル追加のオーバーヘッドがある
- **Implications**: ユーザーの指示に従い、新規テーブル（`project_evaluations`, `project_evaluation_details`）の設計を行う。ただしパターンAとの比較は TBD として残す

### feedback_comment の保存先
- **Context**: TBD-5で「専用カラム」に決定済み
- **Sources Consulted**: requirements.md
- **Findings**:
  - `project_submissions` テーブルに `feedback_comment TEXT` カラムを追加する方針は確定
  - 既存の `project_submissions` テーブル定義には `feedback_comment` カラムが未定義
  - ALTER TABLE でカラム追加が必要
- **Implications**: マイグレーションで `feedback_comment` カラムを追加。型定義も更新

### ステータス遷移と rejected の扱い
- **Context**: TBD-3で「合否なし、スコアのみ」に決定済み
- **Sources Consulted**: requirements.md, mock-projects design.md
- **Findings**:
  - 既存の `project_submissions.status` は `'submitted' | 'grading' | 'graded' | 'rejected'` の4状態
  - 本specでは `rejected` を使用せず、`submitted` -> `grading` -> `graded` の3状態遷移のみ
  - 既存の型定義には `rejected` が含まれており、既存コードとの互換性を維持する必要がある
- **Implications**: DB上の CHECK 制約は変更せず（`rejected` を残す）、アプリケーション層で `rejected` への遷移を禁止する。将来的に `rejected` を削除するかは別途判断

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Server Actions + RLS | 既存パターン踏襲。採点操作を Server Actions で実装し、RLS で権限制御 | 既存パターンとの整合性、実装コスト低 | 複雑なトランザクション制御には RPC 関数が必要 | 採用 |
| API Routes | REST API として採点エンドポイントを実装 | 外部からの呼び出しが容易 | Server Actions パターンからの逸脱、オーバーエンジニアリング | 不採用 |

## Design Decisions

### Decision: EvaluationItem 型の更新方針
- **Context**: PRD準拠の階層構造への移行が必要
- **Alternatives Considered**:
  1. 既存型を維持し、アダプター層で変換
  2. 型定義を PRD 準拠の階層型に完全置換
- **Selected Approach**: 型定義を PRD 準拠の階層型に完全置換
- **Rationale**: アダプター層を挟むと二重管理になり、保守コストが増大。同期APIが唯一のデータ投入経路であるため、型を合わせる方が自然
- **Trade-offs**: mock-projects spec の同期処理（`sync_mock_project_data` RPC）の入力型も変更が必要
- **Follow-up**: mock-projects spec の design.md 内の `EvaluationItem` 参照箇所を確認し、影響範囲を特定する

### Decision: 採点データの保存構造（TBD）
- **Context**: 下書き保存と確定保存のデータ管理方法
- **Alternatives Considered**:
  1. A案: `project_submissions.result_data` に JSON で一括保存（既存カラム活用）
  2. B案: `project_evaluations` + `project_evaluation_details` テーブルを新設（正規化）
- **Selected Approach**: TBD -- ユーザー判断を仰ぐ
- **Rationale**:
  - A案: 実装がシンプル。テーブル追加不要。ただし項目別集計が JSON 検索になる
  - B案: SQL での集計が容易。レーダーチャートの軸集計に有利。ただしテーブル2つ追加
- **Follow-up**: design.md 内で両案の pros/cons を提示し、ユーザーに選択を委ねる

### Decision: レーダーチャートライブラリ（TBD）
- **Context**: React 19 環境でのレーダーチャート描画ライブラリの選定
- **Alternatives Considered**:
  1. Recharts
  2. Chart.js + react-chartjs-2
  3. Nivo (@nivo/radar)
- **Selected Approach**: TBD -- ユーザー判断を仰ぐ
- **Rationale**: いずれも有力候補であり、プロジェクトの方針（バンドルサイズ、SSR対応、カスタマイズ性）に依存する
- **Follow-up**: design.md 内で各候補の特徴を提示し、PoC 実施後にユーザーが決定

## Risks & Mitigations
- **Risk**: `EvaluationItem` 型変更による mock-projects spec への影響 -- 同期 RPC の入力型も更新が必要。マイグレーション戦略で段階的に対応
- **Risk**: レーダーチャートライブラリの React 19 互換性 -- PoC で動作確認を実施してからライブラリを確定
- **Risk**: `project_submissions` テーブルへのカラム追加（`feedback_comment`）によるダウンタイム -- NULL 許容カラムのため、ALTER TABLE はロックフリーで実行可能

## References
- PRD: `docs/prd.md` -- 模擬案件と採点のテーブル定義（セクション6.3）
- mock-projects design: `.kiro/specs/mock-projects/design.md` -- 既存の模擬案件設計
- Recharts 公式: https://recharts.org/
- Chart.js 公式: https://www.chartjs.org/
- Nivo 公式: https://nivo.rocks/
