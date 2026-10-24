-- The existing code-based admin panel does not have a Supabase user id.
-- Keep authorship optional until announcement administration uses user-role auth.
ALTER TABLE public.announcements ALTER COLUMN created_by DROP NOT NULL;

-- Create the private bucket used by the announcement editor if it does not exist yet.
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-images', 'announcement-images', false)
ON CONFLICT (id) DO NOTHING;
