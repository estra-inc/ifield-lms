-- 初回移行データの作成と制約変更
-- Task 1.2: ダミー active バージョン作成、既存 contents の version_id 設定、制約変更
-- Requirements: 1.3
--
-- 前提: Task 1.1 (20260301000000_content_versions.sql) が実行済みであること
-- - content_versions テーブルが作成済み
-- - contents テーブルに version_id カラム（NULL 許可）が追加済み

-- ===========================================
-- 1. ダミー active バージョンレコードの INSERT
-- ===========================================
-- gen_random_uuid() による UUID 自動生成（id カラムのデフォルト値）を利用
INSERT INTO public.content_versions (commit_hash, status, synced_at)
VALUES ('initial', 'active', NOW());

-- ===========================================
-- 2. 既存 contents の全レコードに version_id を UPDATE
-- ===========================================
UPDATE public.contents
SET version_id = (
  SELECT id FROM public.content_versions
  WHERE commit_hash = 'initial' AND status = 'active'
  LIMIT 1
)
WHERE version_id IS NULL;

-- ===========================================
-- 3. version_id カラムを NOT NULL 制約に変更
-- ===========================================
ALTER TABLE public.contents ALTER COLUMN version_id SET NOT NULL;

-- ===========================================
-- 4. slug_path UNIQUE 制約の変更
-- ===========================================
-- 既存の slug_path UNIQUE 制約を DROP
ALTER TABLE public.contents DROP CONSTRAINT contents_slug_path_key;

-- (slug_path, version_id) の複合ユニーク制約を作成
ALTER TABLE public.contents
  ADD CONSTRAINT contents_slug_path_version_id_key UNIQUE (slug_path, version_id);

-- ===========================================
-- 5. version_id のインデックスを作成
-- ===========================================
CREATE INDEX idx_contents_version_id ON public.contents (version_id);
