-- start_project RPC 関数の更新: due_date はユーザーが任意に設定するため自動設定しない

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
  -- =========================================
  FOR v_active_assignment_id IN
    SELECT pa.id
    FROM project_assignments pa
    WHERE pa.user_id = p_user_id
    FOR UPDATE
  LOOP
    SELECT ps.status INTO v_latest_submission_status
    FROM project_submissions ps
    WHERE ps.assignment_id = v_active_assignment_id
    ORDER BY ps.created_at DESC
    LIMIT 1;

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
  -- 3. project_assignments に INSERT (due_date はユーザーが後で設定)
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
