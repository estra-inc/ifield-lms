-- ============================================================
-- RLS無限再帰の修正
--
-- 問題: "Super admins can view/update all profiles" ポリシーが
-- profiles テーブル自身をサブクエリで参照し、無限再帰が発生
--
-- 修正: SECURITY DEFINER 関数でRLSをバイパスしてロールチェックを行う
-- ============================================================

-- 1. SECURITY DEFINER 関数を作成（RLSをバイパスしてロールチェック）
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$;

COMMENT ON FUNCTION public.is_super_admin() IS 'RLSポリシー用: 現在のユーザーがsuper_adminかどうかを判定（SECURITY DEFINERでRLS再帰を回避）';

-- 2. 問題のあるポリシーを削除
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;

-- 3. ヘルパー関数を使用してポリシーを再作成
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "Super admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
