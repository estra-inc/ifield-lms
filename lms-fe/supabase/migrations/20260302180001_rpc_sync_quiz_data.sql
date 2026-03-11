-- RPC 関数 sync_quiz_data の作成
-- クイズデータを quizzes テーブルに UPSERT し、削除されたクイズを archived にする。
-- Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7

CREATE OR REPLACE FUNCTION public.sync_quiz_data(
  p_version_id UUID,
  p_quizzes JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_added INTEGER := 0;
  v_updated INTEGER := 0;
  v_deleted INTEGER := 0;
  v_upserted_ids UUID[];
  v_quiz RECORD;
  v_existing_id UUID;
BEGIN
  -- p_version_id の存在チェック
  IF NOT EXISTS (SELECT 1 FROM content_versions WHERE id = p_version_id) THEN
    RAISE EXCEPTION 'version_id % が content_versions に存在しません', p_version_id;
  END IF;

  -- 空配列の場合は全クイズをアーカイブ
  IF p_quizzes IS NULL OR jsonb_array_length(p_quizzes) = 0 THEN
    UPDATE quizzes
    SET status = 'archived', updated_at = NOW()
    WHERE version_id = p_version_id AND status = 'active';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
      'quiz_changes_summary', jsonb_build_object(
        'added', 0,
        'updated', 0,
        'deleted', v_deleted
      )
    );
  END IF;

  -- クイズデータを UPSERT
  v_upserted_ids := ARRAY[]::UUID[];

  FOR v_quiz IN
    SELECT *
    FROM jsonb_to_recordset(p_quizzes) AS x(
      file_path TEXT,
      section TEXT,
      title TEXT,
      genre TEXT,
      tutorial TEXT,
      chapter TEXT,
      questions JSONB
    )
  LOOP
    -- 既存レコードの存在チェック
    SELECT id INTO v_existing_id
    FROM quizzes
    WHERE genre = v_quiz.genre
      AND tutorial = v_quiz.tutorial
      AND chapter = v_quiz.chapter
      AND section = v_quiz.section
      AND version_id = p_version_id;

    IF v_existing_id IS NOT NULL THEN
      -- 既存レコードを更新
      UPDATE quizzes
      SET title = v_quiz.title,
          questions = v_quiz.questions,
          status = 'active',
          updated_at = NOW()
      WHERE id = v_existing_id;

      v_updated := v_updated + 1;
      v_upserted_ids := array_append(v_upserted_ids, v_existing_id);
    ELSE
      -- 新規レコードを挿入
      INSERT INTO quizzes (genre, tutorial, chapter, section, title, questions, status, version_id)
      VALUES (v_quiz.genre, v_quiz.tutorial, v_quiz.chapter, v_quiz.section, v_quiz.title, v_quiz.questions, 'active', p_version_id)
      ON CONFLICT (genre, tutorial, chapter, section, version_id) DO UPDATE SET
        title = EXCLUDED.title,
        questions = EXCLUDED.questions,
        status = 'active',
        updated_at = NOW()
      RETURNING id INTO v_existing_id;

      v_added := v_added + 1;
      v_upserted_ids := array_append(v_upserted_ids, v_existing_id);
    END IF;
  END LOOP;

  -- 送信されなかったクイズの status を archived に更新
  UPDATE quizzes
  SET status = 'archived', updated_at = NOW()
  WHERE version_id = p_version_id
    AND status = 'active'
    AND id != ALL(v_upserted_ids);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'quiz_changes_summary', jsonb_build_object(
      'added', v_added,
      'updated', v_updated,
      'deleted', v_deleted
    )
  );
END;
$$;
