-- Likes and comments on portfolio photos, for the inspiration feed.
--
-- photo_likes: one row per user per photo. Each user sees only her own likes (to fill her
--   heart); everyone sees the total, kept on the photo itself (portfolio_items.like_count).
-- photo_comments: a short comment (up to 500 characters) under a photo, shown with the
--   writer's first name (author_name, filled by the database). Visible with the photo. The
--   writer, the pro who owns the photo and the admin can delete it.
-- The totals (like_count, comment_count) are kept by the database; nobody can set them.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

alter table portfolio_items add column if not exists like_count int not null default 0;
alter table portfolio_items add column if not exists comment_count int not null default 0;

create table if not exists photo_likes (
  photo_id uuid not null references portfolio_items on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

create table if not exists photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references portfolio_items on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  author_name text not null default '',
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists photo_comments_photo_idx on photo_comments (photo_id, created_at);

alter table photo_likes enable row level security;
alter table photo_comments enable row level security;

-- A photo clients may see: an approved pro's, not hidden.
create or replace function photo_is_visible(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from portfolio_items i
                 where i.id = p and not i.is_hidden and is_approved_pro(i.pro_id));
$$;

create or replace function photo_owner(p uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select pro_id from portfolio_items where id = p;
$$;

drop policy if exists "photo likes own read" on photo_likes;
create policy "photo likes own read" on photo_likes for select using (user_id = auth.uid());
drop policy if exists "photo likes own add" on photo_likes;
create policy "photo likes own add" on photo_likes for insert
  with check (user_id = auth.uid() and photo_is_visible(photo_id));
drop policy if exists "photo likes own remove" on photo_likes;
create policy "photo likes own remove" on photo_likes for delete using (user_id = auth.uid());

drop policy if exists "photo comments read" on photo_comments;
create policy "photo comments read" on photo_comments for select
  using (photo_is_visible(photo_id) or user_id = auth.uid()
         or photo_owner(photo_id) = auth.uid() or is_admin());
drop policy if exists "photo comments add" on photo_comments;
create policy "photo comments add" on photo_comments for insert
  with check (user_id = auth.uid() and photo_is_visible(photo_id));
drop policy if exists "photo comments remove" on photo_comments;
create policy "photo comments remove" on photo_comments for delete
  using (user_id = auth.uid() or photo_owner(photo_id) = auth.uid() or is_admin());

-- The comment shows its writer's first name, whatever the app sends.
create or replace function set_comment_author_name() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_name := coalesce(
    (select split_part(trim(full_name), ' ', 1) from profiles where id = new.user_id), '');
  return new;
end;
$$;
drop trigger if exists photo_comments_author_name on photo_comments;
create trigger photo_comments_author_name
  before insert on photo_comments
  for each row execute function set_comment_author_name();

-- Totals on the photo, refreshed after every like, unlike, comment and deletion.
create or replace function refresh_photo_counts() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p uuid := coalesce(new.photo_id, old.photo_id);
begin
  perform set_config('beautylink.count_refresh', 'on', true);
  update portfolio_items
     set like_count = (select count(*) from photo_likes where photo_id = p),
         comment_count = (select count(*) from photo_comments where photo_id = p)
   where id = p;
  perform set_config('beautylink.count_refresh', 'off', true);
  return null;
end;
$$;
drop trigger if exists photo_likes_counts on photo_likes;
create trigger photo_likes_counts after insert or delete on photo_likes
  for each row execute function refresh_photo_counts();
drop trigger if exists photo_comments_counts on photo_comments;
create trigger photo_comments_counts after insert or delete on photo_comments
  for each row execute function refresh_photo_counts();

-- The pro may edit her own photos, but not their hidden mark or their totals.
create or replace function guard_portfolio_hidden() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' and (new.is_hidden or new.like_count <> 0 or new.comment_count <> 0) then
    raise exception 'Only the database sets a new photo''s hidden mark and totals';
  end if;
  if tg_op = 'UPDATE' and new.is_hidden is distinct from old.is_hidden then
    raise exception 'Only an admin can hide or show a photo';
  end if;
  if tg_op = 'UPDATE'
     and (new.like_count is distinct from old.like_count
          or new.comment_count is distinct from old.comment_count)
     and current_setting('beautylink.count_refresh', true) is distinct from 'on' then
    raise exception 'Likes and comments are counted by the database';
  end if;
  return new;
end;
$$;

-- Trigger-only functions are not callable from outside (as in the earlier tightening).
revoke execute on function set_comment_author_name() from public, anon, authenticated;
revoke execute on function refresh_photo_counts() from public, anon, authenticated;
revoke execute on function guard_portfolio_hidden() from public, anon, authenticated;

commit;
