-- Categories in order of importance, top to bottom on the home screen.
-- Only the order changes; names, treatments and pros' choices stay as they are.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

update categories c set sort = o.sort
from (values
  ('nails', 1),
  ('brows', 2),
  ('makeup', 3),
  ('hair', 4),
  ('hair-removal', 5),
  ('wigs', 6),
  ('facials', 7),
  ('massage', 8),
  ('tanning', 9),
  ('permanent-makeup', 10)
) as o(slug, sort)
where c.slug = o.slug;

commit;
