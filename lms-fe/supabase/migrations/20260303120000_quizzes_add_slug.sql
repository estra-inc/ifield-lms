-- quizzes テーブルに slug カラムを追加し、セクションごとに複数クイズを許可する。
-- 既存のユニーク制約 (genre, tutorial, chapter, section, version_id) を
-- (genre, tutorial, chapter, section, slug, version_id) に変更する。

-- 1. slug カラムの追加（デフォルト値 'default' で既存行を埋める）
ALTER TABLE public.quizzes
  ADD COLUMN slug TEXT NOT NULL DEFAULT 'default';

-- 2. 既存のユニーク制約を削除
ALTER TABLE public.quizzes
  DROP CONSTRAINT quizzes_genre_tutorial_chapter_section_version_id_key;

-- 3. slug を含む新しいユニーク制約を追加
ALTER TABLE public.quizzes
  ADD CONSTRAINT quizzes_genre_tutorial_chapter_section_slug_version_id_key
  UNIQUE (genre, tutorial, chapter, section, slug, version_id);

-- 4. slug のデフォルト値を解除（今後は明示的に指定が必要）
ALTER TABLE public.quizzes
  ALTER COLUMN slug DROP DEFAULT;
