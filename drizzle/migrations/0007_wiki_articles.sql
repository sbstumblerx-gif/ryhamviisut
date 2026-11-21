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