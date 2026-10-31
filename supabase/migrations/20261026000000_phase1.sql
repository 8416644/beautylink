-- BeautyLink, phase 1 schema.
-- Covers: users and roles, categories, professional profiles with admin approval,
-- services, portfolio, working hours, blocked time, appointments, client cards,
-- reviews, favorites, reports and the admin action log.

create extension if not exists postgis;
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type user_role as enum ('client', 'pro', 'admin');
create type pro_status as enum ('draft', 'pending', 'approved', 'rejected', 'suspended');
create type booking_mode as enum ('instant', 'request');
create type appointment_status as enum ('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show');
create type appointment_source as enum ('app', 'manual');
create type service_location as enum ('salon', 'client_home');
create type media_kind as enum ('image', 'video');
create type time_off_kind as enum ('break', 'vacation', 'other');
create type report_target as enum ('review', 'post', 'comment', 'user');
create type report_status as enum ('open', 'removed', 'kept');

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

-- One row per signed-in user. A user can be a client and a pro on the same account;
-- being a pro is recorded by having a pro_profiles row, so role here is only for admins.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  avatar_url text,
  phone text,
  role user_role not null default 'client',
  created_at timestamptz not null default now()
);

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile automatically when someone signs up (Google, Apple or email).
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
          new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create table push_tokens (
  token text primary key,
  user_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Categories (managed by the admin)
-- ---------------------------------------------------------------------------

create table categories (
  id serial primary key,
  name text not null,
  slug text not null unique,
  icon text,
  sort int not null default 0,
  is_visible boolean not null default true
);

create table subcategories (
  id serial primary key,
  category_id int not null references categories on delete cascade,
  name text not null,
  sort int not null default 0,
  is_visible boolean not null default true,
  unique (category_id, name)
);

-- ---------------------------------------------------------------------------
-- Professionals
-- ---------------------------------------------------------------------------

create table pro_profiles (
  user_id uuid primary key references profiles on delete cascade,
  display_name text not null,
  bio text not null default '',
  years_experience int check (years_experience between 0 and 80),
  cover_url text,
  city text not null,
  neighborhood text,
  -- Full address is shown to a client only after she books (see the view below).
  address text,
  location geography(point, 4326),
  works_at_salon boolean not null default false,
  works_at_home boolean not null default false,
  travels_to_client boolean not null default false,
  travel_radius_km int check (travel_radius_km between 1 and 100),
  travel_fee_ils numeric(8, 2) not null default 0,
  instagram_url text,
  tiktok_url text,
  booking_mode booking_mode not null default 'instant',
  cancellation_hours int not null default 24 check (cancellation_hours between 0 and 168),
  slot_step_min int not null default 15 check (slot_step_min in (5, 10, 15, 30, 60)),
  status pro_status not null default 'draft',
  rejection_reason text,
  approved_at timestamptz,
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  created_at timestamptz not null default now(),
  check (works_at_salon or works_at_home or travels_to_client or status = 'draft'),
  check (not travels_to_client or travel_radius_km is not null)
);

create index pro_profiles_location_idx on pro_profiles using gist (location);
create index pro_profiles_status_idx on pro_profiles (status);

-- Which subcategories a pro works in (drives search filters).
create table pro_subcategories (
  pro_id uuid not null references pro_profiles on delete cascade,
  subcategory_id int not null references subcategories on delete cascade,
  primary key (pro_id, subcategory_id)
);

create table services (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pro_profiles on delete cascade,
  subcategory_id int not null references subcategories,
  name text not null,
  description text not null default '',
  duration_min int not null check (duration_min between 5 and 600),
  price_ils numeric(8, 2) not null check (price_ils >= 0),
  is_active boolean not null default true,
  sort int not null default 0
);

create index services_pro_idx on services (pro_id);

create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pro_profiles on delete cascade,
  service_id uuid references services on delete set null,
  media_url text not null,
  media_kind media_kind not null default 'image',
  caption text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- Weekly opening hours. Several rows per weekday allow split shifts.
create table working_hours (
  id serial primary key,
  pro_id uuid not null references pro_profiles on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

-- Breaks, vacations and other blocked time.
create table time_off (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pro_profiles on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind time_off_kind not null default 'break',
  note text,
  check (ends_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- Client cards (a pro's own list, including clients who booked by phone)
-- ---------------------------------------------------------------------------

create table pro_clients (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pro_profiles on delete cascade,
  client_user_id uuid references profiles on delete set null,
  name text not null,
  phone text,
  private_notes text not null default '',
  created_at timestamptz not null default now(),
  unique (pro_id, client_user_id)
);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------

create table appointments (
  id uuid primary key default gen_random_uuid(),
  pro_id uuid not null references pro_profiles on delete cascade,
  service_id uuid references services on delete set null,
  service_name text not null,            -- kept so history survives a deleted service
  pro_client_id uuid not null references pro_clients on delete cascade,
  client_user_id uuid references profiles on delete set null, -- null for manual bookings
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null,
  source appointment_source not null default 'app',
  location service_location not null default 'salon',
  price_ils numeric(8, 2) not null,
  client_note text,
  cancelled_by uuid references profiles,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Two live appointments of the same pro can never overlap.
  exclude using gist (pro_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status in ('pending', 'confirmed'))
);

create index appointments_pro_time_idx on appointments (pro_id, starts_at);
create index appointments_client_idx on appointments (client_user_id, starts_at);

-- ---------------------------------------------------------------------------
-- Reviews and favorites
-- ---------------------------------------------------------------------------

create table reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references appointments on delete cascade,
  pro_id uuid not null references pro_profiles on delete cascade,
  client_user_id uuid not null references profiles on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text not null default '',
  photo_url text,
  pro_reply text,
  pro_replied_at timestamptz,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index reviews_pro_idx on reviews (pro_id, created_at desc);

-- Only the client of a completed appointment can review it.
create function check_review_allowed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from appointments a
    where a.id = new.appointment_id
      and a.client_user_id = new.client_user_id
      and a.pro_id = new.pro_id
      and a.status = 'completed'
  ) then
    raise exception 'A review needs a completed appointment of this client';
  end if;
  return new;
end;
$$;

create trigger reviews_check_allowed
  before insert on reviews
  for each row execute function check_review_allowed();

create function refresh_pro_rating() returns trigger
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
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on reviews
  for each row execute function refresh_pro_rating();

create table favorites (
  client_user_id uuid not null references profiles on delete cascade,
  pro_id uuid not null references pro_profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_user_id, pro_id)
);

-- ---------------------------------------------------------------------------
-- Moderation
-- ---------------------------------------------------------------------------

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles on delete cascade,
  target_type report_target not null,
  target_id uuid not null,
  reason text not null,
  status report_status not null default 'open',
  resolved_by uuid references profiles,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table admin_actions (
  id bigserial primary key,
  admin_id uuid not null references profiles,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Public view of approved pros (no full address)
-- ---------------------------------------------------------------------------

-- Runs with the view owner's rights so it can read approved rows that the table's own
-- policies hide from other users; it never exposes the address column.
create view public_pros as
select user_id, display_name, bio, years_experience, cover_url, city, neighborhood,
       location, works_at_salon, works_at_home, travels_to_client, travel_radius_km,
       travel_fee_ils, instagram_url, tiktok_url, booking_mode, cancellation_hours,
       rating_avg, rating_count
from pro_profiles
where status = 'approved';

grant select on public_pros to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table push_tokens enable row level security;
alter table categories enable row level security;
alter table subcategories enable row level security;
alter table pro_profiles enable row level security;
alter table pro_subcategories enable row level security;
alter table services enable row level security;
alter table portfolio_items enable row level security;
alter table working_hours enable row level security;
alter table time_off enable row level security;
alter table pro_clients enable row level security;
alter table appointments enable row level security;
alter table reviews enable row level security;
alter table favorites enable row level security;
alter table reports enable row level security;
alter table admin_actions enable row level security;

-- Only admins change a user's role or a pro's approval status. A pro may move her own
-- profile from draft or rejected to pending (submit for review), nothing else.
create function guard_privileged_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then
    return new;
  end if;
  if tg_table_name = 'profiles' and new.role is distinct from old.role then
    raise exception 'Only an admin can change a role';
  end if;
  if tg_table_name = 'pro_profiles' and new.status is distinct from old.status
     and not (old.status in ('draft', 'rejected') and new.status = 'pending') then
    raise exception 'Only an admin can change the approval status';
  end if;
  if tg_table_name = 'pro_profiles' and (new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count)
     and current_setting('beautylink.rating_refresh', true) is distinct from 'on' then
    raise exception 'Ratings are computed from reviews';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on profiles
  for each row execute function guard_privileged_columns();
create trigger pro_profiles_guard before update on pro_profiles
  for each row execute function guard_privileged_columns();

-- profiles: everyone sees names and avatars; users edit their own.
create policy "profiles readable" on profiles for select using (true);
create policy "profiles self update" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin" on profiles for all using (is_admin()) with check (is_admin());

create policy "push tokens own" on push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- categories: public read of visible ones; admin manages.
create policy "categories read" on categories for select using (is_visible or is_admin());
create policy "categories admin" on categories for all using (is_admin()) with check (is_admin());
create policy "subcategories read" on subcategories for select using (is_visible or is_admin());
create policy "subcategories admin" on subcategories for all using (is_admin()) with check (is_admin());

-- pro_profiles: the owner sees and edits her own row; everyone else reads approved pros
-- through public_pros (no address); admins see everything.
create policy "pro own read" on pro_profiles for select using (user_id = auth.uid() or is_admin());
create policy "pro own insert" on pro_profiles for insert
  with check (user_id = auth.uid() and status in ('draft', 'pending'));
create policy "pro own update" on pro_profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pro admin" on pro_profiles for all using (is_admin()) with check (is_admin());

-- Child tables of a pro: public read when the pro is approved, owner manages.
create function is_approved_pro(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from pro_profiles where user_id = p and status = 'approved');
$$;

create policy "pro_subcategories read" on pro_subcategories for select using (is_approved_pro(pro_id) or pro_id = auth.uid() or is_admin());
create policy "pro_subcategories own" on pro_subcategories for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());

create policy "services read" on services for select using (is_approved_pro(pro_id) or pro_id = auth.uid() or is_admin());
create policy "services own" on services for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());

create policy "portfolio read" on portfolio_items for select using (is_approved_pro(pro_id) or pro_id = auth.uid() or is_admin());
create policy "portfolio own" on portfolio_items for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());

create policy "hours read" on working_hours for select using (is_approved_pro(pro_id) or pro_id = auth.uid());
create policy "hours own" on working_hours for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());

