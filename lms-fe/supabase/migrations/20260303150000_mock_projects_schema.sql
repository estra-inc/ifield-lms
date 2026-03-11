-- 模擬案件（Mock Projects）関連テーブルの作成
-- Task 1.1: mock_projects, project_assignments, project_submissions, project_tasks テーブル
-- Task 1.2: RLS ポリシーの設定
-- Requirements: 1.1, 1.2, 1.3, 7.2, 8.2, 8.3, 8.5, 9.1, 9.2, 11.1, 11.3

-- ===========================================
-- 1. mock_projects テーブル
-- ===========================================
CREATE TABLE public.mock_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  evaluation_items JSONB DEFAULT '[]'::JSONB,
  genre TEXT NOT NULL CHECK (genre IN ('engineering', 'design')),
  "order" INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  version_id UUID NOT NULL REFERENCES content_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- mock_projects インデックス
CREATE INDEX idx_mock_projects_genre ON mock_projects(genre);
CREATE INDEX idx_mock_projects_status_order ON mock_projects(status, "order");
CREATE INDEX idx_mock_projects_version_id ON mock_projects(version_id);

-- ===========================================
-- 2. project_assignments テーブル
-- ===========================================
CREATE TABLE public.project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES mock_projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- project_assignments インデックス
CREATE INDEX idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX idx_project_assignments_project_id ON project_assignments(project_id);

-- ===========================================
-- 3. project_submissions テーブル
-- ===========================================
CREATE TABLE public.project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES project_assignments(id) ON DELETE CASCADE,
  github_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'grading', 'graded', 'rejected')),
  score INTEGER,
  result_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- project_submissions インデックス
CREATE INDEX idx_project_submissions_assignment_id ON project_submissions(assignment_id);
CREATE INDEX idx_project_submissions_status ON project_submissions(status);
CREATE INDEX idx_project_submissions_created_at ON project_submissions(assignment_id, created_at DESC);

-- ===========================================
-- 4. project_tasks テーブル
-- ===========================================
CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES project_assignments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'todo', 'in_progress', 'done')),
  "order" INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- project_tasks インデックス
CREATE INDEX idx_project_tasks_assignment_id ON project_tasks(assignment_id);
CREATE INDEX idx_project_tasks_status_order ON project_tasks(assignment_id, status, "order");

-- ===========================================
-- 5. RLS 有効化
-- ===========================================
ALTER TABLE mock_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 6. mock_projects RLS ポリシー
-- ===========================================

-- User/Super Admin: active 案件は全件閲覧可能。archived は着手済みの場合のみ閲覧可能
CREATE POLICY "Users can view active or started mock_projects"
  ON mock_projects FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    OR EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.project_id = mock_projects.id
      AND pa.user_id = auth.uid()
    )
  );

-- Manager ロールを明示的にブロック（RESTRICTIVE ポリシー）
-- Supabase の RLS はデフォルトで PERMISSIVE (OR 条件)。
-- RESTRICTIVE ポリシーは AND 条件で適用され、他の PERMISSIVE ポリシーと組み合わさる。
CREATE POLICY "Managers cannot access mock_projects"
  ON mock_projects AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

-- ===========================================
-- 7. project_assignments RLS ポリシー
-- ===========================================

-- User: 自身の assignment のみ SELECT 可能
CREATE POLICY "Users can view own assignments"
  ON project_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User: 自身の assignment のみ INSERT 可能
CREATE POLICY "Users can create own assignments"
  ON project_assignments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ===========================================
-- 8. project_submissions RLS ポリシー
-- ===========================================

-- User: 自身の assignment に紐づく submission のみ SELECT 可能
CREATE POLICY "Users can view own submissions"
  ON project_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.id = project_submissions.assignment_id
      AND pa.user_id = auth.uid()
    )
  );

-- User: 自身の assignment に紐づく submission のみ INSERT 可能
CREATE POLICY "Users can create own submissions"
  ON project_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.id = assignment_id
      AND pa.user_id = auth.uid()
    )
  );

-- ===========================================
-- 9. project_tasks RLS ポリシー
-- ===========================================

-- User: 自身の assignment に紐づくタスクのみ SELECT 可能
CREATE POLICY "Users can view own tasks"
  ON project_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.id = project_tasks.assignment_id
      AND pa.user_id = auth.uid()
    )
  );

-- User: 自身の assignment に紐づくタスクの作成・更新・削除が可能
CREATE POLICY "Users can manage own tasks"
  ON project_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.id = project_tasks.assignment_id
      AND pa.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_assignments pa
      WHERE pa.id = project_tasks.assignment_id
      AND pa.user_id = auth.uid()
    )
  );
