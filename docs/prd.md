# 社内研修学習管理システム (LMS) 要件定義書・基本設計書

**Version:** 3.0.0 (Docs-as-Code Integration Final)
**Date:** 2026/02/24
**Tech Stack:** Next.js (App Router), Supabase (Auth/DB/Storage), shadcn/ui, GitHub Actions

---

## 1. プロジェクト概要

エンジニアリングおよびデザイン領域のスキル習得を目的とした社内学習プラットフォーム。
ユーザーの学習フェーズ（基礎/実践）を管理し、定量的な学習時間と定性的なアウトプット（模擬案件）の両面からスキルを評価する。

本バージョンより、**教材・演習問題・模擬案件の要件管理をGitHub（Docs as Code）へ完全移行**し、LMS側は学習者のトラッキングおよび評価（採点・コーチング等）に専念するアーキテクチャを採用する。

---

## 2. システムアーキテクチャ概要

システムは「学習トラッキング基盤（LMS本体）」と「コンテンツ管理基盤（GitHub）」に分離される。

* **コンテンツ管理 (GitHub):** 教材(Markdown)、演習問題(JSON/YAML)、模擬案件の評価基準(JSON)を管理。GitHub Actionsにより、main/stagingマージ時にLMSのAPIへ自動同期（UPSERT）を行う。画像も自動抽出されSupabase Storageへアップロード・リンク置換される。
* **LMS本体 (Next.js + Supabase):** 同期されたコンテンツをユーザーへ配信。学習履歴、日報、コーチング予約、採点ロジックを提供する。

---

## 3. アクターと権限 (RBAC)

各ロールがシステム内で実行可能なアクションの一覧。

* **User:** 受講生
* **Manager:** 管理者（コーチ・メンター / **進捗管理・応援専用**）
* **Super Admin:** スーパー管理者（運営 / ユーザー管理・採点・全権限）

| カテゴリ | 機能・アクション | User | Manager | Super Admin | 備考 |
| --- | --- | --- | --- | --- | --- |
| **認証・設定** | ログイン / ログアウト | ◯ | ◯ | ◯ |  |
|  | 初回登録 (パスワード/氏名/画像) | ◯ | ◯ | - | 招待URL経由 |
|  | プロフィール画像設定 | ◯ | ◯ | - |  |
|  | ユーザー招待 (URL発行) | × | × | ◯ | Managerも招待対象 |
|  | アカウント削除 (論理/物理) | × | × | ◯ |  |
|  | 受講期間設定・延長 (個別/一括) | × | × | ◯ | 延長ログ記録必須 |
| **学習管理** | ダッシュボード閲覧 | ◯ | ◯ | ◯ | Userは自身のデータのみ |
|  | 学習目標設定 (週次/月次) | ◯ | × | - |  |
|  | 日報・学習時間入力 | ◯ | × | - | 1日複数回可、過去日可 |
|  | 日報への「いいね」リアクション | × | ◯ | × | **Manager専用機能** |
|  | ユーザー進捗・成績・日報閲覧 | × | ◯ | ◯ |  |
| **コンテンツ** | 教材閲覧 (テキスト/動画) | ◯ | × | ◯ | 期間終了後はUser閲覧不可 |
|  | 演習問題 (Quiz) 実施 | ◯ | × | ◯ | 何度でも実施可 |
|  | **LMS画面での教材・演習の作成** | × | × | **×** | **GitHubにて管理** |
|  | 同期APIの実行・Webhook受入 | × | × | System | GitHub Actions経由 |
| **模擬案件** | 案件一覧閲覧 | ◯ | × | ◯ |  |
|  | 案件への着手 (Start) | ◯ | × | - | 詳細情報の開示トリガー |
|  | GitHub URL提出 | ◯ | × | - | 排他制御あり |
|  | 採点 (階層別チェックリスト) | × | × | ◯ |  |
|  | スキルレポート閲覧 (ジャンル別%) | ◯ | ◯ | ◯ | 採点完了後に開示 |
| **コーチング** | Googleカレンダー連携設定 | × | × | ◯ | システム全体の設定 |
|  | 稼働時間枠の設定 | × | × | ◯ |  |
|  | クレジット付与 (+N回) | × | × | ◯ |  |
|  | 予約実行 | ◯ | × | - |  |
|  | 予約キャンセル (前日まで) | ◯ | × | - |  |
|  | 面談実施完了処理 (ログ入力) | × | × | ◯ |  |

---

## 4. 機能要件およびユーザーフロー

### 4.1. 認証・アカウント管理

**[共通] 初回登録 (招待制)**
スーパー管理者から発行された招待URL（トークン付き）にアクセスし、以下のステップでアカウントを有効化する。

1. **招待URLアクセス:** システムがトークンの有効性を検証。
2. **氏名入力:** フルネームを入力。
3. **パスワード設定:** ログイン用のパスワードを設定。
4. **プロフィール画像設定:** 任意の画像をアップロード（スキップ時はデフォルトアイコン）。
5. **登録完了:** 自動的にログインし、ダッシュボードへ遷移。

