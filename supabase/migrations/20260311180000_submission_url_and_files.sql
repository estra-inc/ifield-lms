-- 成果物提出: github_url → submission_url にリネーム + NOT NULL 解除
-- 複数ファイル提出用に submission_files JSONB カラムを追加

ALTER TABLE public.project_submissions
  RENAME COLUMN github_url TO submission_url;

ALTER TABLE public.project_submissions
  ALTER COLUMN submission_url DROP NOT NULL;

-- 複数ファイル提出用 JSONB カラム: [{ "name": "file.fig", "url": "https://..." }]
ALTER TABLE public.project_submissions
  ADD COLUMN submission_files JSONB DEFAULT '[]'::jsonb;
