-- Starting categories and subcategories. The admin dashboard edits these later.

insert into categories (name, slug, icon, sort) values
  ('ציפורניים',   'nails',        'nails',   1),
  ('ריסים',       'lashes',       'lashes',  2),
  ('גבות',        'brows',        'brows',   3),
  ('איפור',       'makeup',       'makeup',  4),
  ('שיער',        'hair',         'hair',    5),
  ('טיפולי פנים', 'facials',      'facial',  6),
  ('הסרת שיער',   'hair-removal', 'removal', 7);

insert into subcategories (category_id, name, sort)
select c.id, s.name, s.sort
from categories c
join (values
  ('nails', 'לק ג''ל', 1), ('nails', 'בנייה בג''ל', 2), ('nails', 'מילוי', 3),
  ('nails', 'מניקור', 4), ('nails', 'פדיקור', 5), ('nails', 'לק רגיל', 6),
  ('lashes', 'הרמת ריסים', 1), ('lashes', 'הארכת ריסים', 2), ('lashes', 'צביעת ריסים', 3),
  ('brows', 'עיצוב גבות', 1), ('brows', 'הרמת גבות', 2), ('brows', 'מיקרובליידינג', 3), ('brows', 'צביעת גבות', 4),
  ('makeup', 'איפור ערב', 1), ('makeup', 'איפור כלות', 2), ('makeup', 'איפור קבוע', 3),
  ('hair', 'תספורת', 1), ('hair', 'צבע', 2), ('hair', 'פן', 3), ('hair', 'החלקה', 4), ('hair', 'תסרוקת ערב', 5),
  ('facials', 'טיפול פנים קלאסי', 1), ('facials', 'ניקוי עמוק', 2), ('facials', 'פילינג', 3), ('facials', 'טיפול אנטי-אייג''ינג', 4),
  ('hair-removal', 'שעווה', 1), ('hair-removal', 'לייזר', 2), ('hair-removal', 'הסרה בחוט', 3), ('hair-removal', 'הסרה בסוכר', 4)
) as s(slug, name, sort) on s.slug = c.slug;
