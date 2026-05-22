-- OCR rate limiting: per-user, per-hour window, max 10 calls
-- Atomic via INSERT ... ON CONFLICT DO UPDATE (no race condition)

create table if not exists ocr_rate_limit (
  user_id      uuid        not null references auth.users on delete cascade,
  window_start timestamptz not null,
  count        integer     not null default 1,
  primary key (user_id, window_start)
);

-- Rows older than 2 hours are dead weight — auto-cleanup via RPC
create or replace function check_ocr_rate_limit(
  p_user_id     uuid,
  p_max_per_hour integer default 10
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := date_trunc('hour', now() at time zone 'utc');
  v_count  integer;
begin
  -- Atomic increment — safe under concurrent requests
  insert into ocr_rate_limit(user_id, window_start, count)
  values (p_user_id, v_window, 1)
  on conflict (user_id, window_start)
  do update set count = ocr_rate_limit.count + 1
  returning count into v_count;

  -- Lazy cleanup: delete rows older than 2 hours for this user
  delete from ocr_rate_limit
  where user_id = p_user_id
    and window_start < now() - interval '2 hours';

  return v_count <= p_max_per_hour;
end;
$$;
