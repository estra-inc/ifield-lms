# iField LMS

社内研修学習管理システム（LMS） - エンジニアリングおよびデザイン領域のスキル習得を目的とした社内学習プラットフォーム。

## 概要

学習者のトラッキングと評価（採点・コーチング等）に専念し、教材・演習問題・模擬案件のコンテンツ管理は GitHub（Docs as Code）に完全移行したアーキテクチャを採用しています。

## 主要機能

- **認証・招待制アカウント管理** - Super Admin が招待 URL を発行し、トークン検証による登録フロー
- **教材閲覧・学習トラッキング** - Markdown ベースの教材、進捗管理、演習問題
- **模擬案件と採点** - 階層別チェックリスト評価、スキルレポート（レーダーチャート）
- **日報・学習目標** - 月次/週次目標管理、1 日複数回入力対応
- **コーチング予約** - Google Calendar 連携、クレジット制、稼働時間枠管理
- **Docs as Code 同期** - GitHub Actions から LMS の同期 API へ自動連携

## ロール

| ロール | 説明 |
| --- | --- |
| **User（受講生）** | 教材閲覧、日報入力、演習実施、模擬案件提出、コーチング予約 |
| **Manager（管理者）** | 進捗閲覧、日報リアクション。コンテンツ閲覧権限なし |
| **Super Admin（スーパー管理者）** | ユーザー管理、招待、採点、期間延長、システム設定 |

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router) + React 19
- **言語**: TypeScript (strict mode)
- **BaaS**: Supabase (Auth / PostgreSQL / Storage / RLS)
- **UI**: shadcn/ui + Tailwind CSS v4
- **CI/CD**: GitHub Actions
- **デプロイ**: Vercel

## リポジトリ構成

```
├── lms-fe/          # Next.js フロントエンド
├── supabase/        # Supabase マイグレーション
├── scripts/         # ユーティリティスクリプト
├── designs/         # デザインファイル (.pen)
├── docs/            # ドキュメント
└── .github/         # GitHub Actions ワークフロー
```

## セットアップ

```bash
# 依存関係のインストール
cd lms-fe && npm install

# 環境変数の設定
cp .env.local.example .env.local
# .env.local を編集して各種キーを設定

# 開発サーバー起動
npm run dev
```

## 環境変数

| 変数名 | 説明 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |
| `SYNC_API_KEY` | コンテンツ同期 API キー |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `GOOGLE_REDIRECT_URI` | Google OAuth リダイレクト URI |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Google トークン暗号化キー |

## ER 図

```mermaid
erDiagram
    profiles {
        uuid id PK
        text full_name
        text last_name
        text first_name
        text email
        text avatar_url
        text role
        text current_term
        date graduation_date
        text default_genre
    }

    content_versions {
        uuid id PK
        text commit_hash
        text commit_message
        text status
        jsonb changes_summary
        uuid approved_by FK
    }

    contents {
        uuid id PK
        text slug_path UK
        text title
        text body
        text genre
        text tutorial
        text chapter
        text section
        text content_type
        int order
        text status
        uuid version_id FK
    }

    content_progress {
        uuid id PK
        uuid user_id FK
        uuid content_id FK
        timestamptz completed_at
    }

    quizzes {
        uuid id PK
        text genre
        text tutorial
        text chapter
        text section
        text slug
        text title
        jsonb questions
        text status
        uuid version_id FK
    }

    quiz_logs {
        uuid id PK
        uuid user_id FK
        uuid quiz_id FK
        int score
        int total_questions
        jsonb answers
    }

    mock_projects {
        uuid id PK
        text slug UK
        text title
        text description
        text requirements
        jsonb evaluation_items
        text genre
        int order
        text status
        uuid version_id FK
    }

    project_assignments {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        text status
        date due_date
    }

    project_submissions {
        uuid id PK
        uuid assignment_id FK
        text submission_url
        jsonb submission_files
        text status
        int score
        text feedback_comment
    }

    project_tasks {
        uuid id PK
        uuid assignment_id FK
        text title
        text status
        int order
        uuid created_by FK
    }

    project_evaluations {
        uuid id PK
        uuid submission_id FK
        uuid grader_id FK
        text status
        int score
        text feedback_comment
    }

    project_evaluation_details {
        uuid id PK
        uuid evaluation_id FK
        text item_id
        text category_large
        text category_medium
        text item_label
        int point
        boolean is_ok
    }

    daily_reports {
        uuid id PK
        uuid user_id FK
        date report_date
        numeric actual_hours
        text content
        boolean liked_by_manager
    }

    monthly_goals {
        uuid id PK
        uuid user_id FK
        text year_month
        numeric target_hours
    }

    weekly_goals {
        uuid id PK
        uuid user_id FK
        date start_date
        date end_date
        numeric target_hours
    }

    coaching_sessions {
        uuid id PK
        uuid user_id FK
        uuid coach_id FK
        date session_date
        time start_time
        time end_time
        text genre
        text status
        text google_event_id
        text google_meet_url
    }

    coaching_credits {
        uuid id PK
        uuid user_id FK
        int amount
        text reason
        uuid reference_id FK
        uuid granted_by FK
    }

    coach_assignments {
        uuid id PK
        uuid user_id FK
        uuid coach_id FK
        text genre
    }

    system_integrations {
        uuid id PK
        text service_name UK
        text encrypted_refresh_token
        jsonb business_hours
    }

    profiles ||--o{ content_progress : "tracks"
    profiles ||--o{ daily_reports : "writes"
    profiles ||--o{ monthly_goals : "sets"
    profiles ||--o{ weekly_goals : "sets"
    profiles ||--o{ project_assignments : "starts"
    profiles ||--o{ quiz_logs : "attempts"
    profiles ||--o{ coaching_sessions : "books"
    profiles ||--o{ coaching_credits : "has"
    profiles ||--o{ coach_assignments : "assigned"

    content_versions ||--o{ contents : "contains"
    content_versions ||--o{ quizzes : "contains"
    content_versions ||--o{ mock_projects : "contains"
    profiles ||--o{ content_versions : "approves"

    contents ||--o{ content_progress : "completed"
    quizzes ||--o{ quiz_logs : "logged"

    mock_projects ||--o{ project_assignments : "assigned"
    project_assignments ||--o{ project_submissions : "submits"
    project_assignments ||--o{ project_tasks : "has"
    project_submissions ||--o| project_evaluations : "evaluated"
    project_evaluations ||--o{ project_evaluation_details : "details"

    coaching_sessions ||--o{ coaching_credits : "referenced"
```

## 関連リポジトリ

- [ifield-curriculums](https://github.com/estra-inc/ifield-curriculums) - 教材・演習問題・模擬案件コンテンツ

## ライセンス

本リポジトリはソースコードを公開していますが、オープンソースではありません。無断での複製・改変・再配布・利用を禁じます（All rights reserved）。
