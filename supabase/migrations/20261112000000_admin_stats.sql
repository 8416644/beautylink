-- App activity for the admin's stats screen.
--
-- Every phone or browser that opens the app keeps a random device id and calls
-- track_visit() when it opens and once a minute while it stays open. That gives:
--   * visits: each device counts once a day (app_visits), signed in or not;
--   * online now: devices seen in the last 3 minutes (app_devices.last_seen_at).
-- Counting starts when this runs; there is no visit history from before it.
--
-- Deleted accounts: the totals are counted live from profiles and pro_profiles, so a deleted
-- client or pro drops out of them at once. Each deletion is also logged (account_deletions,
-- no personal details) so the screen can say how many left in a period.
--
-- admin_stats(period) returns everything the screen shows, for admins only.
-- Safe to run more than once. All of it applies together or not at all.

begin;

create table if not exists app_devices (
  device_id uuid primary key,
  user_id uuid,                          -- the last signed-in user on this device, if any
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists app_devices_last_seen_idx on app_devices (last_seen_at desc);

create table if not exists app_visits (
  day date not null,                     -- Israel date
  device_id uuid not null references app_devices on delete cascade,
  primary key (day, device_id)
);

create table if not exists account_deletions (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('user', 'pro')),
  deleted_at timestamptz not null default now()
);

-- No policies: nobody reads or writes these tables directly, only the functions below.
alter table app_devices enable row level security;
alter table app_visits enable row level security;
alter table account_deletions enable row level security;

create or replace function track_visit(p_device uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_device is null then
    return;
  end if;
  insert into app_devices (device_id, user_id) values (p_device, auth.uid())
  on conflict (device_id) do update
    set last_seen_at = now(),
        user_id = coalesce(auth.uid(), app_devices.user_id);
  insert into app_visits (day, device_id)
  values ((now() at time zone 'Asia/Jerusalem')::date, p_device)
  on conflict do nothing;
end;
$$;

revoke all on function track_visit(uuid) from public;
grant execute on function track_visit(uuid) to anon, authenticated;

create or replace function log_account_deletion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into account_deletions (kind)
  values (case when tg_table_name = 'pro_profiles' then 'pro' else 'user' end);
  return old;
end;
$$;

drop trigger if exists profiles_log_deletion on profiles;
create trigger profiles_log_deletion
  after delete on profiles
  for each row execute function log_account_deletion();

drop trigger if exists pro_profiles_log_deletion on pro_profiles;
create trigger pro_profiles_log_deletion
  after delete on pro_profiles
  for each row execute function log_account_deletion();

-- p_period: 'today', 'week' (from Sunday), 'month', 'year' or 'all'. Periods follow Israel
-- time. "prev_*" counts the same stretch of the period before (for "today" until this hour
-- yesterday), so the comparison is fair mid-period; they are null for 'all'.
create or replace function admin_stats(p_period text) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  tz constant text := 'Asia/Jerusalem';
  today date := (now() at time zone tz)::date;
  d_from date;
  d_prev date;
  t_from timestamptz;
  t_prev timestamptz;
  t_prev_end timestamptz;
  s_from date;
  s_to date;
  step interval;
  series json;
begin
  if not is_admin() then
    raise exception 'Admins only';
  end if;

  if p_period = 'today' then
    d_from := today;
    d_prev := today - 1;
  elsif p_period = 'week' then
    d_from := today - extract(dow from today)::int;
    d_prev := d_from - 7;
  elsif p_period = 'month' then
    d_from := date_trunc('month', today)::date;
    d_prev := (d_from - interval '1 month')::date;
  elsif p_period = 'year' then
    d_from := date_trunc('year', today)::date;
    d_prev := (d_from - interval '1 year')::date;
  elsif p_period = 'all' then
    d_from := null;
    d_prev := null;
  else
    raise exception 'Unknown period %', p_period;
  end if;

  if d_from is not null then
    t_from := d_from::timestamp at time zone tz;
    t_prev := d_prev::timestamp at time zone tz;
    t_prev_end := t_prev + (now() - t_from);
  end if;

  -- Visits per day (week, month) or per month (year, all); none for today.
  if p_period in ('week', 'month') then
    step := interval '1 day';
    s_from := d_from;
    s_to := case when p_period = 'week' then d_from + 6
                 else (d_from + interval '1 month' - interval '1 day')::date end;
  elsif p_period in ('year', 'all') then
    step := interval '1 month';
    s_from := coalesce(d_from, date_trunc('month', coalesce((select min(day) from app_visits), today))::date);
    s_to := case when p_period = 'year' then (d_from + interval '11 months')::date
                 else date_trunc('month', today)::date end;
  end if;

  if step is not null then
    select coalesce(json_agg(json_build_object(
             'start', g::date,
             'count', (select count(distinct v.device_id) from app_visits v
                       where v.day >= g::date and v.day < (g + step)::date))
           order by g), '[]'::json)
      into series
      from generate_series(s_from::timestamp, s_to::timestamp, step) g;
  else
    series := '[]'::json;
  end if;

  return json_build_object(
    'from', d_from,
    'online', (select count(*) from app_devices where last_seen_at > now() - interval '3 minutes'),
    'visits', (select count(distinct device_id) from app_visits
               where d_from is null or day >= d_from),
    'prev_visits', case when d_from is null then null else
                     (select count(distinct device_id) from app_visits
                      where day >= d_prev and day <= d_prev + (today - d_from)) end,
    'series', series,
    'signups', (select count(*) from profiles where t_from is null or created_at >= t_from),
    'prev_signups', case when t_from is null then null else
                      (select count(*) from profiles
                       where created_at >= t_prev and created_at < t_prev_end) end,
    'total_users', (select count(*) from profiles),
    'new_pros', (select count(*) from pro_profiles
                 where status <> 'draft' and (t_from is null or created_at >= t_from)),
    'pending_pros', (select count(*) from pro_profiles where status = 'pending'),
    'approved_pros', (select count(*) from pro_profiles where status = 'approved'),
    'booked', (select count(*) from appointments
               where source = 'app' and (t_from is null or created_at >= t_from)),
    'cancelled', (select count(*) from appointments
                  where source = 'app' and status = 'cancelled'
                    and (t_from is null or created_at >= t_from)),
    'reviews', (select count(*) from reviews where t_from is null or created_at >= t_from),
    'reviews_avg', (select round(avg(rating), 1) from reviews
                    where t_from is null or created_at >= t_from),
    'favorites', (select count(*) from favorites where t_from is null or created_at >= t_from),
    'deleted_users', (select count(*) from account_deletions
                      where kind = 'user' and (t_from is null or deleted_at >= t_from)),
    'deleted_pros', (select count(*) from account_deletions
                     where kind = 'pro' and (t_from is null or deleted_at >= t_from))
  );
end;
$$;

revoke all on function admin_stats(text) from public;
grant execute on function admin_stats(text) to authenticated;

commit;
