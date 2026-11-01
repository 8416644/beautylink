-- When a pro adds a booking herself, the app lists her free times on the chosen day for
-- the chosen service: inside her working hours, clear of other appointments and blocked
-- time, on her slot step. She can still type another time.
--
-- Safe to run more than once: the function is replaced. All of it applies together or
-- not at all.

begin;

create or replace function my_free_slots(p_service uuid, p_date date)
returns table (starts_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  svc services%rowtype;
begin
  select * into svc from services where id = p_service and pro_id = auth.uid();
  if not found then
    return;
  end if;
  return query select f.starts_at from pro_free_slots(svc.pro_id, svc.duration_min, p_date, 1) f;
end;
$$;

revoke execute on function my_free_slots(uuid, date) from public, anon;
grant execute on function my_free_slots(uuid, date) to authenticated;

commit;
