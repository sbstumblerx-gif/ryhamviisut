create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  application_type text not null check (application_type in ('kilpailija', 'raati', 'valiesitys')),
  applicant_name text not null,
  contact_email text,
  payload jsonb not null default '{}'::jsonb,
  tracking_token text not null unique,
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.applications enable row level security;
revoke all on public.applications from anon, authenticated;
grant all on public.applications to service_role;
