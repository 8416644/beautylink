-- A pro can link her Facebook page, next to Instagram and TikTok (tiktok_url exists since
-- phase 1), and clients see it on her public page.
--
-- Safe to run more than once. The view keeps its columns in the same order and gains
-- facebook_url at the end, so "create or replace" keeps its grants to anon and authenticated.
-- All of it applies together or not at all.

begin;

alter table pro_profiles add column if not exists facebook_url text;

create or replace view public_pros as
select user_id, display_name, bio, years_experience, cover_url, city, neighborhood,
       location, works_at_salon, works_at_home, travels_to_client, travel_radius_km,
       travel_fee_ils, instagram_url, tiktok_url, booking_mode, cancellation_hours,
       rating_avg, rating_count, facebook_url
from pro_profiles
where status = 'approved';

commit;
