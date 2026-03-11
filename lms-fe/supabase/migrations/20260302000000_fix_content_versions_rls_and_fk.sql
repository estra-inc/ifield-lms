-- content_versions テーブルの RLS ポリシー修正と approved_by FK 変更
--
-- 修正内容:
-- 1. 全認証ユーザーが active バージョンを SELECT できるポリシーを追加
--    (受講生向けコンテンツ表示の RLS サブクエリおよび getActiveVersionId() が動作するために必須)
-- 2. approved_by の FK を auth.users(id) から profiles(id) に変更
--    (PostgREST の profiles:approved_by(full_name) 結合を可能にする)

-- ===========================================
-- 1. 全認証ユーザーが active バージョンを参照可能にする
-- ===========================================
-- contents テーブルの RLS ポリシー (users_select_active_version_contents) が
-- content_versions テーブルへのサブクエリを含んでおり、
-- 一般ユーザーが content_versions を SELECT できないと
-- サブクエリが NULL を返してコンテンツが一切表示されない問題を修正する。
CREATE POLICY "authenticated_select_active_content_version" ON public.content_versions
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- ===========================================
-- 2. approved_by の FK を profiles(id) に変更
-- ===========================================
-- PostgREST の結合 profiles:approved_by(full_name) が正しく動作するために、
-- approved_by の FK 先を auth.users(id) から profiles(id) に変更する。
-- profiles.id は auth.users.id と同値であるため、データの整合性に影響なし。
ALTER TABLE public.content_versions
  DROP CONSTRAINT IF EXISTS content_versions_approved_by_fkey;

ALTER TABLE public.content_versions
  ADD CONSTRAINT content_versions_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
