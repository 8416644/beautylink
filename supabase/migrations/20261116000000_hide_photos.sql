-- The admin can hide a portfolio photo that does not suit the app (not modest).
--
-- A hidden photo leaves the inspiration feed, the pro's page and the featured bar: clients
-- can no longer read it. The pro still sees it in her portfolio, marked as hidden, and can
-- delete it, but only an admin can hide it or show it again.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

alter table portfolio_items add column if not exists is_hidden boolean not null default false;

drop policy if exists "portfolio read" on portfolio_items;
create policy "portfolio read" on portfolio_items for select
  using ((is_approved_pro(pro_id) and not is_hidden) or pro_id = auth.uid() or is_admin());

drop policy if exists "portfolio admin update" on portfolio_items;
create policy "portfolio admin update" on portfolio_items for update
  using (is_admin()) with check (is_admin());

-- The pro may edit her own photos ("portfolio own"), but not their hidden mark.
create or replace function guard_portfolio_hidden() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' and new.is_hidden then
    raise exception 'Only an admin can hide a photo';
  end if;
  if tg_op = 'UPDATE' and new.is_hidden is distinct from old.is_hidden then
    raise exception 'Only an admin can hide or show a photo';
  end if;
  return new;
end;
$$;

drop trigger if exists portfolio_items_guard_hidden on portfolio_items;
create trigger portfolio_items_guard_hidden
  before insert or update on portfolio_items
  for each row execute function guard_portfolio_hidden();

commit;
