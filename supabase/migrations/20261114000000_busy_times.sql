-- The booking screen shows taken times next to the free ones (black, "taken").
--
-- busy_times() returns the start and end of the pro's live appointments (waiting for
-- approval or confirmed) on the days asked, for one of her active services, and nothing
-- else: no client, treatment or note. Blocked time she set for herself is not shown.
-- Same limits as available_slots: from today, at most 62 days a call, up to 6 months ahead.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

create or replace function busy_times(p_service uuid, p_from date, p_days int)
returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  svc services%rowtype;
  today date := (now() at time zone 'Asia/Jerusalem')::date;
  first_day date := greatest(p_from, today);
  last_day date := least(p_from + least(greatest(p_days, 1), 62) - 1, today + 181);
begin
  select s.* into svc from services s
  where s.id = p_service and s.is_active and is_approved_pro(s.pro_id);
  if not found or last_day < first_day then
    return;
  end if;
  return query
    select a.starts_at, a.ends_at
    from appointments a
    where a.pro_id = svc.pro_id
      and a.status in ('pending', 'confirmed')
      and a.starts_at > now()
      and a.starts_at >= first_day::timestamp at time zone 'Asia/Jerusalem'
      and a.starts_at < (last_day + 1)::timestamp at time zone 'Asia/Jerusalem'
    order by a.starts_at;
end;
$$;

grant execute on function busy_times(uuid, date, int) to anon, authenticated;

commit;
