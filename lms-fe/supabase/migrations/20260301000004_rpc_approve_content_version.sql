-- Task 1.5: RPC 関数 approve_content_version の作成
-- Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 4.2
--
-- 前提:
-- - Task 1.1 (20260301000000_content_versions.sql) が実行済みであること
-- - Task 1.2 (20260301000001_content_versions_migration_data.sql) が実行済みであること
-- - Task 1.3 (20260301000002_content_versions_rls.sql) が実行済みであること
-- - Task 1.4 (20260301000003_rpc_sync_content_version.sql) が実行済みであること
--
-- draft → active 昇格、旧 active の archived 化、旧コンテンツ行削除をアトミックに実行する。
-- SECURITY DEFINER で定義し、Server Action 経由で呼び出す。
-- SELECT ... FOR UPDATE でロックを取得し、同時承認リクエストの競合を防止する。

-- ===========================================
-- approve_content_version RPC 関数
-- ===========================================
-- シグネチャ: approve_content_version(p_version_id UUID, p_approved_by UUID) RETURNS VOID
--
-- 処理フロー:
-- 1. パラメータのバリデーション（NULL チェック）
-- 2. SELECT ... FOR UPDATE で対象バージョンをロック
-- 3. 対象バージョンの status が 'draft' であることを検証
-- 4. 既存 active バージョンの検索
-- 5. 旧 active バージョンが存在する場合:
--    a. 旧 active を archived に UPDATE
--    b. archived に紐づく contents 行を DELETE
-- 6. 対象 draft を active に UPDATE し、approved_by, approved_at を記録

CREATE OR REPLACE FUNCTION public.approve_content_version(
  p_version_id UUID,
  p_approved_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_status TEXT;
  v_active_version_id UUID;
BEGIN
  -- =========================================
  -- 1. パラメータのバリデーション
  -- =========================================
  IF p_version_id IS NULL THEN
    RAISE EXCEPTION 'p_version_id は必須です。NULL は許可されません。';
  END IF;

  IF p_approved_by IS NULL THEN
    RAISE EXCEPTION 'p_approved_by は必須です。NULL は許可されません。';
  END IF;

  -- =========================================
  -- 2. 対象バージョンを SELECT ... FOR UPDATE でロック
  -- =========================================
  SELECT status INTO v_target_status
  FROM content_versions
  WHERE id = p_version_id
  FOR UPDATE;

  -- レコードが存在しない場合
  IF NOT FOUND THEN
    RAISE EXCEPTION 'バージョン ID % が見つかりません。', p_version_id;
  END IF;

  -- =========================================
  -- 3. draft ステータスの検証
  -- =========================================
  IF v_target_status <> 'draft' THEN
    RAISE EXCEPTION 'バージョン % は draft ステータスではありません（現在: %）。', p_version_id, v_target_status;
  END IF;

  -- =========================================
  -- 4. 既存の active バージョンを検索
  -- =========================================
  SELECT id INTO v_active_version_id
  FROM content_versions
  WHERE status = 'active';

  -- =========================================
  -- 5. 旧 active バージョンが存在する場合の処理
  -- =========================================
  IF v_active_version_id IS NOT NULL THEN
    -- 5a. 旧 active バージョンを archived に変更 (REQ-5.2)
    UPDATE content_versions
    SET status = 'archived',
        updated_at = NOW()
    WHERE id = v_active_version_id;

    -- 5b. archived バージョンに紐づく contents 行を削除 (REQ-5.3, REQ-4.2)
    DELETE FROM contents
    WHERE version_id = v_active_version_id;
  END IF;

  -- =========================================
  -- 6. 対象 draft バージョンを active に昇格 (REQ-5.1, REQ-5.4)
  -- =========================================
  UPDATE content_versions
  SET status = 'active',
      approved_by = p_approved_by,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_version_id;
END;
$$;