-- Blocked time is private; availability is computed by a security-definer function later.
create policy "time_off own" on time_off for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());

-- Client cards and private notes: only the pro.
create policy "pro_clients own" on pro_clients for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());

-- Appointments: the pro sees all of hers, the client sees her own.
-- Clients create bookings through a function (added with the booking flow) that checks
-- availability, booking mode and price, so there is no direct client insert policy.
create policy "appointments pro" on appointments for all using (pro_id = auth.uid()) with check (pro_id = auth.uid());
create policy "appointments client read" on appointments for select using (client_user_id = auth.uid());
create policy "appointments admin read" on appointments for select using (is_admin());

-- Reviews: public read of visible ones; the client writes hers; the pro replies via a function.
create policy "reviews read" on reviews for select using (not is_hidden or client_user_id = auth.uid() or pro_id = auth.uid() or is_admin());
create policy "reviews client insert" on reviews for insert with check (client_user_id = auth.uid());
create policy "reviews admin" on reviews for update using (is_admin()) with check (is_admin());

create policy "favorites own" on favorites for all using (client_user_id = auth.uid()) with check (client_user_id = auth.uid());

create policy "reports insert" on reports for insert with check (reporter_id = auth.uid());
create policy "reports admin" on reports for all using (is_admin()) with check (is_admin());

create policy "admin actions admin" on admin_actions for all using (is_admin()) with check (is_admin() and admin_id = auth.uid());
