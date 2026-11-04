-- Ads for the strip on the home screen, managed by the admin.
--
-- An ad has a title, a line of text, an optional picture, and leads to a pro's page or a
-- category (or nowhere). It shows while it is switched on and today, in Israel, is within
-- its optional dates. Everyone can read the ads that are showing; only an admin can see
-- the rest or add, change and remove ads. Pictures go in the public "ads" bucket, which
-- only an admin can write to (JPEG, PNG or WebP, up to 5 MB).
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 60),
  subtitle text not null default '' check (char_length(subtitle) <= 90),
  image_url text,
  pro_id uuid references pro_profiles on delete set null,
  category_slug text references categories (slug) on delete set null on update cascade,
  action_label text not null default 'לפרטים' check (char_length(action_label) between 1 and 16),
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

alter table ads enable row level security;

drop policy if exists "ads showing" on ads;
create policy "ads showing" on ads for select using (
  is_active
  and (starts_on is null or starts_on <= (now() at time zone 'Asia/Jerusalem')::date)
  and (ends_on is null or ends_on >= (now() at time zone 'Asia/Jerusalem')::date)
);

drop policy if exists "ads admin" on ads;
create policy "ads admin" on ads for all using (is_admin()) with check (is_admin());

grant select on ads to anon, authenticated;

-- Pictures.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ads', 'ads', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ads files admin read" on storage.objects;
create policy "ads files admin read" on storage.objects for select to authenticated
  using (bucket_id = 'ads' and public.is_admin());

drop policy if exists "ads files admin write" on storage.objects;
create policy "ads files admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'ads' and public.is_admin());

drop policy if exists "ads files admin update" on storage.objects;
create policy "ads files admin update" on storage.objects for update to authenticated
  using (bucket_id = 'ads' and public.is_admin())
  with check (bucket_id = 'ads' and public.is_admin());

drop policy if exists "ads files admin delete" on storage.objects;
create policy "ads files admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'ads' and public.is_admin());

commit;
