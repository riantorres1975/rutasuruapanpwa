create table if not exists public.route_field_verifications (
  id uuid primary key default gen_random_uuid(),
  route_id bigint not null references public.routes(id) on delete cascade,
  verified_by uuid references auth.users(id) on delete set null,
  note text not null check (char_length(btrim(note)) between 10 and 1000),
  verified_at timestamptz not null default now()
);

create index if not exists route_field_verifications_route_date_idx
  on public.route_field_verifications (route_id, verified_at desc);

alter table public.route_field_verifications enable row level security;
revoke all on table public.route_field_verifications from public, anon, authenticated;
grant select, insert on table public.route_field_verifications to service_role;

create or replace function private.prevent_route_verification_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'route field verifications are immutable';
end;
$$;

drop trigger if exists route_field_verifications_are_immutable
  on public.route_field_verifications;
create trigger route_field_verifications_are_immutable
before update or delete on public.route_field_verifications
for each row execute function private.prevent_route_verification_mutation();

create or replace function private.preserve_route_verification_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('urugo.allow_route_verification_timestamp', true) is distinct from 'on' then
    new.last_verified_at = case when new.verified then old.last_verified_at else null end;
  end if;
  return new;
end;
$$;

drop trigger if exists route_verification_timestamp_guard on public.routes;
create trigger route_verification_timestamp_guard
before update on public.routes
for each row execute function private.preserve_route_verification_timestamp();

create or replace function public.record_route_field_verification(
  p_route_id bigint,
  p_expected_version integer,
  p_note text,
  p_actor_id uuid
)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_route public.routes%rowtype;
  verification_time timestamptz := now();
begin
  if current_user <> 'service_role' then
    raise insufficient_privilege using message = 'route verification requires the service role';
  end if;

  select *
  into current_route
  from public.routes
  where id = p_route_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'route not found';
  end if;

  if current_route.data_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'route version changed during verification';
  end if;

  if p_note is null or char_length(btrim(p_note)) not between 10 and 1000 then
    raise exception using errcode = '22023', message = 'invalid verification note';
  end if;

  perform set_config('urugo.allow_route_verification_timestamp', 'on', true);

  update public.routes
  set verified = true, last_verified_at = verification_time
  where id = p_route_id;

  insert into public.route_field_verifications (route_id, verified_by, note, verified_at)
  values (p_route_id, p_actor_id, btrim(p_note), verification_time);

  return verification_time;
end;
$$;

revoke all on function public.record_route_field_verification(bigint, integer, text, uuid)
  from public, anon, authenticated;
grant execute on function public.record_route_field_verification(bigint, integer, text, uuid)
  to service_role;

comment on table public.route_field_verifications is
  'Immutable evidence log for route checks performed by administrators.';
comment on function public.record_route_field_verification(bigint, integer, text, uuid) is
  'Records a dated field check without creating or changing a route geometry revision.';
