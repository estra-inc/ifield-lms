-- project_assignments に due_date カラムを追加
-- 提出予定日はユーザーが任意に設定する

ALTER TABLE public.project_assignments
  ADD COLUMN due_date TIMESTAMPTZ;

-- due_date の UPDATE を許可する RLS ポリシー
CREATE POLICY "Users can update own assignment due_date"
  ON project_assignments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
