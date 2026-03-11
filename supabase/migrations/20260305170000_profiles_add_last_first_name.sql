-- Migration: profiles テーブルに last_name / first_name カラムを追加
-- Description: 姓名の分割管理を実現するため、profiles テーブルに last_name / first_name カラムを追加し、既存の full_name データを姓名に分割してマイグレーション
-- Requirements: 3.1

-- カラム追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS first_name text;

-- 既存データのマイグレーション: full_name を姓名に分割
-- full_name のフォーマットは "姓 名" であるため、最初のスペースで分割
UPDATE public.profiles
SET
  last_name = SPLIT_PART(full_name, ' ', 1),
  first_name = SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
WHERE full_name IS NOT NULL AND full_name != '' AND last_name IS NULL;
