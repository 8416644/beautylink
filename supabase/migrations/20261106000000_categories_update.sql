-- The category list from the original BeautyLink design: brows and lashes become one
-- category, hair removal is named for laser too, and four professions are added
-- (massage, spray tanning, permanent makeup, wigs). The order matches that design.
--
-- Nothing a pro chose is lost: lash treatments move under "brows and lashes", and the
-- "permanent makeup" treatment moves from makeup to its own category, keeping its id,
-- so her treatments, services and search results stay as they were.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

-- Existing categories: names, image keys and order.
update categories set name = 'שיער',              icon = 'hair',             sort = 1 where slug = 'hair';
update categories set name = 'איפור',             icon = 'makeup',           sort = 2 where slug = 'makeup';
update categories set name = 'גבות וריסים',       icon = 'brows-lashes',     sort = 3 where slug = 'brows';
update categories set name = 'לייזר והסרת שיער', icon = 'laser',            sort = 4 where slug = 'hair-removal';
update categories set name = 'ציפורניים',         icon = 'nails',            sort = 6 where slug = 'nails';
update categories set name = 'טיפולי פנים',       icon = 'facials',          sort = 9 where slug = 'facials';

-- New categories.
insert into categories (name, slug, icon, sort) values
  ('עיסוי',      'massage',          'massage',          5),
  ('שיזוף',      'tanning',          'tanning',          7),
  ('איפור קבוע', 'permanent-makeup', 'permanent-makeup', 8),
  ('פאות',       'wigs',             'wigs',             10)
on conflict (slug) do update
  set name = excluded.name, icon = excluded.icon, sort = excluded.sort;

-- Lash treatments join brows; then the empty lashes category goes.
update subcategories s set category_id = b.id
from categories b, categories l
where b.slug = 'brows' and l.slug = 'lashes' and s.category_id = l.id;
delete from categories where slug = 'lashes';

-- "Permanent makeup" under makeup moves to the new category, as its brows treatment.
update subcategories s set category_id = p.id, name = 'גבות', sort = 1
from categories p, categories m
where p.slug = 'permanent-makeup' and m.slug = 'makeup'
  and s.category_id = m.id and s.name = 'איפור קבוע';

-- Treatments of the new categories.
insert into subcategories (category_id, name, sort)
select c.id, s.name, s.sort
from categories c
join (values
  ('massage', 'עיסוי שוודי', 1), ('massage', 'עיסוי רקמות עמוק', 2),
  ('massage', 'עיסוי באבנים חמות', 3), ('massage', 'עיסוי הריון', 4), ('massage', 'רפלקסולוגיה', 5),
  ('tanning', 'שיזוף בהתזה', 1), ('tanning', 'שיזוף לכלות ולאירועים', 2),
  ('permanent-makeup', 'גבות', 1), ('permanent-makeup', 'שפתיים', 2),
  ('permanent-makeup', 'אייליינר', 3), ('permanent-makeup', 'הסרת איפור קבוע', 4),
  ('wigs', 'התאמת פאה', 1), ('wigs', 'עיצוב ותספורת פאה', 2), ('wigs', 'צביעת פאה', 3),
  ('wigs', 'חפיפה ופן לפאה', 4), ('wigs', 'תוספות שיער', 5)
) as s(slug, name, sort) on s.slug = c.slug
on conflict (category_id, name) do nothing;

commit;
