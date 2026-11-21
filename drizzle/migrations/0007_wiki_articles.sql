CREATE TABLE public.wiki_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  content jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wiki_articles_updated_at_idx ON public.wiki_articles(updated_at DESC);
ALTER TABLE public.wiki_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY wiki_articles_public_read ON public.wiki_articles FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.wiki_articles TO anon, authenticated;
GRANT ALL ON public.wiki_articles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wiki_articles TO authenticated;
CREATE POLICY wiki_articles_admin_insert ON public.wiki_articles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY wiki_articles_admin_update ON public.wiki_articles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY wiki_articles_admin_delete ON public.wiki_articles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY announcement_images_wiki_public_select ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'announcement-images'
    AND EXISTS (
      SELECT 1 FROM public.wiki_articles a
      WHERE a.content @> jsonb_build_object('content', jsonb_build_array(jsonb_build_object('type','image','attrs',jsonb_build_object('src',name))))
    )
  );
