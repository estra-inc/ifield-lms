-- Manager ロールに contents テーブルの読み取りアクセスを付与する。
-- Manager は教材・演習問題・模擬案件のコンテンツを閲覧専用でアクセスする必要がある。

-- 既存ポリシーを更新: Manager ロールを追加
DROP POLICY IF EXISTS "users_select_active_contents" ON contents;

CREATE POLICY "users_select_active_contents" ON contents
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('user', 'super_admin', 'manager')
    )
  );
