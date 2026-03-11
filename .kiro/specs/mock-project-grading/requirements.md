# Requirements Document

## Project Description (Input)
模擬案件の採点・スキルレポート機能。Manager（コーチ・メンター）による模擬案件提出物の採点フローと、受講生のスキル評価レポート（レーダーチャート）の生成を提供する。採点は階層チェックリスト形式（evaluation_items）で行い、スコアを算出する。スキルレポートはジャンル別の模擬案件スコアを集約し、レーダーチャートで可視化する。採点結果は project_submissions テーブルに保存され、受講生・Manager双方が閲覧可能。今回のスコープはManager側の採点UI、受講生側の結果閲覧、スキルレポート画面に限定する。

## Introduction

本仕様書は、LMS（社内研修学習管理システム）における「模擬案件の採点・スキルレポート」機能の要件を定義する。受講生側の模擬案件閲覧・提出フローは `.kiro/specs/mock-projects/` で定義済みであり、本仕様はその後続工程として採点フローと結果閲覧に焦点を当てる。

### スコープ

**対象:**
- 採点画面（未採点一覧 + 採点フォーム）
- 採点フロー（チェックリスト評価 → スコア自動計算 → 合否判定 → 確定）
- フィードバックコメント入力
- 受講生向けスキルレポート画面（レーダーチャート + 詳細リスト）
- Manager/Super Admin向けスキルレポート閲覧
- 採点に関する権限制御（RLS）

**対象外:**
- 受講生側の案件一覧・提出フロー（mock-projects specで定義済み）
- 模擬案件データの同期（mock-projects specで定義済み）
- タスク管理カンバン（mock-projects specで定義済み）

### 前提条件・既存仕様との関係

- 既存specの `mock-projects` では、ステータスは `submitted / grading / graded / rejected` の4状態と定義されているが、本specでは合否ステータスを持たない方針に決定した（TBD-3確定済み）。`rejected` は使用せず、採点完了時は一律 `graded` とし、正答率のみを記録する
- 現在の `EvaluationItem` 型（database.ts）は `{ id, category, criteria, weight }` だが、PRDのスキーマは `{ category_large, category_medium, items[{id, label, point}] }` という階層構造を想定している。本specではPRDの階層構造を前提とし、型定義の更新が必要であることを注記する

### データモデル補足

**PRD準拠の evaluation_items JSON Schema（案件マスタ側）:**
```json
[
  {
    "category_large": "Backend",
    "category_medium": "Laravel",
    "items": [{ "id": "uuid-1", "label": "Migration", "point": 5 }]
  }
]
```

**result_data JSON Schema（採点結果側）:**
```json
{
  "evaluations": {
    "uuid-1": true,
    "uuid-2": false
  },
  "comment": "総合フィードバックコメント（TBD-5による）"
}
```

> **注意:** 現在の `EvaluationItem` 型 (`{ id, category, criteria, weight }`) はPRDの階層構造と乖離している。設計フェーズで型定義の更新方針を決定する必要がある。

## Requirements

### Requirement 1: 未採点提出一覧

**Objective:** 採点者として、採点待ちの提出物を一覧で確認したい。未採点の提出を効率的に把握し、採点作業に着手できるようにするため。

#### Acceptance Criteria

1. When 採点者が未採点一覧ページにアクセスする, the LMS shall `status = 'submitted'` の全提出物を提出日時の昇順（古い順）でリスト表示する
2. The LMS shall 各提出物について、受講生名、案件タイトル、GitHub URL、提出日時、ステータスバッジを表示する
3. When 採点者が一覧の提出物をクリックする, the LMS shall 当該提出物の採点画面へ遷移する
4. While 未採点の提出物が存在しない状態, the LMS shall 「未採点の提出はありません」の空状態メッセージを表示する
5. The LMS shall `status = 'grading'`（採点中）の提出物も一覧に表示し、採点中であることをバッジで区別する
6. The LMS shall 一覧にジャンル（engineering/design）によるフィルタリング機能を提供する

> **確定:** 採点者 = Super Admin ロールのみ（TBD-1確定済み）。

---

### Requirement 2: 採点画面 - チェックリスト評価

**Objective:** 採点者として、模擬案件の提出物を階層型チェックリストで評価したい。evaluation_itemsに基づいて項目ごとにOK/NGを判定し、体系的に採点を行えるようにするため。

#### Acceptance Criteria

