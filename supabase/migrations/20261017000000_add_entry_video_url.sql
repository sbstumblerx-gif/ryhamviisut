alter table public.entries
  add column if not exists video_url text;
