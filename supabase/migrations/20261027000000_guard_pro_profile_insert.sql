-- Closes gaps in the phase 1 guards on pro_profiles:
--   1. guard_privileged_columns ran only on update, so a pro creating her own row could
--      set her own rating, approval date or rejection reason.
--   2. On update, a pro could change her approval date, or write her own rejection reason.
--   3. refresh_pro_rating left the rating-refresh flag on until the end of the transaction.
--   4. guard_privileged_columns failed on every non-admin update of either table, because
--      it read columns the other table does not have (see the function below).
-- Her status on insert is already limited to draft or pending by the "pro own insert" policy.
--
-- Safe to run more than once: functions are replaced and the trigger is created or replaced.
-- All of it applies together or not at all.

begin;

-- On insert by anyone but an admin, the fields the pro does not own start from their
-- defaults, whatever the request sent.
create or replace function guard_pro_profile_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then
    return new;
  end if;
  new.rating_avg := 0;
  new.rating_count := 0;
  new.approved_at := null;
  new.rejection_reason := null;
  return new;
end;
$$;

create or replace trigger pro_profiles_guard_insert before insert on pro_profiles
  for each row execute function guard_pro_profile_insert();

-- Same rules as in phase 1, plus two: only an admin sets the approval date, and a pro may
-- only clear her rejection reason (when she resubmits), never write one.
-- Each table's checks sit inside their own "if": PL/pgSQL prepares a whole condition before
-- evaluating it, so a column the table lacks (role on pro_profiles, status on profiles)
-- fails even behind "tg_table_name = ... and". Phase 1 had that bug; this fixes it.
create or replace function guard_privileged_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then
    return new;
  end if;

  if tg_table_name = 'profiles' then
    if new.role is distinct from old.role then
      raise exception 'Only an admin can change a role';
    end if;
  end if;

  if tg_table_name = 'pro_profiles' then
    if new.status is distinct from old.status
       and not (old.status in ('draft', 'rejected') and new.status = 'pending') then
      raise exception 'Only an admin can change the approval status';
    end if;
    if new.approved_at is distinct from old.approved_at then
      raise exception 'Only an admin can set the approval date';
    end if;
    if new.rejection_reason is not null
       and new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Only an admin can set a rejection reason';
    end if;
    if (new.rating_avg is distinct from old.rating_avg
        or new.rating_count is distinct from old.rating_count)
       and current_setting('beautylink.rating_refresh', true) is distinct from 'on' then
      raise exception 'Ratings are computed from reviews';
    end if;
  end if;

  return new;
end;
$$;

-- Same function as in phase 1, but the flag is switched off again right after the one
-- update it is meant for, so nothing later in the same transaction can use it.
create or replace function refresh_pro_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.pro_id, old.pro_id);
begin
  perform set_config('beautylink.rating_refresh', 'on', true);
  update pro_profiles p
  set rating_avg = coalesce(r.avg, 0), rating_count = coalesce(r.cnt, 0)
  from (select avg(rating)::numeric(3, 2) as avg, count(*) as cnt
        from reviews where pro_id = target and not is_hidden) r
  where p.user_id = target;
  perform set_config('beautylink.rating_refresh', 'off', true);
  return null;
end;
$$;

commit;
