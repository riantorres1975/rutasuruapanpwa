alter table public.route_revisions
  add column operational_status text not null default 'active'
    check (operational_status in ('active', 'under_review', 'inactive', 'historical')),
  add column report_id uuid references public.community_reports(id) on delete set null,
  add column published_by uuid references auth.users(id) on delete set null,
  add column published_at timestamptz;

update public.route_revisions as revision
set
  operational_status = route.operational_status,
  published_at = coalesce(route.published_at, revision.created_at)
from public.routes as route
where revision.route_id = route.id
  and revision.version = route.data_version;

create function private.prevent_route_revision_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'route revisions are immutable';
end;
$$;

create trigger route_revisions_are_immutable
before update or delete on public.route_revisions
for each row execute function private.prevent_route_revision_mutation();

create or replace function public.publish_route_revision(
  p_route_id bigint,
  p_expected_version integer,
  p_name text,
  p_original_name text,
  p_color text,
  p_corridor_width_m integer,
  p_verified boolean,
  p_operational_status text,
  p_path jsonb,
  p_landmarks jsonb,
  p_change_summary text,
  p_report_id uuid,
  p_actor_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_route public.routes%rowtype;
  next_version integer;
begin
  if current_user <> 'service_role' then
    raise insufficient_privilege using message = 'route publication requires the service role';
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
    raise exception using errcode = '40001', message = 'route version changed during review';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 2 and 120
    or p_original_name is null or char_length(btrim(p_original_name)) not between 2 and 160
    or p_color is null or p_color !~ '^#[0-9a-fA-F]{6}$'
    or p_corridor_width_m not between 10 and 1000
    or p_operational_status not in ('active', 'under_review', 'inactive', 'historical')
    or p_change_summary is null or char_length(btrim(p_change_summary)) not between 10 and 1000
  then
    raise exception using errcode = '22023', message = 'invalid route metadata';
  end if;

  if p_path is null
    or jsonb_typeof(p_path) <> 'array'
    or jsonb_array_length(p_path) not between 2 and 20000
    or exists (
      select 1
      from jsonb_array_elements(p_path) as coordinate
      where jsonb_typeof(coordinate) <> 'array'
        or jsonb_array_length(coordinate) <> 2
        or jsonb_typeof(coordinate -> 0) <> 'number'
        or jsonb_typeof(coordinate -> 1) <> 'number'
        or (coordinate ->> 0)::double precision not between -103 and -101
        or (coordinate ->> 1)::double precision not between 18.5 and 20.5
    )
  then
    raise exception using errcode = '22023', message = 'invalid route path';
  end if;

  if p_landmarks is null or jsonb_typeof(p_landmarks) <> 'array' then
    raise exception using errcode = '22023', message = 'invalid route landmarks';
  end if;

  if p_report_id is not null and not exists (
    select 1 from public.community_reports
    where id = p_report_id and status = 'approved'
  ) then
    raise exception using errcode = '22023', message = 'linked report must be approved';
  end if;

  next_version := current_route.data_version + 1;

  insert into public.route_revisions (
    route_id,
    version,
    name,
    original_name,
    color,
    corridor_width_m,
    verified,
    path,
    landmarks,
    operational_status,
    change_summary,
    source,
    report_id,
    created_by,
    published_by,
    published_at
  ) values (
    p_route_id,
    next_version,
    btrim(p_name),
    btrim(p_original_name),
    lower(p_color),
    p_corridor_width_m,
    p_verified,
    p_path,
    p_landmarks,
    p_operational_status,
    btrim(p_change_summary),
    case when p_report_id is null then 'admin' else 'community_report' end,
    p_report_id,
    p_actor_id,
    p_actor_id,
    now()
  );

  update public.routes
  set
    name = btrim(p_name),
    original_name = btrim(p_original_name),
    color = lower(p_color),
    corridor_width_m = p_corridor_width_m,
    verified = p_verified,
    path = p_path,
    landmarks = p_landmarks,
    operational_status = p_operational_status,
    publication_status = 'published',
    data_version = next_version,
    last_verified_at = case when p_verified then now() else null end,
    published_at = now()
  where id = p_route_id;

  if p_report_id is not null then
    update public.community_reports
    set route_id = p_route_id
    where id = p_report_id;
  end if;

  return next_version;
end;
$$;

revoke all on function public.publish_route_revision(
  bigint, integer, text, text, text, integer, boolean, text, jsonb, jsonb, text, uuid, uuid
) from public, anon, authenticated;

grant execute on function public.publish_route_revision(
  bigint, integer, text, text, text, integer, boolean, text, jsonb, jsonb, text, uuid, uuid
) to service_role;

comment on function public.publish_route_revision(
  bigint, integer, text, text, text, integer, boolean, text, jsonb, jsonb, text, uuid, uuid
) is 'Atomically publishes a validated route snapshot and appends an immutable revision.';
