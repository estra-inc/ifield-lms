-- Manager ロールに quizzes テーブルと mock_projects テーブルの読み取りアクセスを付与する。
-- Manager は教材・演習問題・模擬案件のコンテンツを閲覧専用でアクセスする必要がある。

-- ===========================================
-- 1. quizzes テーブル: Manager ロールを追加
-- ===========================================
DROP POLICY IF EXISTS "users_select_active_quizzes" ON quizzes;

CREATE POLICY "users_select_active_quizzes" ON quizzes
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

-- ===========================================
-- 2. mock_projects テーブル: Manager ブロックポリシーを削除
-- ===========================================
DROP POLICY IF EXISTS "Managers cannot access mock_projects" ON mock_projects;
