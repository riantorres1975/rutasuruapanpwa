create table if not exists public.community_api_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  key_prefix text not null unique check (key_prefix ~ '^urugo_sk_[A-Za-z0-9_-]{8,16}$'),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  active boolean not null default true,
  hourly_limit integer not null default 30 check (hourly_limit between 1 and 1000),
  created_by uuid references auth.users(id) on delete set null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check ((active and revoked_at is null) or not active)
);

alter table public.community_reports
  add column if not exists api_client_id uuid references public.community_api_clients(id) on delete set null,
  add column if not exists submission_source text not null default 'web'
    check (submission_source in ('web', 'external_api'));

create index if not exists community_reports_api_client_idx
  on public.community_reports (api_client_id, created_at desc)
  where api_client_id is not null;

alter table public.community_api_clients enable row level security;

revoke all on table public.community_api_clients from public, anon, authenticated;
grant select, insert, update, delete on table public.community_api_clients to service_role;

comment on table public.community_api_clients is
  'Server-only clients allowed to submit moderated community reports through API v1.';
comment on column public.community_api_clients.key_hash is
  'SHA-256 digest of the API key; the original secret is never stored.';
comment on column public.community_reports.submission_source is
  'Origin of the private report; external submissions always remain moderated.';
