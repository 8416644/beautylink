-- A pro chooses who sees her full address (pro_profiles.address, which already exists):
-- everyone, on her page with a Waze button (a salon or studio), or only clients with a
-- confirmed appointment (the default, which suits a pro who works from home; they get it
-- through my_appointments, as before).
--
-- The public view gains the address at its end, and only for a pro who chose to show it.
-- Its other columns stay in the same order, so "create or replace" keeps its grants.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

alter table pro_profiles add column if not exists show_address boolean not null default false;

create or replace view public_pros as
select user_id, display_name, bio, years_experience, cover_url, city, neighborhood,
       location, works_at_salon, works_at_home, travels_to_client, travel_radius_km,
       travel_fee_ils, instagram_url, tiktok_url, booking_mode, cancellation_hours,
       rating_avg, rating_count, facebook_url,
       case when show_address then address end as address
from pro_profiles
where status = 'approved';

commit;
