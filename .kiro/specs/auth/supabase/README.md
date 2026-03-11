# Auth 機能 — Supabase SQL マイグレーション

## 実行順序

Supabase Dashboard の **SQL Editor** で、以下の順番で実行してください。

| # | ファイル | 内容 |
|---|---------|------|
| 1 | `001_create_profiles_table.sql` | profiles テーブルの作成 |
| 2 | `002_profiles_rls_policies.sql` | profiles の RLS ポリシー設定 |
| 3 | `003_profiles_auto_create_trigger.sql` | auth.users → profiles 自動作成トリガー |
| 4 | `004_storage_avatars_bucket.sql` | avatars Storage バケット + ポリシー |
| 5 | `005_updated_at_trigger.sql` | profiles.updated_at 自動更新トリガー |

## Dashboard での手動設定

SQLでは設定できない項目:

### Authentication → URL Configuration
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/auth/callback`

### Authentication → Email Templates
- 招待メール・パスワードリセットメールのリンクを `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite` 形式に変更

### Authentication → Settings → Password
- **Minimum password length**: `8`

## 注意事項

- 各ファイルは冪等（再実行可能）に設計されています
- `IF NOT EXISTS` / `CREATE OR REPLACE` / `ON CONFLICT DO NOTHING` を使用
- 本番環境ではSupabase CLIのマイグレーション機能の利用を推奨します
