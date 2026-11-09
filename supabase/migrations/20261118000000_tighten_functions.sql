-- Tightens who can call the database's functions, after Supabase's Security Advisor.
--
-- 1. Two old versions of booking functions that the app no longer uses, created outside
--    these migration files, are removed: they skipped the checks the current versions do.
-- 2. Functions that only run as automatic triggers (on a review, a new user, a deletion…)
--    can no longer be called directly from outside. Triggers keep working: Postgres does
--    not check this permission when a trigger fires.
-- 3. Deleting an account and the admin's stats can no longer be called without signing in
--    (they refused anyway; now they are not offered at all).
--
-- Kept public on purpose: free and taken times (for the booking screen before signing in),
-- visit counting, and is_admin / is_approved_pro, which the access rules themselves use.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

drop function if exists public.available_slots(uuid, uuid, date);
drop function if exists public.book_appointment(uuid, timestamptz, public.service_location, text);

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prorettype = 'trigger'::regtype
       and p.proname in ('check_review_allowed', 'guard_appointment_by_pro',
                         'guard_portfolio_hidden', 'guard_privileged_columns',
                         'guard_pro_profile_insert', 'handle_new_user',
                         'log_account_deletion', 'refresh_pro_rating',
                         'set_review_author_name')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

revoke execute on function public.admin_stats(text) from public, anon;
grant execute on function public.admin_stats(text) to authenticated;

commit;
