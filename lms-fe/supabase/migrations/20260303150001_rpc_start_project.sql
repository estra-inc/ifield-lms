-- start_project RPC 関数の作成
-- Task 1.3: 排他制御 + 着手記録作成 + ターム移行トランザクション
-- Requirements: 3.1, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4
--
-- 前提:
-- - Task 1.1 (20260303150000_mock_projects_schema.sql) が実行済みであること
--
-- 処理フロー:
-- 1. 同一ユーザーの着手中案件（直近 submission が graded でない assignment）の存在チェック
--    SELECT ... FOR UPDATE で race condition を防止
-- 2. 着手中案件が存在する場合は USER_HAS_ACTIVE_PROJECT 例外を raise
-- 3. project_assignments に status='started' で INSERT
-- 4. profiles.current_term が '基礎' の場合は '実践' に UPDATE
-- 5. 結果 JSONB を返却 { assignment_id, term_changed }

CREATE OR REPLACE FUNCTION public.start_project(
  p_user_id UUID,
  p_project_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id UUID;
  v_term_changed BOOLEAN := FALSE;
  v_current_term TEXT;
  v_active_assignment_id UUID;
  v_latest_submission_status TEXT;
BEGIN
  -- =========================================
  -- 1. 同一ユーザーの着手中案件の存在チェック
  --    「着手中」= assignment が存在し、直近 submission が graded でない
  -- =========================================

  -- ユーザーの全 assignment を FOR UPDATE でロック
  FOR v_active_assignment_id IN
    SELECT pa.id
    FROM project_assignments pa
    WHERE pa.user_id = p_user_id
    FOR UPDATE
  LOOP
    -- 各 assignment の直近 submission ステータスを確認
    SELECT ps.status INTO v_latest_submission_status
    FROM project_submissions ps
    WHERE ps.assignment_id = v_active_assignment_id
    ORDER BY ps.created_at DESC
    LIMIT 1;

    -- submission が存在しない（着手のみ）= 着手中
    -- submission が存在し graded でない = 着手中
    IF v_latest_submission_status IS NULL OR v_latest_submission_status != 'graded' THEN
      RAISE EXCEPTION 'USER_HAS_ACTIVE_PROJECT: ユーザーは既に着手中の案件があります (assignment_id: %)', v_active_assignment_id;
    END IF;
  END LOOP;

  -- =========================================
  -- 2. 既に同一案件に着手済みでないか確認
  -- =========================================
  IF EXISTS (
    SELECT 1 FROM project_assignments
    WHERE user_id = p_user_id AND project_id = p_project_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_STARTED: この案件は既に着手済みです';
  END IF;

  -- =========================================
  -- 3. project_assignments に INSERT
  -- =========================================
  INSERT INTO project_assignments (user_id, project_id, status)
  VALUES (p_user_id, p_project_id, 'started')
  RETURNING id INTO v_assignment_id;

  -- =========================================
  -- 4. ターム移行: 基礎 → 実践
  -- =========================================
  SELECT current_term INTO v_current_term
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_term = '基礎' THEN
    UPDATE profiles
    SET current_term = '実践', updated_at = NOW()
    WHERE id = p_user_id;

    v_term_changed := TRUE;
  END IF;

  -- =========================================
  -- 5. 結果 JSONB を返却
  -- =========================================
  RETURN jsonb_build_object(
    'assignment_id', v_assignment_id,
    'term_changed', v_term_changed
  );
END;
$$;
