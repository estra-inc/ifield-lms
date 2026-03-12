-- start_project RPC 関数の更新: 未開始（NULL）からの着手でも実践タームに移行
-- 基礎 or NULL → 実践

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
BEGIN
  -- =========================================
  -- 1. 既に同一案件に着手済みでないか確認
  -- =========================================
  IF EXISTS (
    SELECT 1 FROM project_assignments
    WHERE user_id = p_user_id AND project_id = p_project_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_STARTED: この案件は既に着手済みです';
  END IF;

  -- =========================================
  -- 2. project_assignments に INSERT
  -- =========================================
  INSERT INTO project_assignments (user_id, project_id, status)
  VALUES (p_user_id, p_project_id, 'started')
  RETURNING id INTO v_assignment_id;

  -- =========================================
  -- 3. ターム移行: NULL or 基礎 → 実践
  -- =========================================
  SELECT current_term INTO v_current_term
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_term IS NULL OR v_current_term = '基礎' THEN
    UPDATE profiles
    SET current_term = '実践', updated_at = NOW()
    WHERE id = p_user_id;

    v_term_changed := TRUE;
  END IF;

  -- =========================================
  -- 4. 結果 JSONB を返却
  -- =========================================
  RETURN jsonb_build_object(
    'assignment_id', v_assignment_id,
    'term_changed', v_term_changed
  );
END;
$$;
