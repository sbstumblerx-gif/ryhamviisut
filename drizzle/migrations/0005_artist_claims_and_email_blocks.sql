CREATE TABLE public.artist_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 320),
  artist_slug text NOT NULL CHECK (length(artist_slug) BETWEEN 1 AND 200),
  artist_name text NOT NULL CHECK (length(artist_name) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid
);
CREATE UNIQUE INDEX artist_claims_active_user ON public.artist_claims(user_id) WHERE status IN ('pending','approved');
CREATE UNIQUE INDEX artist_claims_active_email ON public.artist_claims(email) WHERE status IN ('pending','approved');
CREATE INDEX artist_claims_slug ON public.artist_claims(artist_slug);
GRANT ALL ON public.artist_claims TO service_role;
ALTER TABLE public.artist_claims ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.email_blocks (
  email text NOT NULL CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 320),
  scope text NOT NULL CHECK (scope IN ('app','artist')),
  reason text CHECK (reason IS NULL OR length(reason) <= 1000),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, scope)
);
GRANT ALL ON public.email_blocks TO service_role;
ALTER TABLE public.email_blocks ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid NOT NULL,
  action text NOT NULL,
  target text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_set_claim_status(_claim_id uuid, _actor uuid, _from text[], _to text)
RETURNS public.artist_claims LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.artist_claims;
BEGIN
  IF NOT public.has_role(_actor, 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO c FROM public.artist_claims WHERE id = _claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT (c.status = ANY(_from)) THEN RAISE EXCEPTION 'invalid_state'; END IF;
  IF _to = 'approved' AND EXISTS (SELECT 1 FROM public.email_blocks b WHERE b.email = c.email) THEN RAISE EXCEPTION 'blocked'; END IF;
  UPDATE public.artist_claims SET status = _to, decided_at = now(), decided_by = _actor WHERE id = _claim_id RETURNING * INTO c;
  INSERT INTO public.admin_audit_log(actor, action, target, details)
    VALUES (_actor, 'claim_' || _to, _claim_id::text, jsonb_build_object('artist_slug', c.artist_slug));
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_claim_status(uuid, uuid, text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_claim_status(uuid, uuid, text[], text) TO service_role;

CREATE OR REPLACE FUNCTION public.is_verified_artist(_user_id uuid, _slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.artist_claims c
    WHERE c.user_id = _user_id AND c.artist_slug = _slug AND c.status = 'approved'
      AND NOT EXISTS (SELECT 1 FROM public.email_blocks b WHERE b.email = c.email)
  )
$$;
REVOKE ALL ON FUNCTION public.is_verified_artist(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_verified_artist(uuid, text) TO authenticated, service_role;