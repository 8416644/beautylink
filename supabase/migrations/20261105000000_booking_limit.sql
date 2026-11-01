-- A client can hold at most 5 upcoming bookings (requests or confirmed) with the same pro,
-- so no one can take up a pro's whole week, by mistake or on purpose.
--
-- book_appointment is the same as in the booking migration, plus that check and its
-- error, too_many.
--
-- Safe to run more than once: the function is replaced. All of it applies together or
-- not at all.

begin;

-- Errors, as the message: not_signed_in, service_unavailable, own_service,
-- location_unavailable, phone_required, slot_taken, too_many.
create or replace function book_appointment(
  p_service uuid,
  p_starts_at timestamptz,
  p_phone text,
  p_note text default null,
  p_at_client_home boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  svc services%rowtype;
  pro pro_profiles%rowtype;
  client_name text;
  v_phone text := nullif(trim(p_phone), '');
  card uuid;
  new_id uuid;
  starts_day date := (p_starts_at at time zone 'Asia/Jerusalem')::date;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;

  select * into svc from services where id = p_service and is_active;
  if not found then
    raise exception 'service_unavailable';
  end if;
  select * into pro from pro_profiles where user_id = svc.pro_id and status = 'approved';
  if not found then
    raise exception 'service_unavailable';
  end if;
  if pro.user_id = uid then
    raise exception 'own_service';
  end if;
  if (p_at_client_home and not pro.travels_to_client)
     or (not p_at_client_home and not (pro.works_at_salon or pro.works_at_home)) then
    raise exception 'location_unavailable';
  end if;
  if v_phone is null then
    raise exception 'phone_required';
  end if;

  if not exists (
    select 1 from pro_free_slots(pro.user_id, svc.duration_min, starts_day, 1) f
    where f.starts_at = p_starts_at
  ) then
    raise exception 'slot_taken';
  end if;

  if (select count(*) from appointments
      where client_user_id = uid and pro_id = pro.user_id
        and status in ('pending', 'confirmed') and starts_at > now()) >= 5 then
    raise exception 'too_many';
  end if;

  select coalesce(nullif(trim(p.full_name), ''), u.email, 'לקוחה') into client_name
  from profiles p join auth.users u on u.id = p.id
  where p.id = uid;

  insert into pro_clients (pro_id, client_user_id, name, phone)
  values (pro.user_id, uid, coalesce(client_name, 'לקוחה'), v_phone)
  on conflict (pro_id, client_user_id) do update set phone = excluded.phone
  returning id into card;

  begin
    insert into appointments (pro_id, service_id, service_name, pro_client_id, client_user_id,
                              starts_at, ends_at, status, source, location, price_ils, client_note)
    values (pro.user_id, svc.id, svc.name, card, uid,
            p_starts_at, p_starts_at + make_interval(mins => svc.duration_min),
            case when pro.booking_mode = 'instant' then 'confirmed' else 'pending' end::appointment_status,
            'app',
            case when p_at_client_home then 'client_home' else 'salon' end::service_location,
            svc.price_ils + case when p_at_client_home then pro.travel_fee_ils else 0 end,
            nullif(trim(p_note), ''))
    returning id into new_id;
  exception when exclusion_violation then
    -- Someone else took the same time a moment earlier.
    raise exception 'slot_taken';
  end;

  return new_id;
end;
$$;

revoke execute on function book_appointment(uuid, timestamptz, text, text, boolean) from public, anon;
grant execute on function book_appointment(uuid, timestamptz, text, text, boolean) to authenticated;

commit;
