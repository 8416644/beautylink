-- Consent to receive updates, promotions and advertising by email (Israeli Communications
-- Law, section 30A: advertising only to people who agreed in advance).
--
-- profiles.marketing_opt_in: false unless the user ticked the box (at sign-up, in the pro
--   form, or with the switch on her profile). She can turn it off at any time.
-- profiles.marketing_updated_at: when she last turned it on or off, set by the database
--   (nobody can write it), as a record of the consent.
-- handle_new_user: reads the box ticked at sign-up (marketing_opt_in in the sign-up data).
-- admin_marketing_list(): for the admin only, everyone who agreed, with name, email, whether
--   she is a pro, and the date she agreed.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

alter table profiles add column if not exists marketing_opt_in boolean not null default false;
alter table profiles add column if not exists marketing_updated_at timestamptz;

create or replace function stamp_marketing_consent() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.marketing_updated_at := case when new.marketing_opt_in then now() end;
  elsif new.marketing_opt_in is distinct from old.marketing_opt_in then
    new.marketing_updated_at := now();
  else
    new.marketing_updated_at := old.marketing_updated_at;
  end if;
  return new;
end;
$$;
revoke execute on function stamp_marketing_consent() from public, anon, authenticated;

drop trigger if exists profiles_stamp_marketing on profiles;
create trigger profiles_stamp_marketing before insert or update on profiles
  for each row execute function stamp_marketing_consent();

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, avatar_url, marketing_opt_in)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
          new.raw_user_meta_data->>'avatar_url',
          coalesce(new.raw_user_meta_data->>'marketing_opt_in', '') = 'true');
  return new;
end;
$$;
revoke execute on function handle_new_user() from public, anon, authenticated;

create or replace function admin_marketing_list()
returns table (full_name text, email text, is_pro boolean, agreed_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Only an admin can see the mailing list';
  end if;
  return query
    select p.full_name, u.email::text,
           exists (select 1 from pro_profiles pp where pp.user_id = p.id),
           p.marketing_updated_at
    from profiles p
    join auth.users u on u.id = p.id
    where p.marketing_opt_in
    order by p.marketing_updated_at desc nulls last;
end;
$$;
revoke execute on function admin_marketing_list() from public, anon;
grant execute on function admin_marketing_list() to authenticated;

commit;
