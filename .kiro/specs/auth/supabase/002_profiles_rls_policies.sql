-- ============================================================
-- 002: profiles テーブルの RLS ポリシー
-- 目的: 行レベルセキュリティによるアクセス制御
-- 依存: 001_create_profiles_table.sql
-- ============================================================

-- RLS 有効化
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 自分のプロフィールを読み取り可能
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 自分のプロフィールを更新可能
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service Role（Server Actions 等）によるアクセスは RLS をバイパスする
-- そのため INSERT ポリシーは不要（トリガーが SECURITY DEFINER で実行）
