-- "More details" for an ad or promotion: a longer text (what is included, conditions),
-- shown on the promotion's own screen. Optional; an ad without it looks as before.
--
-- Safe to run more than once.

alter table ads add column if not exists details text not null default ''
  check (char_length(details) <= 1000);
