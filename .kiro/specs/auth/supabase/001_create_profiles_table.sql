-- ============================================================
-- 001: profiles テーブルの作成
-- 目的: LMS ユーザーのプロフィール情報を管理するテーブル
-- 依存: auth.users テーブル (Supabase Auth 標準)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT,                                          -- 招待登録完了時に設定（NULL = 未完了）
  avatar_url       TEXT,                                          -- プロフィール画像URL (Supabase Storage)
  role             TEXT        NOT NULL DEFAULT 'user'
                               CHECK (role IN ('user', 'manager', 'super_admin')),
  current_term     TEXT,                                          -- 現在の受講ターム
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.profiles                IS 'LMS ユーザープロフィール (auth.users と 1:1)';
COMMENT ON COLUMN public.profiles.full_name      IS '氏名。NULL の場合は招待登録未完了を意味する';
COMMENT ON COLUMN public.profiles.role           IS 'ユーザーロール: user(受講生), manager(マネージャー), super_admin(スーパー管理者)';
