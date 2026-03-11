-- RLS ポリシーの更新
-- Task 1.3: content_versions テーブルの RLS 有効化と contents テーブルの RLS ポリシー更新
-- Requirements: 9.1, 9.2, 9.3, 7.1, 7.2
--
-- 前提:
-- - Task 1.1 (20260301000000_content_versions.sql) が実行済みであること
-- - Task 1.2 (20260301000001_content_versions_migration_data.sql) が実行済みであること
-- - contents テーブルに version_id カラムが NOT NULL で存在すること
-- - content_versions テーブルに active ステータスのレコードが存在すること

-- ===========================================
-- 1. content_versions テーブルの RLS 有効化
-- ===========================================
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 2. content_versions テーブルの RLS ポリシー
-- ===========================================

-- Super Admin のみが content_versions を SELECT 可能
CREATE POLICY "super_admin_select_content_versions" ON public.content_versions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Super Admin が content_versions に対して全操作（INSERT/UPDATE/DELETE）可能
CREATE POLICY "super_admin_manage_content_versions" ON public.content_versions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ===========================================
-- 3. contents テーブルの既存 User 向け RLS ポリシー削除
-- ===========================================
-- 既存の status ベースのポリシーを削除し、version_id ベースに移行する
DROP POLICY IF EXISTS "users_select_active_contents" ON public.contents;

-- ===========================================
-- 4. contents テーブルの新しい version_id ベース RLS ポリシー
-- ===========================================
-- User ロールは active バージョンに紐づくコンテンツのみ参照可能
-- Manager ロールにはポリシーを作成しない（デフォルト拒否 = コンテンツ流出防止）
CREATE POLICY "users_select_active_version_contents" ON public.contents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'user'
    )
    AND version_id = (
      SELECT id FROM public.content_versions WHERE status = 'active' LIMIT 1
    )
  );
