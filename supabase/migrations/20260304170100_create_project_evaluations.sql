-- Migration: 採点データ保存用テーブルの作成
-- Description: project_evaluations（採点マスタ）と project_evaluation_details（採点項目詳細）
-- Design Decision: B案（新規テーブル分離）-- category_large での GROUP BY 集計が容易
-- Requirements: 3.3, 6.4

-- ============================================================
-- project_evaluations テーブル
-- 1 submission に対して 1 evaluation（UNIQUE 制約）
-- ============================================================
CREATE TABLE project_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES project_submissions(id) ON DELETE CASCADE,
  grader_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  score INTEGER,
  feedback_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE project_evaluations IS '模擬案件の採点データ。1 submission につき 1 evaluation のみ';
COMMENT ON COLUMN project_evaluations.status IS 'draft: 下書き, finalized: 確定済み。一方向遷移のみ（draft -> finalized）';
COMMENT ON COLUMN project_evaluations.score IS '確定時のスコア（0-100, 整数）';

-- インデックス
CREATE INDEX idx_project_evaluations_grader_id ON project_evaluations(grader_id);
CREATE INDEX idx_project_evaluations_status ON project_evaluations(status);

-- ============================================================
-- project_evaluation_details テーブル
-- 各評価項目の OK/NG 結果を正規化して保存
-- ============================================================
CREATE TABLE project_evaluation_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES project_evaluations(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  category_large TEXT NOT NULL,
  category_medium TEXT NOT NULL,
  item_label TEXT NOT NULL,
  point INTEGER NOT NULL,
  is_ok BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE project_evaluation_details IS '採点の項目別詳細。evaluation_id + item_id でユニーク';
COMMENT ON COLUMN project_evaluation_details.is_ok IS 'true=OK, false=NG';
COMMENT ON COLUMN project_evaluation_details.category_large IS 'レーダーチャートの軸に使用する大項目名';

-- evaluation_id + item_id でユニーク制約（同一評価内で同一項目は1回のみ）
CREATE UNIQUE INDEX idx_evaluation_details_eval_item
  ON project_evaluation_details(evaluation_id, item_id);

-- レーダーチャートの軸集計用インデックス
CREATE INDEX idx_evaluation_details_category_large
  ON project_evaluation_details(category_large);

-- evaluation_id での検索用
CREATE INDEX idx_evaluation_details_evaluation_id
  ON project_evaluation_details(evaluation_id);
