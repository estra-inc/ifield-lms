-- contents テーブルと content_progress テーブルの作成
-- 教材コンテンツの管理と学習進捗の記録に使用する。

-- ===========================================
-- 1. contents テーブル
-- ===========================================
CREATE TABLE public.contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug_path TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  genre TEXT NOT NULL,
  tutorial TEXT NOT NULL,
  chapter TEXT,
  section TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('genre', 'tutorial', 'chapter', 'section')),
  "order" INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- contents テーブルのインデックス
CREATE INDEX idx_contents_type_status_order ON public.contents (content_type, status, "order");
CREATE INDEX idx_contents_genre_type_status_order ON public.contents (genre, content_type, status, "order");
CREATE INDEX idx_contents_tutorial_type_order ON public.contents (tutorial, content_type, "order");
CREATE INDEX idx_contents_tutorial_chapter_type_order ON public.contents (tutorial, chapter, content_type, "order");

-- ===========================================
-- 2. content_progress テーブル
-- ===========================================
CREATE TABLE public.content_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES contents (id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, content_id)
);

-- content_progress テーブルのインデックス
CREATE INDEX idx_content_progress_user_id ON public.content_progress (user_id);

-- ===========================================
-- 3. profiles テーブルへのカラム追加
-- ===========================================
-- graduation_date: 受講期間の終了日。NULL は制限なし。
-- 過去のマイグレーションで DROP されたため再追加する。
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS graduation_date DATE;

-- default_genre: デフォルトジャンル設定。NULL は 'engineering' として扱う。
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_genre TEXT;

-- ===========================================
-- 4. RLS ポリシー
-- ===========================================

-- contents テーブルの RLS 有効化
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;

-- User ロールと Super Admin ロール: active コンテンツのみ SELECT 可
CREATE POLICY "users_select_active_contents" ON contents
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('user', 'super_admin')
    )
  );

-- Super Admin: 全ステータスのコンテンツを SELECT 可
CREATE POLICY "super_admin_select_all_contents" ON contents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Manager ロールにはポリシーを作成しない（デフォルト拒否 = コンテンツ流出防止）

-- content_progress テーブルの RLS 有効化
ALTER TABLE public.content_progress ENABLE ROW LEVEL SECURITY;

-- User: 自身のレコードのみ SELECT
CREATE POLICY "users_select_own_progress" ON content_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User: 自身のレコードのみ INSERT
CREATE POLICY "users_insert_own_progress" ON content_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
