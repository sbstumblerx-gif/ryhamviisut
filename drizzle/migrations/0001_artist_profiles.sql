CREATE TABLE public.artist_profiles (
  slug text PRIMARY KEY,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.artist_profiles TO anon, authenticated;
GRANT ALL ON public.artist_profiles TO service_role;

ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artist_profiles_select_public"
  ON public.artist_profiles FOR SELECT
  USING (true);