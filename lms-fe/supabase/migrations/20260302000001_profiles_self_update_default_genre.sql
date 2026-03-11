-- profiles テーブル: ユーザーが自分の default_genre を更新できるポリシー
--
-- 問題: profiles の UPDATE ポリシーは super_admin のみ許可されており、
-- 一般ユーザーが自分の default_genre を変更できない。
-- RLS により UPDATE は静かに 0 行更新として失敗する。
--
-- 修正: 認証済みユーザーが自分自身の default_genre カラムのみ更新可能なポリシーを追加。

CREATE POLICY "Users can update own default_genre"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
