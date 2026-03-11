-- Migration: project_submissions テーブルに feedback_comment カラムを追加
-- Description: 採点者が受講生に対するフィードバックコメントを保存するための TEXT カラム
-- Requirements: 5.3 (フィードバックコメントの保存)
-- NULL 許容: 既存データへの影響なし

ALTER TABLE project_submissions
  ADD COLUMN IF NOT EXISTS feedback_comment TEXT;

COMMENT ON COLUMN project_submissions.feedback_comment IS '採点者からのフィードバックコメント（最大2000文字、任意入力）';