1. When 採点者が採点画面にアクセスする, the LMS shall 該当案件のevaluation_itemsを階層構造（大項目 > 中項目 > 小項目）でチェックリストとして表示する
2. The LMS shall 各小項目に対してOK（チェックオン）/ NG（チェックオフ）のトグル操作を提供する
3. The LMS shall チェックリストの上部に受講生名、案件タイトル、提出GitHub URLを表示する
4. The LMS shall GitHub URLをクリック可能なリンクとして表示し、新しいタブで提出物を確認可能にする
5. While 採点画面が表示されている状態, the LMS shall 各大項目ごとの小計（OK数 / 全項目数）をリアルタイムで表示する
6. While 採点画面が表示されている状態, the LMS shall 全体スコア（OK項目のpoint合計 / 全項目のpoint合計 x 100）をリアルタイムで算出・表示する
7. When 採点者が採点画面にアクセスする, the LMS shall 提出物のステータスを `grading` に更新する
8. If 既に他の採点者がステータスを `grading` に変更済みの場合, the LMS shall 警告を表示し、続行するか確認する（楽観的ロック）

---

### Requirement 3: スコア算出

**Objective:** システムとして、チェックリストの評価結果からスコアを自動計算したい。一貫性のあるスコア計算を保証するため。

#### Acceptance Criteria

1. The LMS shall スコアを以下の計算式で算出する: `(OK判定された項目のpoint合計 / 全項目のpoint合計) x 100`（小数点以下は四捨五入して整数値）
2. The LMS shall 算出されたスコアを `project_submissions.score` に保存する
3. The LMS shall 各項目のOK/NG結果を `project_submissions.result_data` にJSON形式（`{ "evaluations": { "item-id": true/false } }`）で保存する
4. While 全項目が未評価の状態, the LMS shall スコアを0%と表示する
5. The LMS shall スコア計算をフロントエンド側でリアルタイムプレビューし、確定時にサーバーサイドで再計算・検証する

---

### Requirement 4: 採点確定

**Objective:** 採点者として、評価結果を確定し、スコアを記録したい。受講生に対して正答率を提示できるようにするため。

#### Acceptance Criteria

1. The LMS shall 採点確定時にsubmissionのステータスを一律 `graded` に更新する（合否判定は行わない）
2. When 採点者が「採点確定」ボタンを押下する, the LMS shall 確認ダイアログを表示し、確定操作の取り消しが不可能であることを警告する
3. When 採点者が確認ダイアログで確定を承認する, the LMS shall スコア、result_data、feedback_comment、ステータスを同一トランザクション内で保存する
4. If 全てのチェック項目が未評価の状態で「採点確定」ボタンを押下する, the LMS shall エラーメッセージを表示し、確定を受け付けない
5. When 採点が確定する（graded）, the LMS shall 受講生の排他制御を解除する（次の案件への着手が可能になる）

---

### Requirement 5: フィードバックコメント

**Objective:** 採点者として、採点結果に加えてフィードバックコメントを入力したい。受講生に対して改善点やアドバイスを伝えられるようにするため。

#### Acceptance Criteria

1. The LMS shall 採点画面にフィードバックコメント入力欄（テキストエリア）を表示する
2. The LMS shall フィードバックコメントを任意入力とする（空でも採点確定可能）
3. When 採点が確定する, the LMS shall フィードバックコメントをresult_dataまたは専用カラムに保存する
4. While 受講生がスキルレポートまたは提出履歴を閲覧する状態, the LMS shall 採点者からのフィードバックコメントを表示する
5. The LMS shall フィードバックコメントの最大文字数を2000文字とする

> **確定:** フィードバックコメントは `project_submissions.feedback_comment TEXT` 専用カラムに保存（TBD-5確定済み）。

---

### Requirement 6: 採点の一時保存（Draft）

**Objective:** 採点者として、採点作業を中断し後から再開したい。大量のチェック項目がある場合に一度に完了できない状況に対応するため。

#### Acceptance Criteria

1. When 採点者が「一時保存」ボタンを押下する, the LMS shall 現在のチェック状態とフィードバックコメントを保存し、ステータスを `grading` のまま維持する
2. When 採点者が一時保存済みの採点画面に再アクセスする, the LMS shall 前回保存したチェック状態とフィードバックコメントを復元して表示する
3. While 一時保存データが存在する状態, the LMS shall 未採点一覧で当該提出物に「採点中（下書き）」のバッジを表示する
4. The LMS shall 一時保存データをresult_dataまたは専用フィールドに保存する

