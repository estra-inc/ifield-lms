-- コーチマッチングシステム: coach_assignments テーブル、coaching_sessions.coach_id 追加

-- coach_assignments テーブル
CREATE TABLE public.coach_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  genre TEXT NOT NULL CHECK (genre IN ('engineering', 'design')),
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, genre)
);

-- coaching_sessions に coach_id 追加（既存レコードは NULL）
ALTER TABLE public.coaching_sessions
  ADD COLUMN coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- インデックス
CREATE INDEX idx_coach_assignments_user_genre ON public.coach_assignments(user_id, genre);
CREATE INDEX idx_coach_assignments_coach_id ON public.coach_assignments(coach_id);
CREATE INDEX idx_coaching_sessions_coach_id ON public.coaching_sessions(coach_id);

-- 同一コーチの同一時間枠の重複予約を DB レベルで防止
CREATE UNIQUE INDEX idx_coaching_sessions_no_double_book
  ON public.coaching_sessions (coach_id, session_date, start_time)
  WHERE status = 'scheduled';

-- RLS
ALTER TABLE public.coach_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_coach_assignments" ON public.coach_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "user_select_own_coach_assignments" ON public.coach_assignments
  FOR SELECT USING (user_id = auth.uid());
