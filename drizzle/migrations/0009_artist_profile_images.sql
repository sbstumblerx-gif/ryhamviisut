ALTER TABLE public.artist_profiles
  ADD COLUMN IF NOT EXISTS image_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('artist-images', 'artist-images', true, 15728640, ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = 15728640, allowed_mime_types = ARRAY['image/webp'];

DROP POLICY IF EXISTS artist_images_public_read ON storage.objects;
CREATE POLICY artist_images_public_read
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'artist-images');

DROP POLICY IF EXISTS artist_images_owner_insert ON storage.objects;
CREATE POLICY artist_images_owner_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'artist-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_verified_artist(auth.uid(), (storage.foldername(name))[1])
    )
  );

DROP POLICY IF EXISTS artist_images_owner_update ON storage.objects;
CREATE POLICY artist_images_owner_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'artist-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_verified_artist(auth.uid(), (storage.foldername(name))[1])
    )
  )
  WITH CHECK (
    bucket_id = 'artist-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_verified_artist(auth.uid(), (storage.foldername(name))[1])
    )
  );

DROP POLICY IF EXISTS artist_images_owner_delete ON storage.objects;
CREATE POLICY artist_images_owner_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'artist-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_verified_artist(auth.uid(), (storage.foldername(name))[1])
    )
  );
