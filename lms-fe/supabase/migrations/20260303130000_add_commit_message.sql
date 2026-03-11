-- content_versions テーブルに commit_message カラムを追加
-- コミットメッセージを保存して管理画面で表示するため

ALTER TABLE public.content_versions
  ADD COLUMN commit_message TEXT;

-- sync_content_version RPC を更新して commit_message を受け取れるようにする
CREATE OR REPLACE FUNCTION public.sync_content_version(
  p_commit_hash TEXT,
  p_contents JSONB,
  p_commit_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft_id UUID;
  v_active_id UUID;
  v_is_new_draft BOOLEAN := FALSE;
  v_added_count INTEGER := 0;
  v_updated_count INTEGER := 0;
  v_deleted_count INTEGER := 0;
  v_changes_summary JSONB;
  v_changed_paths TEXT[];
  v_added_paths TEXT[];
  v_updated_paths TEXT[];
  v_deleted_paths TEXT[];
BEGIN
  -- =========================================
  -- 1. commit_hash のバリデーション
  -- =========================================
  IF p_commit_hash IS NULL OR trim(p_commit_hash) = '' THEN
    RAISE EXCEPTION 'commit_hash は必須です。NULL または空文字は許可されません。';
  END IF;

  -- =========================================
  -- 2. 既存 draft の存在確認
  -- =========================================
  SELECT id INTO v_draft_id
  FROM content_versions
  WHERE status = 'draft'
  LIMIT 1;

  IF v_draft_id IS NOT NULL THEN
    -- -----------------------------------------
    -- 2a. 既存 draft が存在する場合: 上書き
    -- -----------------------------------------
    UPDATE content_versions
    SET
      commit_hash = p_commit_hash,
      commit_message = p_commit_message,
      synced_at = NOW(),
      updated_at = NOW()
    WHERE id = v_draft_id;

    -- 紐づく既存 contents を DELETE（新しいコンテンツで置換するため）
    DELETE FROM contents WHERE version_id = v_draft_id;
  ELSE
    -- -----------------------------------------
    -- 2b. draft が存在しない場合: 新規作成
    -- -----------------------------------------
    INSERT INTO content_versions (commit_hash, commit_message, status, synced_at)
    VALUES (p_commit_hash, p_commit_message, 'draft', NOW())
    RETURNING id INTO v_draft_id;

    v_is_new_draft := TRUE;
  END IF;

  -- =========================================
  -- 3. コンテンツの一括 INSERT
  -- =========================================
  INSERT INTO contents (
    slug_path,
    title,
    body,
    genre,
    tutorial,
    chapter,
    section,
    content_type,
    "order",
    status,
    metadata,
    version_id,
    created_at,
    updated_at
  )
  SELECT
    r.slug_path,
    r.title,
    r.body,
    r.genre,
    r.tutorial,
    r.chapter,
    r.section,
    r.content_type,
    COALESCE(r."order", 0),
    'active',
    r.metadata,
    v_draft_id,
    NOW(),
    NOW()
  FROM json_populate_recordset(
    NULL::record,
    p_contents::json
  ) AS r(
    slug_path TEXT,
    title TEXT,
    body TEXT,
    genre TEXT,
    tutorial TEXT,
    chapter TEXT,
    section TEXT,
    content_type TEXT,
    "order" INTEGER,
    metadata JSONB
  );

  -- =========================================
  -- 4. active バージョンとの変更差分の計算
  -- =========================================
  SELECT id INTO v_active_id
  FROM content_versions
  WHERE status = 'active'
  LIMIT 1;

  IF v_active_id IS NOT NULL THEN
    -- added: draft にあって active にない slug_path
    SELECT ARRAY_AGG(d.slug_path)
    INTO v_added_paths
    FROM contents d
    WHERE d.version_id = v_draft_id
      AND NOT EXISTS (
        SELECT 1 FROM contents a
        WHERE a.version_id = v_active_id
          AND a.slug_path = d.slug_path
      );

    -- deleted: active にあって draft にない slug_path
    SELECT ARRAY_AGG(a.slug_path)
    INTO v_deleted_paths
    FROM contents a
    WHERE a.version_id = v_active_id
      AND NOT EXISTS (
        SELECT 1 FROM contents d
        WHERE d.version_id = v_draft_id
          AND d.slug_path = a.slug_path
      );

    -- updated: 両方に存在するが内容（body, title, order）が異なる slug_path
    SELECT ARRAY_AGG(d.slug_path)
    INTO v_updated_paths
    FROM contents d
    INNER JOIN contents a ON d.slug_path = a.slug_path
    WHERE d.version_id = v_draft_id
      AND a.version_id = v_active_id
      AND (
        d.title IS DISTINCT FROM a.title
        OR d.body IS DISTINCT FROM a.body
        OR d."order" IS DISTINCT FROM a."order"
      );
  ELSE
    -- active バージョンが存在しない場合、全コンテンツが added
    SELECT ARRAY_AGG(d.slug_path)
    INTO v_added_paths
    FROM contents d
    WHERE d.version_id = v_draft_id;
  END IF;

  -- NULL 配列をデフォルト空配列に変換
  v_added_paths := COALESCE(v_added_paths, '{}');
  v_updated_paths := COALESCE(v_updated_paths, '{}');
  v_deleted_paths := COALESCE(v_deleted_paths, '{}');

  -- 件数を集計
  v_added_count := COALESCE(array_length(v_added_paths, 1), 0);
  v_updated_count := COALESCE(array_length(v_updated_paths, 1), 0);
  v_deleted_count := COALESCE(array_length(v_deleted_paths, 1), 0);

  -- changes_summary JSONB を構築
  v_changes_summary := jsonb_build_object(
    'added', v_added_count,
    'updated', v_updated_count,
    'deleted', v_deleted_count
  );

  -- changed_paths を統合（added + updated + deleted）
  v_changed_paths := v_added_paths || v_updated_paths || v_deleted_paths;

  -- =========================================
  -- 5. draft バージョンに changes_summary と changed_paths を UPDATE
  -- =========================================
  UPDATE content_versions
  SET
    changes_summary = v_changes_summary,
    changed_paths = v_changed_paths,
    updated_at = NOW()
  WHERE id = v_draft_id;

  -- =========================================
  -- 6. 結果 JSONB を返却
  -- =========================================
  RETURN jsonb_build_object(
    'version_id', v_draft_id,
    'is_new_draft', v_is_new_draft,
    'changes_summary', v_changes_summary,
    'changed_paths', v_changed_paths
  );
END;
$$;