**[Super Admin] ユーザー管理**
ユーザーの招待、論理削除/物理削除。受講期間の延長（個別/一括・ログ機能付き）。

### 4.2. 学習サイクル・ターム管理

**[User] ターム自動移行**

1. **基礎学習ターム:** 初期状態。教材閲覧と演習が中心。
2. **実践学習ターム:** ユーザーが任意の模擬案件の「着手する」ボタンを押下した瞬間に自動移行。

**[System] 受講期間とハードストップ**
設定された `卒業日 (Graduation Date)` を過ぎた場合の挙動。

* **有効期間内:** 全機能利用可能。
* **期間終了後 (Expired):** ダッシュボードのみ閲覧可能。教材、日報、予約などの機能はロック（利用不可）。
* **救済措置:** スーパー管理者が期間延長を行うと即座にロック解除。

### 4.3. Docs as Code (コンテンツ管理の自動化)

**[System] ディレクトリ構造とマッピング**
GitHubリポジトリ（`curriculums/` 等）の構造をLMSのURLスラッグにマッピングする。

```text
curriculums/
└── {ジャンル}/                  ← 例: engineer
    └── {チュートリアル}/          ← 例: react-basics
        └── {チャプター}/          ← 例: 01-getting-started
            └── {セクション}.md    ← 例: 01-introduction.md

```

**[System] GitHub Actions 同期フロー**

1. **画像置換:** Markdown内のローカル画像リンクを検出し、Supabase Storageへアップロード。URLを公開リンクに置換してコミット。
2. **コンテンツ同期:** `main` または `staging` ブランチへのPush時、Markdown（Frontmatter含む）および演習・模擬案件のJSONを収集・整形。
3. **API送信:** LMS側の同期エンドポイント (`POST /api/admin/sync-curriculums`) へ送信。
4. **UPSERT処理:** LMS側でトランザクションを開始し、既存コンテンツの更新、新規作成、および不要ファイル（リポジトリから削除されたもの）の論理削除（`status = 'archived'`）を実行。

### 4.4. 模擬案件 (Mock Projects)

**[User] 案件一覧・詳細 (Lock/Unlock)**

* **一覧:** タイトルのみ表示。
* **詳細 (Lock):** 要件は非表示。「着手する」ボタンのみアクティブ。
* **詳細 (Unlock):** ボタン押下後、要件全文が開示され、GitHub URL提出フォームが出現。

**[User] 成果物提出**
GitHubリポジトリのURLを提出。

* **制約 (排他制御):** ステータスが `採点中` の案件がある場合、新規提出不可。

**[Super Admin] 採点 (階層別評価)**
100項目程度のチェックリスト（大項目 > 中項目 > 小項目）を用いた評価。

* **フロー:** 提出物を確認 -> 項目ごとにOK/NGを判定 -> 確定。

**[All] スキルレポート閲覧**
採点結果に基づき、ジャンルごとの達成率（%）を自動計算し可視化する。

* **表示:** レーダーチャートおよびアコーディオン形式の詳細リスト（どの項目がクリアできたか）。

### 4.5. 日報・学習目標

**[User] 学習目標設定・日報入力**

* 「今月の目標時間」「今週の目標時間」を設定。
* 学習時間と内容を入力。1日複数回可。過去日入力可（日次で `SUM` 集計）。

**[Manager] 日報リアクション**
ユーザーの日報に対し「いいね」ボタンを押下（モチベーション管理）。

### 4.6. コーチング予約

**[Super Admin] 連携設定**

* Google Calendar APIとのOAuth連携。
* LMS稼働時間（予約受付枠）の設定。

**[User] 予約実行・キャンセル**

* ジャンル（エンジニア/デザイナー）を選択。
* **ロジック:** `表示枠` = `LMS稼働設定` - `Googleカレンダー予定(Busy)`
* 予約時にクレジットを1消費。前日まではキャンセル可（返還）。

**[Super Admin] 完了処理**
面談実施後、管理画面で「完了」ステータスに変更し、ログを記録（次回予約のロック解除）。

---

## 5. サイトマップ (UI画面遷移)

```text
■ User Routes (受講生)
[Login / Invite Setup]
 └── [User Dashboard] (期限/進捗バー/通知)
      ├── [日報入力モーダル]
      ├── [コーチング予約] -> [ジャンル選択] -> [カレンダー] -> [完了]
      ├── [成績・履歴エリア (トグル)] (過去日報 / 評価シートリンク)
      ├── [教材一覧] -> [詳細] -> [演習問題 (Quiz)]
      └── [模擬案件一覧]
           └── [案件詳細]
                ├── (Lock状態: タイトルのみ) -> [着手ボタン]
                └── (Unlock状態: 要件開示) -> [提出フォーム]
                     └── [提出ログ] -> [スキルレポート(閲覧)]

■ Manager Routes (マネージャー)
[Login / Invite Setup]
 └── [Manager Dashboard]
      ├── [サマリー] (要注意ユーザー数 / 未確認日報)
      ├── [最新日報フィード] -> [いいね]
      └── [ユーザー一覧]
           └── [ユーザー詳細]
                ├── 基本情報 / 卒業日 / 日報履歴
                ├── [模擬案件ログ] -> [スキルレポート (閲覧のみ)]
                └── [コーチング履歴]

■ Super Admin Routes (スーパー管理者)
[Login]
 └── [Admin Dashboard] (未採点アラート / 期限切れアラート)
      ├── [未採点一覧] -> [採点画面] (階層別チェックリスト) -> [確定]
      ├── [ユーザー管理一覧]
      │    ├── [一括操作 (期間延長)]
      │    └── [ユーザー詳細] -> [期間延長(個別)] / [クレジット付与] / [面談完了処理]
      └── [設定]
           ├── [Google Calendar連携]
           └── [稼働時間枠設定]
      ※コンテンツ作成画面は存在しない（GitHubで管理するため）

```

