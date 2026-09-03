alter table public.community_reports
  add column if not exists evidence_url text,
  add column if not exists proposed_path jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'community_reports_evidence_url_https'
      and conrelid = 'public.community_reports'::regclass
  ) then
    alter table public.community_reports
      add constraint community_reports_evidence_url_https
      check (evidence_url is null or evidence_url ~ '^https://[^[:space:]]+$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'community_reports_proposed_path_shape'
      and conrelid = 'public.community_reports'::regclass
  ) then
    alter table public.community_reports
      add constraint community_reports_proposed_path_shape
      check (
        proposed_path is null
        or (
          jsonb_typeof(proposed_path) = 'array'
          and jsonb_array_length(proposed_path) between 2 and 120
        )
      );
  end if;
end
$$;

comment on column public.community_reports.evidence_url is
  'Private HTTPS source supplied for moderator verification.';
comment on column public.community_reports.proposed_path is
  'Private approximate route points; never published without an admin revision.';
