-- ============================================================
-- ユーザー管理機能: スキーマ更新マイグレーション
--
-- 1. graduation_date, contract_months カラム削除
-- 2. email カラム追加 + auth.users からの同期トリガー
-- 3. super_admin 用 RLS ポリシー追加
-- 4. 検索用インデックス追加
-- 5. handle_new_user トリガーの拡張（email同期対応）
-- ============================================================

-- ============================================================
-- 1. 不要カラムの削除
-- ============================================================
ALTER TABLE public.profiles DROP COLUMN IF EXISTS graduation_date;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS contract_months;

-- ============================================================
-- 2. email カラムの追加と既存データの同期
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 既存の profiles レコードに auth.users の email を同期
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- NOT NULL 制約を設定
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;

COMMENT ON COLUMN public.profiles.email IS 'メールアドレス。auth.users.email と同期される';

-- ============================================================
-- 3. auth.users の email 変更を profiles に自動同期するトリガー
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_user_email_sync() IS 'auth.users の email 変更を profiles テーブルに同期するトリガー関数';

-- auth.users の UPDATE 時に email を同期
CREATE OR REPLACE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_email_sync();

-- ============================================================
-- 4. handle_new_user トリガーを拡張（email 同期を追加）
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user')
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. RLS ポリシーの追加（super_admin 用）
-- ============================================================

-- super_admin は全ユーザーレコードを参照可能
CREATE POLICY "Super admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- super_admin は全ユーザーレコードを更新可能
CREATE POLICY "Super admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- ============================================================
-- 6. 検索用インデックスの追加
-- ============================================================

-- email 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- role フィルタ用インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- full_name の部分一致検索用 pg_trgm インデックス
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
  ON public.profiles
  USING GIN (full_name gin_trgm_ops);
