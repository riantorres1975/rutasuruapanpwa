create table if not exists public.rate_limit_buckets (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  request_count integer not null check (request_count > 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists rate_limit_buckets_reset_idx
  on public.rate_limit_buckets (reset_at);

alter table public.rate_limit_buckets enable row level security;
revoke all on table public.rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

create or replace function public.consume_rate_limit_bucket(
  p_key_hash text,
  p_limit integer,
  p_window_ms integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if p_key_hash is null
    or p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit is null
    or p_limit not between 1 and 10000
    or p_window_ms is null
    or p_window_ms not between 1000 and 604800000 then
    raise exception 'invalid rate limit parameters';
  end if;

  insert into public.rate_limit_buckets as bucket (
    key_hash,
    request_count,
    reset_at,
    updated_at
  ) values (
    p_key_hash,
    1,
    v_now + make_interval(secs => p_window_ms / 1000.0),
    v_now
  )
  on conflict (key_hash) do update
  set
    request_count = case
      when bucket.reset_at <= v_now then 1
      else least(bucket.request_count + 1, p_limit + 1)
    end,
    reset_at = case
      when bucket.reset_at <= v_now
        then v_now + make_interval(secs => p_window_ms / 1000.0)
      else bucket.reset_at
    end,
    updated_at = v_now
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit_bucket(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit_bucket(text, integer, integer)
  to service_role;

comment on table public.rate_limit_buckets is
  'Server-only fixed-window counters keyed by irreversible HMAC digests.';
comment on function public.consume_rate_limit_bucket(text, integer, integer) is
  'Atomically consumes one request from a server-only rate limit bucket.';