> **確定:** 一時保存は有効（TBD-4確定済み）。result_dataにdraftフラグ付きで保存する。

---

### Requirement 7: 受講生向け採点結果閲覧

**Objective:** 受講生として、自分の提出物の採点結果を詳細に確認したい。どの項目がクリアでき、どの項目が未達であるかを把握し、次回の提出に活かせるようにするため。

#### Acceptance Criteria

1. When 受講生が採点完了済み（graded）の提出物の詳細を閲覧する, the LMS shall スコア（%）、フィードバックコメントを表示する
2. The LMS shall 採点結果をアコーディオン形式の詳細リスト（大項目 > 中項目 > 小項目）で表示し、各項目のOK/NGをアイコンで区別する
3. The LMS shall 各大項目ごとの小計（OK数 / 全項目数、達成率%）を表示する
4. While 提出物がsubmittedまたはgrading状態, the LMS shall 採点結果セクションを非表示にし、「採点待ち」または「採点中」のメッセージを表示する
5. The LMS shall 受講生は採点結果を閲覧のみ可能とし、変更操作を提供しない

---

### Requirement 8: スキルレポート画面

**Objective:** 受講生として、模擬案件全体を通じたスキルの達成状況を確認したい。自身の強み・弱みを視覚的に把握し、学習の方向性を定められるようにするため。

#### Acceptance Criteria

1. When 受講生がスキルレポート画面にアクセスする, the LMS shall 採点完了済み（graded）の全案件のスコアを集約し、レーダーチャートで可視化する
2. The LMS shall レーダーチャートの下に案件ごとの詳細セクション（案件名、スコア、採点日）をリスト表示する
3. While 採点完了済みの案件が存在しない状態, the LMS shall 「まだ採点済みの案件がありません」の空状態メッセージを表示し、レーダーチャートを非表示にする
4. When 受講生が詳細セクションの案件をクリックする, the LMS shall 当該案件の採点結果詳細（Requirement 7のアコーディオン形式）へ遷移またはモーダル表示する
5. The LMS shall 同一案件に複数回の採点がある場合、最新のgraded結果をレーダーチャートの集計対象とする

> **確定:** レーダーチャートの軸は `category_large` から自動導出（TBD-2確定済み）。案件ごとにレーダーチャートを表示する。

---

### Requirement 9: レーダーチャート表示

**Objective:** システムとして、スキルの達成状況をレーダーチャートで視覚的に表現したい。複数の評価軸にわたるスキルバランスを直感的に理解できるようにするため。

#### Acceptance Criteria

1. The LMS shall レーダーチャートをクライアントサイドのチャートライブラリ（例: Recharts）で描画する
2. The LMS shall 各軸の値を達成率（%: 0-100）で表示する
3. The LMS shall レーダーチャートの各頂点に軸名と達成率の数値を表示する
4. While 表示対象のデータが1軸以下の場合, the LMS shall レーダーチャートの代わりにプログレスバー形式で表示する
5. The LMS shall レーダーチャートをレスポンシブ対応とし、モバイル画面でも視認可能なサイズで描画する

> **確定:** レーダーチャートの軸は `category_large` から自動導出（TBD-2確定済み）。

---

### Requirement 10: Manager向けスキルレポート閲覧

**Objective:** Managerとして、担当受講生のスキルレポートを閲覧したい。受講生の強み・弱みを把握し、コーチングの方向性を検討できるようにするため。

#### Acceptance Criteria

1. When Managerがユーザー詳細画面からスキルレポートリンクをクリックする, the LMS shall 当該受講生のスキルレポート（レーダーチャート + 詳細リスト）を表示する
2. The LMS shall Managerに対してスキルレポートの閲覧のみを許可し、採点操作は提供しない
3. The LMS shall Managerがmock_projectsテーブルのevaluation_items詳細にアクセスできないようRLSで制御する（スコアと達成率の集約結果のみ閲覧可能）
4. While 当該受講生に採点完了済みの案件が存在しない状態, the LMS shall 「まだ採点済みの案件がありません」の空状態メッセージを表示する

---

### Requirement 11: Super Admin向けスキルレポート閲覧

**Objective:** Super Adminとして、任意の受講生のスキルレポートを閲覧したい。全受講生の評価状況を俯瞰し、運営判断に活用するため。

#### Acceptance Criteria

