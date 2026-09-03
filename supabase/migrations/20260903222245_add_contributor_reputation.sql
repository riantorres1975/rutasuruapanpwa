create index if not exists community_reports_contributor_idx
  on public.community_reports (submitted_by_hash)
  where submitted_by_hash is not null;

create index if not exists route_confirmations_contributor_idx
  on public.route_confirmations (submitted_by_hash)
  where submitted_by_hash is not null;

create or replace function public.get_contributor_reputation(p_hashes text[])
returns table (
  contributor_hash text,
  accepted_count bigint,
  rejected_count bigint,
  pending_count bigint,
  last_contribution_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with requested as materialized (
    select distinct candidate.hash
    from unnest(coalesce(p_hashes, array[]::text[])) as candidate(hash)
    where candidate.hash ~ '^[0-9a-f]{32}$'
    limit 100
  ),
  activity as (
    select
      report.submitted_by_hash as contributor_hash,
      case
        when report.status = 'approved' then 'accepted'
        when report.status = 'rejected' then 'rejected'
        else 'pending'
      end as outcome,
      report.created_at as contributed_at
    from public.community_reports as report
    inner join requested on requested.hash = report.submitted_by_hash

    union all

    select
      confirmation.submitted_by_hash as contributor_hash,
      case
        when confirmation.status = 'accepted' then 'accepted'
        when confirmation.status = 'dismissed' then 'rejected'
        else 'pending'
      end as outcome,
      confirmation.observed_at as contributed_at
    from public.route_confirmations as confirmation
    inner join requested on requested.hash = confirmation.submitted_by_hash
  )
  select
    activity.contributor_hash,
    count(*) filter (where activity.outcome = 'accepted') as accepted_count,
    count(*) filter (where activity.outcome = 'rejected') as rejected_count,
    count(*) filter (where activity.outcome = 'pending') as pending_count,
    max(activity.contributed_at) as last_contribution_at
  from activity
  group by activity.contributor_hash;
$$;

revoke all on function public.get_contributor_reputation(text[]) from public, anon, authenticated;
grant execute on function public.get_contributor_reputation(text[]) to service_role;

comment on function public.get_contributor_reputation(text[]) is
  'Returns private moderation history for anonymous contributor hashes; callable only by the service role.';
