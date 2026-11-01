-- Clients can book up to six months ahead (182 days), not two, now that the app shows a
-- month at a time with arrows to later months. Each call still covers at most 62 days;
-- the app asks for one month at a time.
--
-- Safe to run more than once: the function is replaced. All of it applies together or
-- not at all.

begin;

create or replace function available_slots(p_service uuid, p_from date, p_days int)
returns table (starts_at timestamptz)
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
    select f.starts_at from pro_free_slots(svc.pro_id, svc.duration_min, first_day,
                                           last_day - first_day + 1) f;
end;
$$;

grant execute on function available_slots(uuid, date, int) to anon, authenticated;

commit;
