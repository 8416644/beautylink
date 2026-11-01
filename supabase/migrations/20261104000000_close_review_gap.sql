-- Closes a gap left from phase 1: the "appointments pro" policy let a pro insert or change
-- her appointments directly, bypassing the booking functions. She could add one in her own
-- name (or a second account's), mark it completed and so review herself.
--
-- Since the booking migration, every change goes through a function that checks it
-- (book_appointment, add_manual_appointment, set_appointment_status, cancel_appointment),
-- and the app only reads appointments directly. So the pro keeps reading hers and loses
-- direct writes, and only a booking a client made in the app can be reviewed.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

drop policy if exists "appointments pro" on appointments;
drop policy if exists "appointments pro read" on appointments;
create policy "appointments pro read" on appointments for select using (pro_id = auth.uid());

-- Same as in phase 1, plus: the appointment must be one the client booked in the app.
create or replace function check_review_allowed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from appointments a
    where a.id = new.appointment_id
      and a.client_user_id = new.client_user_id
      and a.pro_id = new.pro_id
      and a.status = 'completed'
      and a.source = 'app'
  ) then
    raise exception 'A review needs a completed appointment of this client';
  end if;
  return new;
end;
$$;

commit;
