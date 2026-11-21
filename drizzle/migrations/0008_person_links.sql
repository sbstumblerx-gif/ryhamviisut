CREATE TABLE public.person_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('artist','jury')),
  entity_key text NOT NULL,
  entity_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, entity_key)
);
CREATE INDEX person_links_person_id_idx ON public.person_links(person_id);
ALTER TABLE public.person_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY person_links_public_read ON public.person_links FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.person_links TO anon, authenticated;
GRANT ALL ON public.person_links TO service_role;
