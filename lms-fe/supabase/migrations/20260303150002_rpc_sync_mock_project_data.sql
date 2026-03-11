-- sync_mock_project_data RPC 関数の作成
-- Task 1.4: 模擬案件データの UPSERT + archive 処理
-- Requirements: 9.1, 9.3, 9.4, 9.7, 9.8
--
-- 前提:
-- - Task 1.1 (20260303150000_mock_projects_schema.sql) が実行済みであること
--
-- 処理フロー:
-- 1. version_id の存在チェック
-- 2. p_mock_projects 配列をループし slug をキーとして UPSERT
-- 3. 同期元に存在しない案件の status を 'archived' に設定（論理削除）
-- 4. 追加・更新・削除の件数サマリを返却

CREATE OR REPLACE FUNCTION public.sync_mock_project_data(
  p_version_id UUID,
  p_mock_projects JSONB
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
  v_project RECORD;
  v_existing_id UUID;
BEGIN
  -- =========================================
  -- 1. version_id の存在チェック
  -- =========================================
  IF NOT EXISTS (SELECT 1 FROM content_versions WHERE id = p_version_id) THEN
    RAISE EXCEPTION 'version_id % が content_versions に存在しません', p_version_id;
  END IF;

  -- =========================================
  -- 2. 空配列の場合は全案件をアーカイブ
  -- =========================================
  IF p_mock_projects IS NULL OR jsonb_array_length(p_mock_projects) = 0 THEN
    UPDATE mock_projects
    SET status = 'archived', updated_at = NOW()
    WHERE version_id = p_version_id AND status = 'active';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
      'mock_project_changes_summary', jsonb_build_object(
        'added', 0,
        'updated', 0,
        'deleted', v_deleted
      )
    );
  END IF;

  -- =========================================
  -- 3. 案件データを UPSERT
  -- =========================================
  v_upserted_ids := ARRAY[]::UUID[];

  FOR v_project IN
    SELECT *
    FROM jsonb_to_recordset(p_mock_projects) AS x(
      slug TEXT,
      title TEXT,
      description TEXT,
      requirements TEXT,
      evaluation_items JSONB,
      genre TEXT,
      "order" INTEGER,
      status TEXT
    )
  LOOP
    -- 既存レコードの存在チェック（slug をキーとする）
    SELECT id INTO v_existing_id
    FROM mock_projects
    WHERE slug = v_project.slug;

    IF v_existing_id IS NOT NULL THEN
      -- 既存レコードを更新
      UPDATE mock_projects
      SET title = v_project.title,
          description = v_project.description,
          requirements = v_project.requirements,
          evaluation_items = COALESCE(v_project.evaluation_items, '[]'::JSONB),
          genre = v_project.genre,
          "order" = COALESCE(v_project."order", 0),
          status = COALESCE(v_project.status, 'active'),
          version_id = p_version_id,
          updated_at = NOW()
      WHERE id = v_existing_id;

      v_updated := v_updated + 1;
      v_upserted_ids := array_append(v_upserted_ids, v_existing_id);
    ELSE
      -- 新規レコードを挿入
      INSERT INTO mock_projects (
        slug, title, description, requirements, evaluation_items,
        genre, "order", status, version_id
      )
      VALUES (
        v_project.slug,
        v_project.title,
        v_project.description,
        v_project.requirements,
        COALESCE(v_project.evaluation_items, '[]'::JSONB),
        v_project.genre,
        COALESCE(v_project."order", 0),
        COALESCE(v_project.status, 'active'),
        p_version_id
      )
      RETURNING id INTO v_existing_id;

      v_added := v_added + 1;
      v_upserted_ids := array_append(v_upserted_ids, v_existing_id);
    END IF;
  END LOOP;

  -- =========================================
  -- 4. 同期元に存在しない案件を archived に更新
  -- =========================================
  UPDATE mock_projects
  SET status = 'archived', updated_at = NOW()
  WHERE version_id = p_version_id
    AND status = 'active'
    AND id != ALL(v_upserted_ids);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- =========================================
  -- 5. 結果 JSONB を返却
  -- =========================================
  RETURN jsonb_build_object(
    'mock_project_changes_summary', jsonb_build_object(
      'added', v_added,
      'updated', v_updated,
      'deleted', v_deleted
    )
  );
END;
$$;
