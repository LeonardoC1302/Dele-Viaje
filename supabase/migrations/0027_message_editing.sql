-- Dele Viaje — chat message editing. `messages.edited_at` existed since
-- migration 0007 but never had a write path.
--
-- Routed through a SECURITY DEFINER RPC rather than a column grant, same
-- reasoning as set_agency_status()/reject_payment(): the existing
-- "messages: sender or organizer soft-delete" update policy already lets
-- an organizer's rows through (for moderation deletes), and a plain
-- `grant update (body)` would then let an organizer rewrite someone
-- else's message text too, not just delete it — column grants can't be
-- scoped to "only when this specific policy branch is what matched".
-- Editing is sender-only, full stop; organizer only ever gets delete.
create or replace function edit_message(p_message_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_message messages%rowtype;
begin
  if v_profile_id is null then
    raise exception 'ERR_UNAUTHENTICATED';
  end if;
  if char_length(p_body) < 1 or char_length(p_body) > 2000 then
    raise exception 'ERR_VALIDATION';
  end if;

  select * into v_message from messages where id = p_message_id;
  if not found or v_message.sender_id <> v_profile_id then
    raise exception 'ERR_FORBIDDEN';
  end if;
  if v_message.kind <> 'user' or v_message.deleted_at is not null then
    raise exception 'ERR_NOT_EDITABLE';
  end if;

  update messages set body = p_body, edited_at = now() where id = p_message_id;
end;
$$;

grant execute on function edit_message(uuid, text) to authenticated;
