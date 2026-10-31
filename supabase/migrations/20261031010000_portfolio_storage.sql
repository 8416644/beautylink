-- Photo storage for pros' portfolios.
--
-- Files live in the public "portfolio" bucket under a folder named after the pro's user id
-- (<user id>/<file>), so anyone can view a photo by its link, but only she can add, replace
-- or remove the files in her own folder, and only once she has a pro profile.
-- The bucket accepts JPEG, PNG and WebP images up to 5 MB.
--
-- Safe to run more than once: the bucket is created or updated, and each policy is dropped
-- before it is created again. All of it applies together or not at all.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portfolio files read own" on storage.objects;
create policy "portfolio files read own" on storage.objects for select to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "portfolio files upload own" on storage.objects;
create policy "portfolio files upload own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.pro_profiles where user_id = auth.uid())
  );

drop policy if exists "portfolio files update own" on storage.objects;
create policy "portfolio files update own" on storage.objects for update to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "portfolio files delete own" on storage.objects;
create policy "portfolio files delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