---

## 6. テーブル定義書 (Database Schema)

Supabase (PostgreSQL) 向け主要テーブル・カラム定義。

### 6.1. Core System & Users

| テーブル名 | カラム構成 (主要部) | 説明 |
| --- | --- | --- |
| **`profiles`** | `id`, `full_name`, `avatar_url`, `role`, `current_term`, `graduation_date`, `contract_months` | ユーザー基本情報 |
| **`daily_reports`** | `id`, `user_id`, `actual_hours`, `content`, `liked_by_manager` | 日報データ |
| **`monthly_goals`** | `user_id`, `year_month`, `target_hours` | 月次目標 |
| **`weekly_goals`** | `user_id`, `start_date`, `end_date`, `target_hours` | 週次目標 |

### 6.2. Content Sync (Docs as Code)

| テーブル名 | カラム構成 (主要部) | 説明 |
| --- | --- | --- |
| **`contents`** | `id`, `slug_path`, `title`, `body` (text), `genre`, `tutorial`, `chapter`, `section`, `order`, `status` | GitHubから同期される教材 |
| **`quizzes`** | `id`, `chapter_slug`, `questions` (jsonb), `status` | 演習問題マスタ |
| **`quiz_logs`** | `id`, `user_id`, `quiz_id`, `score`, `passed` | 演習実施履歴 |

### 6.3. Mock Projects & Evaluation

| テーブル名 | カラム構成 (主要部) | 説明 |
| --- | --- | --- |
| **`mock_projects`** | `id`, `slug`, `title`, `requirements`, **`evaluation_items` (jsonb)**, `status` | 案件マスタ (GitHub同期) |
| **`project_assignments`** | `id`, `user_id`, `project_id`, `status` | 着手状況管理 |
| **`project_submissions`** | `id`, `assignment_id`, `github_url`, `status`, `score`, **`result_data` (jsonb)** | 提出ログ・採点結果 |

**`evaluation_items` JSON Schema (案件マスタ側):**

```json
[
  {
    "category_large": "Backend",
    "category_medium": "Laravel",
    "items": [{ "id": "uuid-1", "label": "Migration", "point": 5 }]
  }
]

```

**`result_data` JSON Schema (採点結果側):**

```json
{
  "uuid-1": true,
  "uuid-2": false
}

```

### 6.4. Coaching & Admin Logs

| テーブル名 | カラム構成 (主要部) | 説明 |
| --- | --- | --- |
| **`coaching_credits`** | `user_id`, `remaining_amount` | チケット残数 |
| **`coaching_sessions`** | `user_id`, `genre`, `scheduled_at`, `meet_url`, `status`, `google_event_id` | 予約データ |
| **`extension_logs`** | `target_user_id`, `extended_days`, `reason`, `executed_by` | 期間延長履歴 |
| **`system_integrations`** | `service_name`, `refresh_token`, `business_hours` (jsonb) | Google API設定等 |

---

## 7. 非機能要件・実装制約

1. **アクセス制御 (Hard Stop Middleware):**
* Next.js Middlewareにて、リクエスト毎に対象ユーザーの `graduation_date` を検証。
* 期限切れユーザーの `/dashboard` および設定関連以外のパスへのアクセスは、強制的に `/dashboard` へリダイレクトさせる。


2. **排他制御:**
* 模擬案件提出APIにおいて、該当ユーザーの `status = 'grading'` な提出ログが存在する場合、HTTP 403 / 409 エラーを返却しデータの不整合を防ぐ。


3. **同期APIのセキュリティ (Webhook Guard):**
* `/api/admin/sync-curriculums` エンドポイントは、強力な固定APIキー (Secret) を要求する。一致しないリクエストは即座に 401 Unauthorized として破棄する。


4. **権限分離 (RLS):**
* Supabase Row Level Security (RLS) を全テーブルに適用。
* `Manager` ロールは `contents`, `mock_projects`, `quizzes` テーブルに対する `SELECT` 権限を明示的に剥奪し、コンテンツ流出をシステムレベルで防ぐ。


5. **機密情報保護:**
* `system_integrations` の `refresh_token` 等の外部APIトークンは、Supabase Vault機能（またはアプリケーションレイヤーでの暗号化）を用いて保存する。