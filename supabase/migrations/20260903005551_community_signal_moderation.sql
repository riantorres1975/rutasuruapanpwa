alter table public.route_confirmations
  add column status text not null default 'pending'
    check (status in ('pending', 'accepted', 'dismissed')),
  add column moderator_note text,
  add column reviewed_by uuid references auth.users(id) on delete set null,
  add column reviewed_at timestamptz,
  add column observed_on date;

update public.route_confirmations
set observed_on = (observed_at at time zone 'America/Mexico_City')::date
where observed_on is null;

alter table public.route_confirmations
  alter column observed_on set default ((now() at time zone 'America/Mexico_City')::date),
  alter column observed_on set not null;

with duplicates as (
  select
    id,
    row_number() over (
      partition by route_key, submitted_by_hash, observed_on
      order by created_at desc, id desc
    ) as duplicate_number
  from public.route_confirmations
  where submitted_by_hash is not null
)
delete from public.route_confirmations as confirmation
using duplicates
where confirmation.id = duplicates.id
  and duplicates.duplicate_number > 1;

create unique index route_confirmations_device_day_unique_idx
  on public.route_confirmations (route_key, submitted_by_hash, observed_on)
  where submitted_by_hash is not null;

create index route_confirmations_moderation_idx
  on public.route_confirmations (status, observed_at desc);

create index route_confirmations_name_status_idx
  on public.route_confirmations (route_name, status, observed_at desc);

create table public.confirmation_moderation_audit (
  id bigint generated always as identity primary key,
  confirmation_id uuid references public.route_confirmations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  previous_status text,
  next_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create function private.audit_confirmation_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.confirmation_moderation_audit (
      confirmation_id,
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

create trigger route_confirmations_audit_status
after update on public.route_confirmations
for each row execute function private.audit_confirmation_moderation();

alter table public.confirmation_moderation_audit enable row level security;

revoke all on table public.confirmation_moderation_audit from anon, authenticated;
revoke all on sequence public.confirmation_moderation_audit_id_seq from anon, authenticated;

revoke all on table public.confirmation_moderation_audit from service_role;
grant select, insert on table public.confirmation_moderation_audit to service_role;
grant usage, select on sequence public.confirmation_moderation_audit_id_seq to service_role;

comment on column public.route_confirmations.status is 'Moderation state; confirmations never alter a route automatically.';
comment on table public.confirmation_moderation_audit is 'Immutable status-change history for community route confirmations.';
