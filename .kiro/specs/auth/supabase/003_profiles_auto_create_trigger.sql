-- ============================================================
-- 003: profiles 自動作成トリガー
-- 目的: auth.users に新規ユーザーが作成された際に profiles レコードを自動生成
-- 依存: 001_create_profiles_table.sql
-- 備考: inviteUserByEmail() で data: { role: 'manager' } を渡すと
--       raw_user_meta_data に格納され、トリガーが role に反映する
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存トリガーがあれば削除して再作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
