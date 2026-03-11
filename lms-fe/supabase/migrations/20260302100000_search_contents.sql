-- search_contents: pg_trgm によるあいまい検索マイグレーション
--
-- Task 1: pg_trgm 拡張有効化・GIN インデックス作成・search_contents RPC 関数作成
-- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.2, 3.3, 3.4, 4.3, 6.2, 6.3, 7.2, 7.4, 8.1, 8.2, 8.3

-- ===========================================
-- 1. pg_trgm 拡張の有効化 (Req 1.1)
-- ===========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ===========================================
-- 2. GIN インデックスの作成 (Req 1.2, 1.3, 8.1)
-- ===========================================
CREATE INDEX idx_contents_title_trgm ON public.contents
  USING GIN (title gin_trgm_ops);

CREATE INDEX idx_contents_body_trgm ON public.contents
  USING GIN (body gin_trgm_ops);

-- ===========================================
-- 3. search_contents RPC 関数の作成
-- ===========================================
CREATE OR REPLACE FUNCTION public.search_contents(
  search_query TEXT,
  result_limit INTEGER DEFAULT 5,
  score_threshold REAL DEFAULT 0.1
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  snippet TEXT,
  genre TEXT,
  tutorial TEXT,
  chapter TEXT,
  section TEXT,
  genre_title TEXT,
  tutorial_title TEXT,
  chapter_title TEXT,
  score REAL
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  active_version_id UUID;
BEGIN
  -- active バージョンの ID を取得 (Req 7.2)
  SELECT cv.id INTO active_version_id
  FROM content_versions cv
  WHERE cv.status = 'active'
  LIMIT 1;

  -- active バージョンが存在しない場合は空の結果セットを返却
  IF active_version_id IS NULL THEN
    RETURN;
  END IF;

  -- 閾値以上のスコアを持つ結果を返却 + 最低1件保証 (Req 8.3)
  RETURN QUERY
  SELECT * FROM (
    -- メインクエリ: 閾値以上のスコアを持つ結果
    (
      SELECT
        c.id,
        c.title,
        LEFT(c.body, 100) AS snippet,
        c.genre,
        c.tutorial,
        c.chapter,
        c.section,
        (
          SELECT g.title FROM contents g
          WHERE g.genre = c.genre
            AND g.content_type = 'genre'
            AND g.version_id = active_version_id
          LIMIT 1
        ) AS genre_title,
        (
          SELECT t.title FROM contents t
          WHERE t.tutorial = c.tutorial
            AND t.content_type = 'tutorial'
            AND t.version_id = active_version_id
          LIMIT 1
        ) AS tutorial_title,
        (
          SELECT ch.title FROM contents ch
          WHERE ch.tutorial = c.tutorial
            AND ch.chapter = c.chapter
            AND ch.content_type = 'chapter'
            AND ch.version_id = active_version_id
          LIMIT 1
        ) AS chapter_title,
        (similarity(c.title, search_query) * 3 + similarity(c.body, search_query) * 1)::REAL AS score
      FROM contents c
      WHERE c.content_type = 'section'
        AND c.version_id = active_version_id
        AND (similarity(c.title, search_query) * 3 + similarity(c.body, search_query) * 1) >= score_threshold
      ORDER BY score DESC
      LIMIT result_limit
    )

    UNION ALL

    -- フォールバック: 閾値以上の結果が0件の場合、最もスコアの高い1件を返却
    (
      SELECT
        c.id,
        c.title,
        LEFT(c.body, 100) AS snippet,
        c.genre,
        c.tutorial,
        c.chapter,
        c.section,
        (
          SELECT g.title FROM contents g
          WHERE g.genre = c.genre
            AND g.content_type = 'genre'
            AND g.version_id = active_version_id
          LIMIT 1
        ) AS genre_title,
        (
          SELECT t.title FROM contents t
          WHERE t.tutorial = c.tutorial
            AND t.content_type = 'tutorial'
            AND t.version_id = active_version_id
          LIMIT 1
        ) AS tutorial_title,
        (
          SELECT ch.title FROM contents ch
          WHERE ch.tutorial = c.tutorial
            AND ch.chapter = c.chapter
            AND ch.content_type = 'chapter'
            AND ch.version_id = active_version_id
          LIMIT 1
        ) AS chapter_title,
        (similarity(c.title, search_query) * 3 + similarity(c.body, search_query) * 1)::REAL AS score
      FROM contents c
      WHERE c.content_type = 'section'
        AND c.version_id = active_version_id
        AND NOT EXISTS (
          SELECT 1 FROM contents c2
          WHERE c2.content_type = 'section'
            AND c2.version_id = active_version_id
            AND (similarity(c2.title, search_query) * 3 + similarity(c2.body, search_query) * 1) >= score_threshold
        )
      ORDER BY score DESC
      LIMIT 1
    )
  ) AS combined
  ORDER BY score DESC
  LIMIT result_limit;
END;
$$;
