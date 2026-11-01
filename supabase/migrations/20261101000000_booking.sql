-- The calendar and booking.
--
-- Clients see a pro's free times and book them; a pro sees her day, adds bookings that
-- came by phone, blocks time, approves or turns down requests and cancels. Clients never
-- write to appointments directly: everything they do goes through the functions here,
-- which check the working hours, the blocked time, the booking mode, the price and the
-- cancellation policy.
--
-- Times of day (working hours, a pro typing "10:30") are Israel time, whatever the time
-- zone of the server or of the phone.
--
-- Safe to run more than once: every function is created or replaced. All of it applies
-- together or not at all.

begin;

-- ---------------------------------------------------------------------------
-- Free times
-- ---------------------------------------------------------------------------

-- Every start time on these days where a treatment of p_duration minutes fits inside one
-- of the pro's shifts without touching a live appointment or blocked time. Starts fall on
-- her slot step from the start of each shift, and only times still ahead are returned.
-- Internal: clients call available_slots, which checks the service and the pro first.
create or replace function pro_free_slots(p_pro uuid, p_duration int, p_from date, p_days int)
returns table (starts_at timestamptz)
language sql stable security definer set search_path = public as $$
  with pro as (
    select slot_step_min from pro_profiles where user_id = p_pro
  ),
  days as (
    select p_from + i as d from generate_series(0, least(greatest(p_days, 1), 62) - 1) as i
  ),
  shifts as (
    select (days.d + wh.start_time) at time zone 'Asia/Jerusalem' as shift_start,
           (days.d + wh.end_time) at time zone 'Asia/Jerusalem' as shift_end
    from days
    join working_hours wh on wh.pro_id = p_pro and wh.weekday = extract(dow from days.d)
  ),
  candidates as (
    select gs as starts_at, gs + make_interval(mins => p_duration) as ends_at
    from shifts, pro,
         generate_series(shifts.shift_start,
                         shifts.shift_end - make_interval(mins => p_duration),
                         make_interval(mins => pro.slot_step_min)) as gs
  )
  select c.starts_at
  from candidates c
  where c.starts_at > now()
    and not exists (
      select 1 from appointments a
      where a.pro_id = p_pro
        and a.status in ('pending', 'confirmed')
        and tstzrange(a.starts_at, a.ends_at) && tstzrange(c.starts_at, c.ends_at))
    and not exists (
      select 1 from time_off t
      where t.pro_id = p_pro
        and tstzrange(t.starts_at, t.ends_at) && tstzrange(c.starts_at, c.ends_at))
  order by c.starts_at;
$$;

revoke execute on function pro_free_slots(uuid, int, date, int) from public, anon, authenticated;

