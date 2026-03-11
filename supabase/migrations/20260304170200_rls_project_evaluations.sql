-- Migration: project_evaluations / project_evaluation_details の RLS ポリシー
-- Description: 受講生・Manager・Super Admin のアクセス制御
-- Requirements: 12.1, 12.2, 12.3, 12.4, 12.7
--
-- 採点操作（INSERT/UPDATE/DELETE）は全て service_role 経由の Admin Client で
-- RLS をバイパスするため、書き込みポリシーは不要。
-- ここでは閲覧（SELECT）制御のみを設定する。

-- ============================================================
-- project_evaluations: RLS 有効化 + SELECT ポリシー
-- ============================================================
ALTER TABLE project_evaluations ENABLE ROW LEVEL SECURITY;

-- 受講生: 自身の submission に紐づく finalized 評価のみ参照可能
CREATE POLICY "Users can view own finalized evaluations"
  ON project_evaluations FOR SELECT
  TO authenticated
  USING (
    status = 'finalized'
    AND EXISTS (
      SELECT 1 FROM project_submissions ps
      JOIN project_assignments pa ON pa.id = ps.assignment_id
      WHERE ps.id = project_evaluations.submission_id
      AND pa.user_id = auth.uid()
    )
  );

-- Manager: 全ユーザーの finalized 評価を参照可能（スコア集約閲覧用）
CREATE POLICY "Managers can view finalized evaluations"
  ON project_evaluations FOR SELECT
  TO authenticated
  USING (
    status = 'finalized'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

-- ============================================================
-- project_evaluation_details: RLS 有効化 + SELECT ポリシー
-- ============================================================
ALTER TABLE project_evaluation_details ENABLE ROW LEVEL SECURITY;

-- 受講生: 自身の evaluation に紐づく details を参照可能
CREATE POLICY "Users can view own evaluation details"
  ON project_evaluation_details FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_evaluations pe
      JOIN project_submissions ps ON ps.id = pe.submission_id
      JOIN project_assignments pa ON pa.id = ps.assignment_id
      WHERE pe.id = project_evaluation_details.evaluation_id
      AND pe.status = 'finalized'
      AND pa.user_id = auth.uid()
    )
  );

-- Manager: evaluation_details へのアクセスは不可
-- (Manager は evaluation の score のみ閲覧可能。項目レベルの詳細は Super Admin のみ)
-- ポリシーなし = RLS によりアクセス不可
