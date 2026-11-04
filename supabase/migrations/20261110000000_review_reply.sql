-- A pro answers the reviews written about her. Only an admin can change a review
-- directly, so the pro's reply goes through this function: it touches nothing but the
-- reply and its date, and only on her own reviews. An empty reply removes it.
--
-- Errors, as the message: not_found, too_long.
--
-- Safe to run more than once. All of it applies together or not at all.

begin;

create or replace function reply_to_review(p_review uuid, p_reply text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_reply text := nullif(trim(coalesce(p_reply, '')), '');
begin
  if char_length(v_reply) > 1000 then
    raise exception 'too_long';
  end if;
  update reviews
  set pro_reply = v_reply,
      pro_replied_at = case when v_reply is null then null else now() end
  where id = p_review and pro_id = auth.uid();
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

revoke execute on function reply_to_review(uuid, text) from public, anon;
grant execute on function reply_to_review(uuid, text) to authenticated;

commit;
