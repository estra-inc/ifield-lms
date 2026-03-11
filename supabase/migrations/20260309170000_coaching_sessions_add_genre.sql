-- coaching_sessions に genre カラム追加
-- 既存セッションは engineering をデフォルトとする
ALTER TABLE coaching_sessions
  ADD COLUMN genre TEXT NOT NULL DEFAULT 'engineering'
  CHECK (genre IN ('engineering', 'design'));
