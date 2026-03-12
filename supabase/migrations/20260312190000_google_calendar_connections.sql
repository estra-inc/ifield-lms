-- 個別管理者ごとの Google Calendar トークン管理テーブル
-- system_integrations の共有トークンから、各 super_admin が個別に連携する方式へ移行

CREATE TABLE public.google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  encrypted_refresh_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admin_id)
);

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- 自分の行のみ SELECT/UPDATE/DELETE 可能
CREATE POLICY "admin_own_google_connection" ON public.google_calendar_connections
  FOR ALL USING (admin_id = auth.uid());

-- Super Admin が他の admin の接続状態を確認（空き枠集約に必要）
CREATE POLICY "super_admin_read_all_google_connections" ON public.google_calendar_connections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