1. When Super Adminがユーザー詳細画面からスキルレポートリンクをクリックする, the LMS shall 当該受講生のスキルレポート（レーダーチャート + 詳細リスト）を表示する
2. The LMS shall Super Adminに対してevaluation_itemsの項目レベルの採点詳細（OK/NG結果）も閲覧可能とする
3. When Super Adminが未採点一覧から採点画面に遷移する, the LMS shall 採点完了後にスキルレポート画面へのリンクを表示する

---

### Requirement 12: アクセス制御とセキュリティ（採点・レポート）

**Objective:** システムとして、採点とスキルレポートに対する適切なアクセス制御を実装したい。権限のないユーザーが採点操作や他者のレポートを閲覧できないようにするため。

#### Acceptance Criteria

1. The LMS shall 採点画面へのアクセスを採点権限のあるロールに限定する（Middleware + RLS）
2. The LMS shall 受講生（User）が採点操作（ステータス変更、スコア保存）を実行できないようRLSで制御する
3. The LMS shall 受講生は自身のproject_submissionsのresult_data、score、statusのみ参照可能とするRLSポリシーを設定する
4. The LMS shall Managerが他のManagerの担当外ユーザーのスキルレポートにもアクセス可能とする（全ユーザーのレポートを閲覧可能）
5. If 権限のないユーザーが採点画面URLに直接アクセスする, the LMS shall 403エラーページを表示するか、ダッシュボードにリダイレクトする
6. While 受講期間が終了している（graduation_dateを過ぎている）状態, the LMS shall 受講生のスキルレポート閲覧を許可する（ダッシュボードの一部として閲覧可能）
7. The LMS shall 採点操作に関する全てのデータ変更をSupabase RLSで保護する

> **確定:** 採点権限は Super Admin のみ（TBD-1確定済み）。

---

### Requirement 13: ステータス遷移の整合性

**Objective:** システムとして、採点プロセスにおけるステータス遷移の一貫性を保証したい。不正な状態遷移を防止し、データの整合性を維持するため。

#### Acceptance Criteria

1. The LMS shall `submitted` -> `grading` -> `graded` のステータス遷移のみを許可する
2. If `graded` のsubmissionに対してステータス変更を試みる, the LMS shall 変更を受け付けない（確定後の巻き戻し不可）
3. The LMS shall ステータス遷移をサーバーサイドのAPI層で検証し、不正な遷移リクエストに対してHTTP 422エラーを返す
4. When submissionが `graded` に遷移する, the LMS shall 排他制御の解除（次の案件着手可能）を同一トランザクションで処理する

---

## TBD決定事項

以下のTBDは全て決定済みである。

---

### TBD-1: 採点者ロール — **A案: Super Admin のみ（PRD準拠）**

採点操作は Super Admin ロールのみに限定する。Managerは採点不可、スキルレポートの閲覧のみ可能。

---

### TBD-2: レーダーチャートの軸定義 — **A案: `category_large` をレーダー軸にする**

evaluation_itemsの `category_large` を自動導出してレーダーチャートの軸とする。案件ごとにレーダーチャートを表示する。

---

### TBD-3: 合否判定 — **合否ステータスは持たない。正答率のみ**

`graded` / `rejected` の区別は行わない。採点完了時のステータスは一律 `graded` とし、正答率（スコア%）のみを記録する。合否判定ロジックは不要。これに伴い Requirement 4 の合否関連要件を簡略化する。

> ステータス遷移: `submitted` → `grading` → `graded`（一律）

---

### TBD-4: 採点の一時保存（Draft） — **A案: 一時保存可能**

採点作業の中断・再開を可能とする。一時保存データは `project_submissions.result_data` にdraftフラグ付きで保存する。

---

### TBD-5: フィードバックコメントの保存先 — **A案: 専用カラム**

`project_submissions` テーブルに `feedback_comment TEXT` カラムを追加し、フィードバックコメントを保存する。

---

### 型定義の不整合に関する注記

現在の `EvaluationItem` 型（`lib/types/database.ts`）:
```typescript
interface EvaluationItem {
  id: string
  category: string
  criteria: string
  weight: number
}
```

PRDで定義されたevaluation_items構造:
```json
[
  {
    "category_large": "Backend",
    "category_medium": "Laravel",
    "items": [{ "id": "uuid-1", "label": "Migration", "point": 5 }]
  }
]
```

この乖離は設計フェーズで解消する必要がある。PRDの階層構造を採用する場合、`EvaluationItem` 型を `EvaluationCategory`（大項目/中項目/小項目の階層型）に更新し、既存のmock-projects specおよび同期処理への影響を評価する必要がある。
