-- A user deletes her own account from the app (required by Apple and Google).
--
-- delete_my_account() removes the signed-in user from auth.users. Everything that belongs to
-- her goes with it through the existing "on delete cascade" links: her profile, push tokens,
-- favorites, reviews she wrote (the pros' ratings are recalculated), reports she filed, and
-- if she is a pro, her pro profile with its services, photos list, hours and appointments.
--
-- Before that it:
--   * cancels her upcoming appointments as a client, so the pros' times free up;
--   * clears links that would otherwise block the delete (cancelled_by, resolved_by);
--   * unlinks her from the stats devices table (the visit counts stay, without her).
-- The app removes her photo files from storage before calling this.
-- An admin account cannot delete itself here; that is done from the Supabase dashboard.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from profiles where id = uid and role = 'admin') then
    raise exception 'An admin account cannot be deleted from the app';
  end if;

  update appointments
     set status = 'cancelled', cancelled_at = now(), cancelled_by = null
   where client_user_id = uid
     and status in ('pending', 'confirmed')
     and starts_at > now();

  update appointments set cancelled_by = null where cancelled_by = uid;
  update reports set resolved_by = null where resolved_by = uid;
  update app_devices set user_id = null where user_id = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function delete_my_account() from public;
grant execute on function delete_my_account() to authenticated;

commit;
