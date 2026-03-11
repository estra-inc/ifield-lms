-- ============================================================
-- 日報・学習目標機能: スキーマ作成マイグレーション
--
-- 1. daily_reports テーブル作成
-- 2. monthly_goals テーブル作成
-- 3. weekly_goals テーブル作成
-- 4. 各テーブルのインデックス作成
-- 5. 各テーブルの RLS 有効化
-- 6. RLS ポリシー作成
-- ============================================================

-- ============================================================
-- 1. daily_reports テーブル
-- ============================================================
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  actual_hours NUMERIC(5,2) NOT NULL CHECK (actual_hours > 0),
  content TEXT NOT NULL CHECK (content <> ''),
  liked_by_manager BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS パフォーマンス用インデックス
CREATE INDEX idx_daily_reports_user_id ON daily_reports(user_id);
-- 日付降順表示用インデックス
CREATE INDEX idx_daily_reports_user_date ON daily_reports(user_id, report_date DESC);

-- RLS 有効化
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. monthly_goals テーブル
-- ============================================================
CREATE TABLE monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  target_hours NUMERIC(5,2) NOT NULL CHECK (target_hours > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, year_month)
);

CREATE INDEX idx_monthly_goals_user_id ON monthly_goals(user_id);

ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. weekly_goals テーブル
-- ============================================================
CREATE TABLE weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_hours NUMERIC(5,2) NOT NULL CHECK (target_hours > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, start_date),
  CHECK (end_date > start_date)
);

CREATE INDEX idx_weekly_goals_user_id ON weekly_goals(user_id);

ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS ポリシー: daily_reports
-- ============================================================

-- User: 自身のレコードのみ SELECT 可能
CREATE POLICY "users_select_own_reports" ON daily_reports
  FOR SELECT USING ((select auth.uid()) = user_id);

-- User: 自身のレコードのみ INSERT 可能
CREATE POLICY "users_insert_own_reports" ON daily_reports
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Manager / Super Admin: 全レコードを SELECT 可能
CREATE POLICY "managers_select_all_reports" ON daily_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('manager', 'super_admin')
    )
  );

-- Manager: liked_by_manager の UPDATE 可能
-- (カラムレベル制御は Server Action 側で担保)
CREATE POLICY "managers_update_like" ON daily_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'manager'
    )
  );

-- ============================================================
-- 5. RLS ポリシー: monthly_goals
-- ============================================================

-- User: 自身のレコードのみ SELECT 可能
CREATE POLICY "users_select_own_monthly_goals" ON monthly_goals
  FOR SELECT USING ((select auth.uid()) = user_id);

-- User: 自身のレコードのみ INSERT 可能
CREATE POLICY "users_insert_own_monthly_goals" ON monthly_goals
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- User: 自身のレコードのみ UPDATE 可能
CREATE POLICY "users_update_own_monthly_goals" ON monthly_goals
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Manager / Super Admin: 全レコードを SELECT 可能
CREATE POLICY "admins_select_all_monthly_goals" ON monthly_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('manager', 'super_admin')
    )
  );

-- ============================================================
-- 6. RLS ポリシー: weekly_goals
-- ============================================================

-- User: 自身のレコードのみ SELECT 可能
CREATE POLICY "users_select_own_weekly_goals" ON weekly_goals
  FOR SELECT USING ((select auth.uid()) = user_id);

-- User: 自身のレコードのみ INSERT 可能
CREATE POLICY "users_insert_own_weekly_goals" ON weekly_goals
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- User: 自身のレコードのみ UPDATE 可能
CREATE POLICY "users_update_own_weekly_goals" ON weekly_goals
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Manager / Super Admin: 全レコードを SELECT 可能
CREATE POLICY "admins_select_all_weekly_goals" ON weekly_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('manager', 'super_admin')
    )
  );
