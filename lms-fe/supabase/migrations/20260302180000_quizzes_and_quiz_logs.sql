-- quizzes テーブルと quiz_logs テーブルの作成
-- 演習問題（Quiz）機能のデータベーススキーマ。
-- Requirements: 2.1, 2.2, 2.3, 2.4

-- ===========================================
-- 1. quizzes テーブル
-- ===========================================
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre TEXT NOT NULL,
  tutorial TEXT NOT NULL,
  chapter TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  version_id UUID NOT NULL REFERENCES content_versions (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (genre, tutorial, chapter, section, version_id)
);

-- quizzes テーブルのインデックス
CREATE INDEX idx_quizzes_version_status ON public.quizzes (version_id, status);

-- ===========================================
-- 2. quiz_logs テーブル
-- ===========================================
CREATE TABLE public.quiz_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id),
  quiz_id UUID NOT NULL REFERENCES quizzes (id),
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (score >= 0 AND score <= total_questions)
);

-- quiz_logs テーブルのインデックス
CREATE INDEX idx_quiz_logs_user_quiz ON public.quiz_logs (user_id, quiz_id, created_at DESC);
CREATE INDEX idx_quiz_logs_quiz_id ON public.quiz_logs (quiz_id);

-- ===========================================
-- 3. RLS ポリシー
-- ===========================================
-- Requirements: 2.5, 2.6, 6.1, 6.2, 6.3, 6.4

-- quizzes テーブルの RLS 有効化
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- User/Super Admin: active クイズのみ SELECT 可
CREATE POLICY "users_select_active_quizzes" ON quizzes
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

-- Manager ロールにはポリシーを作成しない（デフォルト拒否 = クイズデータ流出防止）

-- quiz_logs テーブルの RLS 有効化
ALTER TABLE public.quiz_logs ENABLE ROW LEVEL SECURITY;

-- User: 自身のレコードのみ SELECT
CREATE POLICY "users_select_own_quiz_logs" ON quiz_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
    )
  );

-- User: 自身のレコードのみ INSERT
CREATE POLICY "users_insert_own_quiz_logs" ON quiz_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
    )
  );

-- Super Admin: quiz_logs の全レコード SELECT 可（将来の管理画面用）
CREATE POLICY "super_admin_select_all_quiz_logs" ON quiz_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );
