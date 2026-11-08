-- Profiles are private.
--
-- Until now anyone, even without an account, could list every profile: names, roles (who
-- the admin is) and phone numbers. From now on a user reads only her own profile; admins
-- read all of them (policy "profiles admin", unchanged). The database's own functions
-- (booking, stats) run with their own rights and are not affected.
--
-- The only thing others need from a profile is the first name shown on a review. Reviews
-- now keep that first name themselves (author_name), set by the database when the review
-- is written, so the review list no longer reads profiles.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

alter table reviews add column if not exists author_name text not null default '';

-- Existing reviews get their writer's first name.
update reviews r
   set author_name = coalesce(split_part(trim(p.full_name), ' ', 1), '')
  from profiles p
 where p.id = r.client_user_id
   and r.author_name = '';

-- New reviews: the database fills the first name, whatever the app sends.
create or replace function set_review_author_name() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_name := coalesce(
    (select split_part(trim(full_name), ' ', 1) from profiles where id = new.client_user_id),
    '');
  return new;
end;
$$;

drop trigger if exists reviews_author_name on reviews;
create trigger reviews_author_name
  before insert on reviews
  for each row execute function set_review_author_name();

drop policy if exists "profiles readable" on profiles;
drop policy if exists "profiles self read" on profiles;
create policy "profiles self read" on profiles for select using (id = auth.uid());

commit;
