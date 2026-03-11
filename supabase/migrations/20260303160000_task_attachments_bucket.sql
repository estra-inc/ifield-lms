-- task-attachments バケット作成（public read）
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 認証ユーザーはアップロード可能
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload task attachments'
  ) THEN
    CREATE POLICY "Authenticated users can upload task attachments"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'task-attachments');
  END IF;
END $$;

-- 全員が閲覧可能（public バケット）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view task attachments'
  ) THEN
    CREATE POLICY "Anyone can view task attachments"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'task-attachments');
  END IF;
END $$;

-- 所有者のみ削除可能
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own task attachments'
  ) THEN
    CREATE POLICY "Users can delete own task attachments"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
