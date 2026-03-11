-- coaching_credits: 付与/消費の監査ログ（残高 = SUM(amount)）
CREATE TABLE public.coaching_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('admin_grant', 'booking_consumed', 'cancellation_refund')),
  reference_id UUID,
  granted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- coaching_sessions: 予約レコード
CREATE TABLE public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled_by_student', 'cancelled_by_admin', 'no_show')),
  google_event_id TEXT,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- coaching_credits の reference_id FK（循環参照回避のため後付け）
ALTER TABLE public.coaching_credits
  ADD CONSTRAINT coaching_credits_reference_id_fkey
  FOREIGN KEY (reference_id) REFERENCES public.coaching_sessions(id) ON DELETE SET NULL;

-- インデックス
CREATE INDEX idx_coaching_credits_user_id ON public.coaching_credits(user_id);
CREATE INDEX idx_coaching_sessions_user_id ON public.coaching_sessions(user_id);
CREATE INDEX idx_coaching_sessions_date_status ON public.coaching_sessions(session_date, status);

-- RLS 有効化
ALTER TABLE public.coaching_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

-- coaching_credits RLS
CREATE POLICY "super_admin_all_coaching_credits" ON public.coaching_credits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "user_select_own_coaching_credits" ON public.coaching_credits
  FOR SELECT
  USING (user_id = auth.uid());

-- coaching_sessions RLS
CREATE POLICY "super_admin_all_coaching_sessions" ON public.coaching_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "user_select_own_coaching_sessions" ON public.coaching_sessions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_insert_own_coaching_sessions" ON public.coaching_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_update_own_coaching_sessions" ON public.coaching_sessions
  FOR UPDATE
  USING (user_id = auth.uid());
