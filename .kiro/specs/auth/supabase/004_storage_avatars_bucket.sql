-- ============================================================
-- 004: avatars Storage バケットの作成とポリシー設定
-- 目的: ユーザーのプロフィール画像を保存するバケット
-- 依存: なし
-- ファイルパス規約: avatars/{user_id}/avatar.{ext}
-- ============================================================

-- バケット作成（public: アバター画像は認証なしで表示可能）
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- アップロード: 認証済みユーザーが自分のフォルダにのみアップロード可能
CREATE POLICY "Users can upload own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 上書き: 自分のアバターのみ更新可能
CREATE POLICY "Users can update own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 削除: 自分のアバターのみ削除可能
CREATE POLICY "Users can delete own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 閲覧: 全員がアバターを表示可能（公開バケット）
CREATE POLICY "Anyone can view avatars"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');
