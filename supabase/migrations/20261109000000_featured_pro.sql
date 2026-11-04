-- The featured pro ("מומלצת השבוע") shown on the home screen, chosen by the admin.
--
-- One row holds the choice. Everyone can read it; only an admin can change it. The app
-- shows the pro only while she is approved, through the public_pros view.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

create table if not exists featured_pro (
  id int primary key default 1 check (id = 1),
  pro_id uuid references pro_profiles on delete set null,
  updated_at timestamptz not null default now()
);

insert into featured_pro (id, pro_id) values (1, null) on conflict (id) do nothing;

alter table featured_pro enable row level security;

drop policy if exists "featured pro read" on featured_pro;
create policy "featured pro read" on featured_pro for select using (true);

drop policy if exists "featured pro admin" on featured_pro;
create policy "featured pro admin" on featured_pro for update using (is_admin()) with check (is_admin());

grant select on featured_pro to anon, authenticated;

commit;
