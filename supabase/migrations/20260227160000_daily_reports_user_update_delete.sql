-- ユーザー自身の日報に対する UPDATE / DELETE RLS ポリシー
-- 既存の INSERT / SELECT ポリシーに加え、所有者本人のみ更新・削除を許可する。

-- UPDATE: 自分の日報のみ更新可能
CREATE POLICY users_update_own_reports ON daily_reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: 自分の日報のみ削除可能
CREATE POLICY users_delete_own_reports ON daily_reports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
