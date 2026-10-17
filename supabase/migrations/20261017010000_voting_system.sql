create table if not exists public.voting_polls (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  total_audience_points integer check (total_audience_points is null or total_audience_points >= 0),
  points_calculated boolean not null default false,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  closed_at timestamptz
);

create table if not exists public.voting_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.voting_polls(id) on delete cascade,
  entry_id uuid references public.entries(id) on delete set null,
  artist text not null check (char_length(artist) between 1 and 200),
  song text,
  audience_points integer not null default 0 check (audience_points >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.voting_ballots (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.voting_polls(id) on delete cascade,
  option_id uuid not null references public.voting_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create unique index if not exists voting_polls_one_active_idx on public.voting_polls (status) where status = 'active';
create index if not exists voting_options_poll_id_idx on public.voting_options(poll_id);
create index if not exists voting_ballots_poll_id_idx on public.voting_ballots(poll_id);
create index if not exists voting_ballots_option_id_idx on public.voting_ballots(option_id);

alter table public.voting_polls enable row level security;
alter table public.voting_options enable row level security;
alter table public.voting_ballots enable row level security;

-- All voting reads/writes go through server functions. Never expose individual ballots.
revoke all on public.voting_polls from anon, authenticated;
revoke all on public.voting_options from anon, authenticated;
revoke all on public.voting_ballots from anon, authenticated;
