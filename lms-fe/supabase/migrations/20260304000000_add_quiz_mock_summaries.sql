-- content_versions テーブルにクイズ・模擬案件の変更サマリー列を追加
ALTER TABLE content_versions
  ADD COLUMN IF NOT EXISTS quiz_changes_summary JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mock_project_changes_summary JSONB DEFAULT NULL;
