create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.routes (
  id bigint primary key,
  name text not null,
  original_name text not null,
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  corridor_width_m integer not null default 500 check (corridor_width_m between 10 and 1000),
  verified boolean not null default false,
  path jsonb not null check (jsonb_typeof(path) = 'array'),
  landmarks jsonb not null default '[]'::jsonb check (jsonb_typeof(landmarks) = 'array'),
  operational_status text not null default 'active'
    check (operational_status in ('active', 'under_review', 'inactive', 'historical')),
  publication_status text not null default 'published'
    check (publication_status in ('draft', 'published', 'archived')),
  data_version integer not null default 1 check (data_version > 0),
  last_verified_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.route_revisions (
  id uuid primary key default gen_random_uuid(),
  route_id bigint not null references public.routes(id) on delete cascade,
  version integer not null check (version > 0),
  name text not null,
  original_name text not null,
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  corridor_width_m integer not null check (corridor_width_m between 10 and 1000),
  verified boolean not null default false,
  path jsonb not null check (jsonb_typeof(path) = 'array'),
  landmarks jsonb not null default '[]'::jsonb check (jsonb_typeof(landmarks) = 'array'),
  change_summary text,
  source text not null default 'admin',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (route_id, version)
);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  route_id bigint references public.routes(id) on delete set null,
  report_type text not null check (
    report_type in (
      'route_incorrect',
      'route_missing',
      'route_inactive',
      'route_changed',
      'schedule_changed',
      'landmark_changed',
      'map_error',
      'location_problem',
      'usability_problem',
      'other'
    )
  ),
  route_name text,
  place text,
  description text not null,
  expected_result text,
  contact text,
  source_path text,
  user_agent text,
  submitted_by_hash text,
  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'approved', 'rejected')),
  moderator_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.route_confirmations (
  id uuid primary key default gen_random_uuid(),
  route_id bigint references public.routes(id) on delete set null,
  route_key text not null,
  route_name text not null,
  confirmation_type text not null
    check (confirmation_type in ('seen_today', 'not_running', 'changed')),
  note text,
  source_path text,
  submitted_by_hash text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.admin_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique check (email = lower(email)),
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.moderation_audit (
  id bigint generated always as identity primary key,
  report_id uuid references public.community_reports(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  previous_status text,
  next_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index community_reports_status_created_idx
  on public.community_reports (status, created_at desc);
create index community_reports_route_idx
  on public.community_reports (route_id, created_at desc);
create index route_confirmations_route_created_idx
  on public.route_confirmations (route_key, created_at desc);
create index routes_public_status_idx
  on public.routes (publication_status, operational_status, id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger routes_set_updated_at
before update on public.routes
for each row execute function private.set_updated_at();

create trigger community_reports_set_updated_at
before update on public.community_reports
for each row execute function private.set_updated_at();

create function private.audit_report_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.moderation_audit (
      report_id,
      actor_id,
      previous_status,
      next_status,
      note
    ) values (
      new.id,
      new.reviewed_by,
      old.status,
      new.status,
      new.moderator_note
    );
  end if;
  return new;
end;
$$;

create trigger community_reports_audit_status
after update on public.community_reports
for each row execute function private.audit_report_moderation();

alter table public.routes enable row level security;
alter table public.route_revisions enable row level security;
alter table public.community_reports enable row level security;
alter table public.route_confirmations enable row level security;
alter table public.admin_members enable row level security;
alter table public.moderation_audit enable row level security;

revoke all on table public.routes from anon, authenticated;
revoke all on table public.route_revisions from anon, authenticated;
revoke all on table public.community_reports from anon, authenticated;
revoke all on table public.route_confirmations from anon, authenticated;
revoke all on table public.admin_members from anon, authenticated;
revoke all on table public.moderation_audit from anon, authenticated;
revoke all on sequence public.moderation_audit_id_seq from anon, authenticated;

grant select, insert, update, delete on table public.routes to service_role;
grant select, insert, update, delete on table public.route_revisions to service_role;
grant select, insert, update, delete on table public.community_reports to service_role;
grant select, insert, update, delete on table public.route_confirmations to service_role;
grant select, insert, update, delete on table public.admin_members to service_role;
grant select, insert, update, delete on table public.moderation_audit to service_role;
grant usage, select on sequence public.moderation_audit_id_seq to service_role;

comment on table public.routes is 'Current approved route snapshots consumed by UruGo.';
comment on table public.route_revisions is 'Immutable route history used for review and rollback.';
comment on table public.community_reports is 'Private community submissions awaiting moderation.';
comment on table public.route_confirmations is 'Community observations; never publish route changes automatically.';
