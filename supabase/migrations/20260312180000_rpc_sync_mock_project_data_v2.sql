-- 模擬案件テーブルの UNIQUE 制約変更 + sync RPC 修正
--
-- 問題:
-- 1. UNIQUE(slug) 制約のため、同じ slug で異なる genre（engineering / design）の
--    模擬案件が共存できない（例: bookshelf が engineering と design に存在）
-- 2. sync_mock_project_data RPC が slug のみでマッチするため、後から処理された
--    genre で上書きされ、片方の genre の案件が消失する
-- 3. RPC が値の変更有無を比較せず、既存レコードを常に updated としてカウントする
--    ため、差分ビューに常に模擬案件の差分が表示される
--
-- 修正:
-- 1. UNIQUE(slug) → UNIQUE(slug, genre) に変更
-- 2. sync_mock_project_data RPC を (slug, genre) でマッチ + 値比較に更新
-- 3. 変更された項目の詳細（slug, genre, change_type）を items 配列として返却

-- ===========================================
-- 1. UNIQUE 制約の変更
-- ===========================================
ALTER TABLE public.mock_projects DROP CONSTRAINT mock_projects_slug_key;
ALTER TABLE public.mock_projects ADD CONSTRAINT mock_projects_slug_genre_key UNIQUE (slug, genre);

-- ===========================================
-- 2. sync_mock_project_data RPC の差し替え
-- ===========================================
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
  v_existing RECORD;
  v_new_id UUID;
  v_is_changed BOOLEAN;
  v_changed_items JSONB := '[]'::JSONB;
  v_deleted_items JSONB;
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
    -- 削除対象の詳細を記録
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'slug', slug, 'genre', genre, 'change_type', 'deleted'
    )), '[]'::JSONB)
    INTO v_deleted_items
    FROM mock_projects
    WHERE version_id = p_version_id AND status = 'active';

    UPDATE mock_projects
    SET status = 'archived', updated_at = NOW()
    WHERE version_id = p_version_id AND status = 'active';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
      'mock_project_changes_summary', jsonb_build_object(
        'added', 0,
        'updated', 0,
        'deleted', v_deleted,
        'items', v_deleted_items
      )
    );
  END IF;

  -- =========================================
  -- 3. 案件データを UPSERT（slug + genre でマッチ、値比較付き）
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
    -- 既存レコードの取得（slug + genre をキーとする）
    SELECT id, title, description, requirements, evaluation_items,
           genre, "order", status
    INTO v_existing
    FROM mock_projects
    WHERE slug = v_project.slug AND genre = v_project.genre;

    IF v_existing.id IS NOT NULL THEN
      -- 実際のフィールド値を比較
      v_is_changed :=
        v_existing.title IS DISTINCT FROM v_project.title
        OR v_existing.description IS DISTINCT FROM v_project.description
        OR v_existing.requirements IS DISTINCT FROM v_project.requirements
        OR v_existing.evaluation_items IS DISTINCT FROM COALESCE(v_project.evaluation_items, '[]'::JSONB)
        OR v_existing."order" IS DISTINCT FROM COALESCE(v_project."order", 0)
        OR v_existing.status IS DISTINCT FROM COALESCE(v_project.status, 'active');

      -- 常に version_id は更新（新バージョンへの紐付け）
      UPDATE mock_projects
      SET title = v_project.title,
          description = v_project.description,
          requirements = v_project.requirements,
          evaluation_items = COALESCE(v_project.evaluation_items, '[]'::JSONB),
          "order" = COALESCE(v_project."order", 0),
          status = COALESCE(v_project.status, 'active'),
          version_id = p_version_id,
          updated_at = NOW()
      WHERE id = v_existing.id;

      IF v_is_changed THEN
        v_updated := v_updated + 1;
        v_changed_items := v_changed_items || jsonb_build_array(
          jsonb_build_object('slug', v_project.slug, 'genre', v_project.genre, 'change_type', 'updated')
        );
      END IF;

      v_upserted_ids := array_append(v_upserted_ids, v_existing.id);
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
      RETURNING id INTO v_new_id;

      v_added := v_added + 1;
      v_changed_items := v_changed_items || jsonb_build_array(
        jsonb_build_object('slug', v_project.slug, 'genre', v_project.genre, 'change_type', 'added')
      );
      v_upserted_ids := array_append(v_upserted_ids, v_new_id);
    END IF;
  END LOOP;

  -- =========================================
  -- 4. 同期元に存在しない案件を archived に更新
  -- =========================================
  -- 削除対象の詳細を記録
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'slug', slug, 'genre', genre, 'change_type', 'deleted'
  )), '[]'::JSONB)
  INTO v_deleted_items
  FROM mock_projects
  WHERE version_id = p_version_id
    AND status = 'active'
    AND id != ALL(v_upserted_ids);

  UPDATE mock_projects
  SET status = 'archived', updated_at = NOW()
  WHERE version_id = p_version_id
    AND status = 'active'
    AND id != ALL(v_upserted_ids);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- 削除項目をマージ
  IF v_deleted > 0 THEN
    v_changed_items := v_changed_items || v_deleted_items;
  END IF;

  -- =========================================
  -- 5. 結果 JSONB を返却
  -- =========================================
  RETURN jsonb_build_object(
    'mock_project_changes_summary', jsonb_build_object(
      'added', v_added,
      'updated', v_updated,
      'deleted', v_deleted,
      'items', v_changed_items
    )
  );
END;
$$;
