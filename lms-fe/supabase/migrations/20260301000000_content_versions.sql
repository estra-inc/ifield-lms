-- content_versions テーブルの作成と contents テーブルへの version_id カラム追加
-- Task 1.1: コンテンツバージョン管理の基盤テーブル
-- Requirements: 4.1, 1.3

-- ===========================================
-- 1. content_versions テーブル
-- ===========================================
CREATE TABLE public.content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes_summary JSONB DEFAULT '{"added": 0, "updated": 0, "deleted": 0}'::jsonb,
  changed_paths TEXT[] DEFAULT '{}',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- status カラムのインデックス
CREATE INDEX idx_content_versions_status ON public.content_versions (status);

-- ===========================================
-- 2. contents テーブルへの version_id カラム追加
-- ===========================================
ALTER TABLE public.contents
  ADD COLUMN version_id UUID REFERENCES public.content_versions(id) ON DELETE CASCADE;
