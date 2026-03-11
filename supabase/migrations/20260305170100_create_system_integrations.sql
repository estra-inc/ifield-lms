-- Migration: system_integrations テーブル新規作成
-- Description: Google Calendar連携設定およびビジネスアワー設定を管理するテーブルを作成
-- Requirements: 6.2, 6.7, 7.3, 7.4

-- テーブル作成
CREATE TABLE IF NOT EXISTS public.system_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL UNIQUE,
  encrypted_refresh_token text,
  business_hours jsonb DEFAULT '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS 有効化
ALTER TABLE public.system_integrations ENABLE ROW LEVEL SECURITY;

-- Super Admin のみ SELECT 可能
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super Admin can read system_integrations'
  ) THEN
    CREATE POLICY "Super Admin can read system_integrations"
      ON public.system_integrations FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Super Admin のみ UPDATE 可能
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super Admin can update system_integrations'
  ) THEN
    CREATE POLICY "Super Admin can update system_integrations"
      ON public.system_integrations FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Super Admin のみ INSERT 可能
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Super Admin can insert system_integrations'
  ) THEN
    CREATE POLICY "Super Admin can insert system_integrations"
      ON public.system_integrations FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
        )
      );
  END IF;
END $$;

-- 初期データ: google_calendar 行をシード
INSERT INTO public.system_integrations (service_name, business_hours)
VALUES ('google_calendar', '{
  "slots": {},
  "holidayShift": false,
  "bufferMinutes": 0,
  "slotDurationMinutes": 60
}'::jsonb)
ON CONFLICT (service_name) DO NOTHING;
