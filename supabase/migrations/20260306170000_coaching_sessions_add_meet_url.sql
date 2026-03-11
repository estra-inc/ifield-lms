-- coaching_sessions に Google Meet URL カラムを追加
ALTER TABLE public.coaching_sessions
  ADD COLUMN google_meet_url TEXT;
