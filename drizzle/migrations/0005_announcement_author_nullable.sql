-- The existing code-based admin panel does not have a Supabase user id.
-- Keep authorship optional until announcement administration uses user-role auth.
ALTER TABLE public.announcements ALTER COLUMN created_by DROP NOT NULL;
