-- Migration: finalize_grading RPC 関数
-- Description: 採点確定を単一トランザクションで実行する PostgreSQL 関数
-- Requirements: 4.1, 4.3, 4.5, 13.1, 13.2, 13.4
--
-- トランザクション内で以下を実行:
-- 1. submission のステータス検証（grading のみ許可）
-- 2. project_evaluations の status を finalized に更新
-- 3. project_submissions の status, score, result_data, feedback_comment を更新
-- 4. 排他制御の解除（次案件着手可能に）

CREATE OR REPLACE FUNCTION finalize_grading(
  p_submission_id UUID,
  p_score INTEGER,
  p_result_data JSONB,
  p_feedback_comment TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submission RECORD;
  v_evaluation RECORD;
  v_assignment_id UUID;
  v_user_id UUID;
BEGIN
  -- 1. submission の存在確認とステータス検証
  SELECT ps.id, ps.status, ps.assignment_id
  INTO v_submission
  FROM project_submissions ps
  WHERE ps.id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBMISSION_NOT_FOUND: submission_id=% が存在しません', p_submission_id;
  END IF;

  IF v_submission.status != 'grading' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: 現在のステータス=% からの確定はできません。grading のみ許可されています', v_submission.status;
  END IF;

  v_assignment_id := v_submission.assignment_id;

  -- 2. evaluation の存在確認と finalized への更新
  SELECT pe.id, pe.status
  INTO v_evaluation
  FROM project_evaluations pe
  WHERE pe.submission_id = p_submission_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_evaluation.status = 'finalized' THEN
      RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: 評価は既に確定済みです';
    END IF;

    UPDATE project_evaluations
    SET
      status = 'finalized',
      score = p_score,
      feedback_comment = p_feedback_comment,
      updated_at = NOW()
    WHERE id = v_evaluation.id;
  END IF;

  -- 3. project_submissions のステータス・スコア・結果データ・フィードバックコメントを更新
  UPDATE project_submissions
  SET
    status = 'graded',
    score = p_score,
    result_data = p_result_data,
    feedback_comment = p_feedback_comment,
    updated_at = NOW()
  WHERE id = p_submission_id;

  -- 4. 排他制御の解除
  -- assignment に紐づく user_id を取得
  SELECT pa.user_id
  INTO v_user_id
  FROM project_assignments pa
  WHERE pa.id = v_assignment_id;

  -- Note: 排他制御の解除は、mock-projects spec の既存ロジックと整合する。
  -- project_submissions が graded になることで、同一 assignment の新規提出が可能になる。
  -- 追加の明示的なアンロック処理は不要（ステータス変更自体が排他制御の解除に相当）。

  RETURN jsonb_build_object(
    'success', true,
    'score', p_score,
    'submission_id', p_submission_id
  );
END;
$$;

COMMENT ON FUNCTION finalize_grading IS '採点確定 RPC: submission を graded に更新し、評価を finalized にする単一トランザクション';
