create type public.section_type as enum ('artistijulkistus','esittely','karsinta','finaali');

create table public.competitions (id uuid primary key default gen_random_uuid(), year int not null unique, created_at timestamptz not null default now());
create table public.sections (id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.competitions(id) on delete cascade, type public.section_type not null, video_url text, created_at timestamptz not null default now(), unique(competition_id, type));
create table public.entries (id uuid primary key default gen_random_uuid(), section_id uuid not null references public.sections(id) on delete cascade, artist text not null, song text, audience_points int not null default 0, status text check (status in ('eteni','karsiutui')), position int not null default 0, created_at timestamptz not null default now());
create table public.juries (id uuid primary key default gen_random_uuid(), section_id uuid not null references public.sections(id) on delete cascade, name text not null, position int not null default 0, created_at timestamptz not null default now());
create table public.jury_votes (id uuid primary key default gen_random_uuid(), jury_id uuid not null references public.juries(id) on delete cascade, entry_id uuid not null references public.entries(id) on delete cascade, rank int not null, points int not null default 0, unique(jury_id, entry_id));

grant select on public.competitions, public.sections, public.entries, public.juries, public.jury_votes to anon, authenticated;
grant all on public.competitions, public.sections, public.entries, public.juries, public.jury_votes to service_role;

alter table public.competitions enable row level security;
alter table public.sections enable row level security;
alter table public.entries enable row level security;
alter table public.juries enable row level security;
alter table public.jury_votes enable row level security;

create policy "public read" on public.competitions for select to anon, authenticated using (true);
create policy "public read" on public.sections for select to anon, authenticated using (true);
create policy "public read" on public.entries for select to anon, authenticated using (true);
create policy "public read" on public.juries for select to anon, authenticated using (true);
create policy "public read" on public.jury_votes for select to anon, authenticated using (true);