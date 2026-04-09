-- Migration: profiles テーブルに slack_user_id カラムを追加
-- Description: Slack 通知における担当コーチ（Super Admin）のメンション機能を実現するため、
--   profiles テーブルに Slack User ID を保存するカラムを追加する。
--   既存レコードは NULL のまま運用可能（後方互換）。NOT NULL 制約・CHECK 制約は付けず、
--   バリデーションはアプリケーション層（updateSlackUserId Server Action）に集約する。
-- Requirements: notifications spec - Requirement 4.1, 5

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS slack_user_id text;

COMMENT ON COLUMN public.profiles.slack_user_id IS
  'Slack の User ID（U または W で始まる文字列、例: U01ABCDEF）。Super Admin のみ使用。Slack 通知のメンション宛先として利用される。NULL の場合は @here でフォールバックする。';