-- The free times for one of an approved pro's active services, from p_from (not before
-- today) for p_days days, up to two months ahead.
create or replace function available_slots(p_service uuid, p_from date, p_days int)
returns table (starts_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  svc services%rowtype;
  today date := (now() at time zone 'Asia/Jerusalem')::date;
  first_day date := greatest(p_from, today);
  last_day date := least(p_from + least(greatest(p_days, 1), 62) - 1, today + 61);
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

-- ---------------------------------------------------------------------------
-- A client books
-- ---------------------------------------------------------------------------

-- Books one of a pro's services at one of her free times. Confirmed at once when she
-- takes instant bookings, otherwise a request she approves. The client's name comes from
-- her profile; the phone she gives goes on the pro's client card only, which no one but
-- the pro can read. Returns the new appointment's id.
--
-- Errors, as the message: not_signed_in, service_unavailable, own_service,
-- location_unavailable, phone_required, slot_taken.
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

-- ---------------------------------------------------------------------------
-- A client's appointments
-- ---------------------------------------------------------------------------

-- The signed-in client's appointments, newest first, with the pro's name. Her full
-- address shows only once the appointment is confirmed. can_cancel follows the pro's
-- cancellation policy: a request can always be withdrawn, a confirmed appointment only
-- up to cancellation_hours before it starts.
create or replace function my_appointments()
returns table (
  id uuid,
  pro_id uuid,
  pro_name text,
  city text,
  address text,
  service_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status appointment_status,
  location service_location,
  price_ils numeric,
  client_note text,
  cancellation_hours int,
  can_cancel boolean
)
language sql stable security definer set search_path = public as $$
  select a.id, a.pro_id, p.display_name, p.city,
         case when a.status = 'confirmed' and a.location = 'salon' then p.address end,
         a.service_name, a.starts_at, a.ends_at, a.status, a.location, a.price_ils,
         a.client_note, p.cancellation_hours,
         a.starts_at > now()
           and (a.status = 'pending'
                or (a.status = 'confirmed'
                    and a.starts_at - now() >= make_interval(hours => p.cancellation_hours)))
  from appointments a
  join pro_profiles p on p.user_id = a.pro_id
  where a.client_user_id = auth.uid()
  order by a.starts_at desc
  limit 200;
$$;

revoke execute on function my_appointments() from public, anon;
grant execute on function my_appointments() to authenticated;

-- Cancels an appointment. The pro can cancel any live appointment of hers; the client
-- can cancel her own while my_appointments says can_cancel.
-- Errors: not_found, not_active, too_late.
create or replace function cancel_appointment(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  a appointments%rowtype;
  hours int;
begin
  select * into a from appointments where id = p_id for update;
  if not found or uid is null or (a.pro_id <> uid and a.client_user_id is distinct from uid) then
    raise exception 'not_found';
  end if;
  if a.status not in ('pending', 'confirmed') then
    raise exception 'not_active';
  end if;
  if a.pro_id <> uid then
    select cancellation_hours into hours from pro_profiles where user_id = a.pro_id;
    if a.starts_at <= now()
       or (a.status = 'confirmed' and a.starts_at - now() < make_interval(hours => hours)) then
      raise exception 'too_late';
    end if;
  end if;
  update appointments set status = 'cancelled', cancelled_by = uid, cancelled_at = now()
  where id = p_id;
end;
$$;

revoke execute on function cancel_appointment(uuid) from public, anon;
grant execute on function cancel_appointment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The pro's calendar
-- ---------------------------------------------------------------------------

-- A booking the pro adds herself, for a client who called or came by. It may fall outside
-- her working hours, but never on top of another live appointment. A client card with the
-- same phone number is reused, otherwise a new one is made. Returns the appointment's id.
-- Errors: not_a_pro, service_unavailable, name_required, slot_taken.
create or replace function add_manual_appointment(
  p_service uuid,
  p_date date,
  p_time time,
  p_client_name text,
  p_phone text default null,
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  svc services%rowtype;
  v_phone text := nullif(trim(p_phone), '');
  v_name text := nullif(trim(p_client_name), '');
  card uuid;
  starts timestamptz := (p_date + p_time) at time zone 'Asia/Jerusalem';
  new_id uuid;
begin
  if uid is null or not exists (select 1 from pro_profiles where user_id = uid) then
    raise exception 'not_a_pro';
  end if;
  select * into svc from services where id = p_service and pro_id = uid;
  if not found then
    raise exception 'service_unavailable';
  end if;
  if v_name is null then
    raise exception 'name_required';
  end if;

  if v_phone is not null then
    select c.id into card from pro_clients c
    where c.pro_id = uid and c.phone = v_phone
    order by c.created_at
    limit 1;
  end if;
  if card is null then
    insert into pro_clients (pro_id, name, phone) values (uid, v_name, v_phone) returning id into card;
  end if;

  begin
    insert into appointments (pro_id, service_id, service_name, pro_client_id, starts_at, ends_at,
                              status, source, price_ils, client_note)
    values (uid, svc.id, svc.name, card, starts, starts + make_interval(mins => svc.duration_min),
            'confirmed', 'manual', svc.price_ils, nullif(trim(p_note), ''))
    returning id into new_id;
  exception when exclusion_violation then
    raise exception 'slot_taken';
  end;

  return new_id;
end;
$$;

revoke execute on function add_manual_appointment(uuid, date, time, text, text, text) from public, anon;
grant execute on function add_manual_appointment(uuid, date, time, text, text, text) to authenticated;

-- Blocks time in the pro's calendar (a break, a day off, a vacation) so clients cannot
-- book it. p_from and p_to are Israel times on p_date; with both null the whole day is
-- blocked. Returns the block's id.
-- Errors: not_a_pro, bad_range.
create or replace function add_time_off(
  p_date date,
  p_from time default null,
  p_to time default null,
  p_kind time_off_kind default 'break',
  p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  starts timestamptz;
  ends timestamptz;
  new_id uuid;
begin
  if uid is null or not exists (select 1 from pro_profiles where user_id = uid) then
    raise exception 'not_a_pro';
  end if;
  if p_from is null and p_to is null then
    starts := p_date::timestamp at time zone 'Asia/Jerusalem';
    ends := (p_date + 1)::timestamp at time zone 'Asia/Jerusalem';
  elsif p_from is null or p_to is null or p_to <= p_from then
    raise exception 'bad_range';
  else
    starts := (p_date + p_from) at time zone 'Asia/Jerusalem';
    ends := (p_date + p_to) at time zone 'Asia/Jerusalem';
  end if;
  insert into time_off (pro_id, starts_at, ends_at, kind, note)
  values (uid, starts, ends, p_kind, nullif(trim(p_note), ''))
  returning id into new_id;
  return new_id;
end;
$$;

revoke execute on function add_time_off(date, time, time, time_off_kind, text) from public, anon;
grant execute on function add_time_off(date, time, time, time_off_kind, text) to authenticated;

-- The pro answers a request (pending → confirmed or rejected), or after the time has
-- passed marks whether the client came (confirmed → completed or no_show).
-- Errors: not_found, bad_change.
create or replace function set_appointment_status(p_id uuid, p_status appointment_status)
returns void
language plpgsql security definer set search_path = public as $$
declare
  a appointments%rowtype;
begin
  select * into a from appointments where id = p_id and pro_id = auth.uid() for update;
  if not found then
    raise exception 'not_found';
  end if;
  if not ((a.status = 'pending' and p_status in ('confirmed', 'rejected'))
          or (a.status = 'confirmed' and p_status in ('completed', 'no_show') and a.starts_at <= now())
          or (a.status in ('completed', 'no_show') and p_status in ('completed', 'no_show'))) then
    raise exception 'bad_change';
  end if;
  update appointments set status = p_status where id = p_id;
end;
$$;

revoke execute on function set_appointment_status(uuid, appointment_status) from public, anon;
grant execute on function set_appointment_status(uuid, appointment_status) to authenticated;

commit;
