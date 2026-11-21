ALTER TABLE public.artist_profiles
  ADD COLUMN IF NOT EXISTS banner_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('artist-banners', 'artist-banners', true, 10485760, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = 10485760, allowed_mime_types = ARRAY['image/webp'];

CREATE POLICY artist_banners_public_read
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'artist-banners');

CREATE POLICY artist_banners_owner_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'artist-banners'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_verified_artist(auth.uid(), (storage.foldername(name))[1])
    )
  );

CREATE POLICY artist_banners_owner_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'artist-banners'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_verified_artist(auth.uid(), (storage.foldername(name))[1])
    )
  )
  WITH CHECK (
    bucket_id = 'artist-banners'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_verified_artist(auth.uid(), (storage.foldername(name))[1])
    )
  );

CREATE POLICY artist_banners_owner_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'artist-banners'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_verified_artist(auth.uid(), (storage.foldername(name))[1])
    )
  );
