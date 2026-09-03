alter table public.community_reports
  add column route_key text;

alter table public.community_reports
  add constraint community_reports_route_key_format
    check (route_key is null or route_key ~ '^[a-z0-9-]+$');

create index community_reports_route_key_created_idx
  on public.community_reports (route_key, created_at desc)
  where route_key is not null;

comment on column public.community_reports.route_key is 'Stable public route-page key supplied by UruGo; route_id is assigned only after an administrator selects an exact direction.';
